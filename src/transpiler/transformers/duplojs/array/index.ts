import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../context/build";
import { coalescingDependency, coalescingFunctionIdentifier } from "./sharedDependency";

/**
 * `DArray.coalescing`.
 * - passée par son nom à une autre fonction (whenIsRight, pipe…) : on renvoie la fonction Go,
 *   que `inlineCallback` appelle directement (`Coalescing(valeur)`) ;
 * - appelée directement `DArray.coalescing(x)` : pas encore géré (absent des exercices).
 * Seul le cas « valeur qui n'est pas un tableau » est géré (limite documentée).
 */
async function coalescingExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	const callee = GoAST.createSelectorExpression({
		target: context.registerSharedDependency(coalescingDependency.value),
		identifier: coalescingFunctionIdentifier,
	});

	if (!TsAST.isCallExpression(node)) {
		return context.success({ result: callee });
	}

	// Appel direct `DArray.coalescing(x)` : absent des exercices, pas encore géré.
	return context.error(node, "array-coalescing-direct-call-not-supported");
}

/** Routeur des fonctions de `@duplojs/lang/array` (coalescing, map…). */
export const duploJSArrayExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/array\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("coalescing"),
				() => coalescingExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node, "array-function-not-supported-yet"),
			),
		);
	},
);
