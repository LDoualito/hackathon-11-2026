import { type Transformer, type SharedDependency } from "@transformer";
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

/**
 * Un constructeur d'Either DuploJS (`success`, `fail`…) et sa fonction Go.
 * La fonction Go est écrite à la main dans un fichier .go (décision n°8),
 * déclaré par `dependency`.
 */
export interface EitherConstructor {
	readonly functionIdentifier: GoAST.Identifier;
	readonly dependency: SharedDependency;

	/** Nombre d'arguments attendu par la fonction Go (success : 1, fail : 0, left : 2). */
	readonly argumentCount: number;
}

/**
 * `DEither.success(value)`, `DEither.fail()`… : tous les constructeurs suivent
 * la même recette.
 *
 * L'appel lui-même passe par le transformer d'appel commun (évaluation de la
 * fonction puis des arguments). Quand ce dernier traduit la référence
 * (`DEither.success`), on renvoie la fonction Go générique déjà instanciée :
 *
 *   Generated_N := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
 *
 * Sans `[L, R]`, Go refuse de ranger une fonction générique dans une variable
 * (erreur du projet 00). L et R viennent du type TS attendu pour cet Either.
 */
export async function eitherConstructorExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
	constructor: EitherConstructor,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (TsAST.isCallExpression(node)) {
		return context.transform(node, [callExpressionTransformer]);
	}

	const call = node.parent;

	if (!call || !TsAST.isCallExpression(call) || call.expression !== node) {
		// Constructeur passé comme valeur (par exemple à DCommon.pipe) : non géré pour l'instant.
		return context.error(node, "either-constructor-used-as-value");
	}

	if (call.arguments.length !== constructor.argumentCount) {
		// Ex. `DEither.left("x")` sans valeur : la fonction Go attend toujours 2 arguments.
		return context.error(call, "either-constructor-arguments-not-supported");
	}

	const { typeChecker } = context.transpilation;
	const expectedType = await getExpectedEitherType(call, context);
	const expectedTypeNode = await typeChecker.typeToTypeNode(expectedType, call);

	if (!expectedTypeNode) {
		return context.error(call, "either-constructor-unknown-expected-type");
	}

	const eitherType = await DCommon.asyncPipe(
		context.transform(expectedTypeNode, typeTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(eitherType)) {
		return eitherType;
	}

	if (!DModeling.hasTagValue(eitherType.result, "[node]type-reference-generic")) {
		return context.error(call, "either-constructor-expected-type-is-not-either");
	}

	context.registerSharedDependency(eitherDependency.value);
	const packageName = context.registerSharedDependency(constructor.dependency);

	return context.success({
		before: eitherType.before,
		result: GoAST.createInstantiationExpression({
			target: GoAST.createSelectorExpression({
				target: packageName,
				identifier: constructor.functionIdentifier,
			}),
			typeArguments: eitherType.result.typeArguments,
		}),
	});
}
