import { TsAST } from "@typescript";
import { GoAST } from "@go";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { SignatureKind } from "typescript/async";
import { type BuildContext } from "../../context/build";
import { expressionTransformers } from "../expression";
import { createSimpleAssignment } from "./assignment";

/**
 * `(value) => corps` ou `() => corps`, appliquée à `argument`.
 *
 *   Sourced_value := <argument>
 *   _ = Sourced_value              // Go refuse une variable jamais lue : « c'est voulu »
 *   ...préparations du corps
 *   -> résultat : corps
 */
async function inlineArrowFunction(
	callback: TsAST.ArrowFunction,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	if (TsAST.isBlock(callback.body) || callback.parameters.length > 1) {
		// Pour l'instant : `() => valeur` ou `(x) => valeur`.
		return context.error(callback, "callback-not-supported-yet");
	}

	const [parameter] = callback.parameters;

	if (
		parameter
		&& (!TsAST.isIdentifier(parameter.name) || parameter.initializer || parameter.dotDotDotToken)
	) {
		// Déstructuration `([a, b]) =>`, valeur par défaut, `...reste` : pas encore gérés.
		return context.error(parameter, "callback-parameter-not-supported");
	}

	const parameterStatements = parameter && TsAST.isIdentifier(parameter.name)
		? DCommon.pipe(
			context.createSourceIdentifier(parameter.name.text),
			(parameterIdentifier) => [
				GoAST.createShortVariableDeclarationStatement({
					identifier: parameterIdentifier,
					initializer: argument,
				}),
				createSimpleAssignment(GoAST.createIdentifier("_"), parameterIdentifier),
			],
		)
		: [];

	const body = await DCommon.asyncPipe(
		context.transform(callback.body, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(body)) {
		return body;
	}

	return DEither.right("inline-callback", {
		before: DArray.concat(parameterStatements, body.before),
		result: body.result,
	});
}

/**
 * Fonction passée par son nom (`double`, `DString.to`…) : un simple appel,
 * `double(<argument>)`.
 */
async function inlineFunctionReference(
	callback: TsAST.Identifier | TsAST.PropertyAccessExpression,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	const { typeChecker } = context.transpilation;
	const signatures = await typeChecker.getSignaturesOfType(
		await typeChecker.getTypeAtLocation(callback),
		SignatureKind.Call,
	);
	const [signature] = signatures;

	if (!signature || signatures.length !== 1 || signature.parameters.length > 1) {
		// Fonction surchargée, ou qui attend plusieurs paramètres : JS lui passerait
		// une seule valeur, Go refuserait l'appel. Pas encore géré.
		return context.error(callback, "callback-function-not-supported");
	}

	const callee = await DCommon.asyncPipe(
		context.transform(callback, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(callee)) {
		return callee;
	}

	return DEither.right("inline-callback", {
		before: callee.before,
		result: GoAST.createCallExpression({
			callee: callee.result,
			// `() => 0` passée par son nom : JS ignore la valeur, Go ne doit pas la passer.
			arguments: signature.parameters.length === 1 ? [argument] : [],
		}),
	});
}

/**
 * Décision n°5 : une fonction passée en argument (à matchInformation,
 * rightPipe…) ne devient pas une fonction anonyme Go. Son code est recopié
 * « en ligne », appliqué à une valeur Go déjà connue (`argument`), par
 * exemple `Generated_1.Right`.
 *
 * Renvoie `{ before, result }`, comme un transformer d'expression : celui qui
 * l'appelle place `before` puis utilise `result`.
 *
 * Réutilisable pour whenIsRight, whenIsRightOtherwise, DArray.map… : toute
 * l'équipe génère ainsi le même Go pour les fonctions passées en argument.
 */
export function inlineCallback(
	callback: TsAST.Expression,
	argument: GoAST.Expression,
	context: BuildContext,
) {
	if (TsAST.isArrowFunction(callback)) {
		return inlineArrowFunction(callback, argument, context);
	}

	if (TsAST.isIdentifier(callback) || TsAST.isPropertyAccessExpression(callback)) {
		return inlineFunctionReference(callback, argument, context);
	}

	return context.error(callback, "callback-not-supported-yet");
}
