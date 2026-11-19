import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";
import { transformReturnTypeOfFunction } from "../../type/ofExpression";
import { inlineCallback } from "../../common/inlineCallback";
import { applyWhenIsRight } from "../either/whenIsRight";

/** Vrai si `step` est l'appel curryfié `DEither.whenIsRight(fonction)`. */
async function getCurriedWhenIsRightCallback(step: TsAST.Expression, context: BuildContext) {
	if (!TsAST.isCallExpression(step) || step.arguments.length !== 1) {
		return undefined;
	}

	const reference = step.expression;

	if (!TsAST.isIdentifier(reference) && !TsAST.isPropertyAccessExpression(reference)) {
		return undefined;
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(moduleReference) || moduleReference.symbol.name !== "whenIsRight") {
		return undefined;
	}

	return DArray.first(step.arguments);
}

/**
 * `DCommon.pipe(entrée, étape1, étape2, …)` = `étape2(étape1(entrée))`.
 *
 * Code en ligne (décision n°5) : pas de fonction Go `Pipe`, pas de fonction anonyme.
 * Le nombre d'étapes est connu à la traduction, on « déroule » donc la boucle de DuploJS :
 *
 *   Generated_1 := <entrée>
 *   ...étape 1 recopiée en ligne avec Generated_1  -> Generated_2
 *   ...étape 2 recopiée en ligne avec Generated_2  -> Generated_3
 *   -> résultat : Generated_3
 *
 * Une étape `DEither.whenIsRight(fonction)` (forme curryfiée) réutilise le cœur
 * de whenIsRight au lieu de fabriquer une fonction anonyme.
 */
export async function pipeExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		return context.error(node, "common-pipe-used-as-value");
	}

	const [inputNode, ...steps] = node.arguments;

	if (!inputNode) {
		return context.error(node, "common-pipe-expects-an-input");
	}

	const input = await DCommon.asyncPipe(
		context.transform(inputNode, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(input)) {
		return input;
	}

	const inputStatement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: input.result,
	});

	let before: GoAST.Statement[] = [...input.before, inputStatement];
	let current: GoAST.Identifier = inputStatement.identifier;

	for (const step of steps) {
		const whenIsRightCallback = await getCurriedWhenIsRightCallback(step, context);

		if (whenIsRightCallback) {
			// Étape `whenIsRight(fonction)` : type du résultat = ce que renvoie la fonction curryfiée.
			const resultType = await transformReturnTypeOfFunction(step, context);

			if (DEither.isLeft(resultType)) {
				return resultType;
			}

			const applied = await applyWhenIsRight(current, whenIsRightCallback, resultType.result, context);

			if (DEither.isLeft(applied)) {
				return applied;
			}

			const { before: stepBefore, identifier } = DEither.unwrapRight(applied);

			before = [...before, ...resultType.before, ...stepBefore];
			current = identifier;
			continue;
		}

		// Toute autre étape (fonction fléchée ou passée par son nom) : recopiée en ligne.
		const inlined = await inlineCallback(step, current, context);

		if (DEither.isLeft(inlined)) {
			return inlined;
		}

		const { before: stepBefore, result } = DEither.unwrapRight(inlined);

		const stepStatement = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: result,
		});

		before = [...before, ...stepBefore, stepStatement];
		current = stepStatement.identifier;
	}

	return context.success({
		before,
		result: current,
	});
}
