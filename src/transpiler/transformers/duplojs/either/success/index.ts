import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DModeling from "@duplojs/lang/modeling";
import { type BuildContext } from "../../../../context/build";
import { callExpressionTransformer } from "../../../shared";
import { typeTransformers } from "../../../type";
import { getExpectedEitherType } from "../expectedType";
import { eitherDependency } from "../sharedDependency";
import { eitherSuccessDependency, successFunctionIdentifier } from "./sharedDependency";

/**
 * `DEither.success(value)`.
 *
 * L'appel lui-même passe par le transformer d'appel commun (évaluation de la
 * fonction puis des arguments). Quand ce dernier traduit la référence
 * `DEither.success`, on renvoie la fonction Go générique déjà instanciée :
 *
 *   Generated_N := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
 *
 * Sans `[L, R]`, Go refuse de ranger une fonction générique dans une variable
 * (erreur du projet 00). L et R viennent du type TS attendu pour cet Either.
 */
export async function successExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	const call = node.parent;

	if (!call || !TsAST.isCallExpression(call) || call.expression !== node) {
		// `DEither.success` passé comme valeur (par exemple à DCommon.pipe) : non géré pour l'instant.
		return context.error(node, "either-success-used-as-value");
	}

	const { typeChecker } = context.transpilation;
	const expectedType = await getExpectedEitherType(call, context);
	const expectedTypeNode = await typeChecker.typeToTypeNode(expectedType, call);

	if (!expectedTypeNode) {
		return context.error(call, "either-success-unknown-expected-type");
	}

	const eitherType = await DCommon.asyncPipe(
		context.transform(expectedTypeNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(eitherType)) {
		return eitherType;
	}

	if (!DModeling.hasTagValue(eitherType.result, "[node]type-reference-generic")) {
		return context.error(call, "either-success-expected-type-is-not-either");
	}

	context.registerSharedDependency(eitherDependency.value);
	const packageName = context.registerSharedDependency(eitherSuccessDependency.value);

	return context.success({
		before: eitherType.before,
		result: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: successFunctionIdentifier,
			}),
			typeArguments: eitherType.result.typeArguments,
		}),
	});
}
