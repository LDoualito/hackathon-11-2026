import { type Transformer } from "@transformer";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { eitherIsRightFieldIdentifier } from "../sharedDependency";

/**
 * `DEither.isRight(value)` devient un simple accès au champ : `value.IsRight`.
 * Pas d'appel de fonction : le struct Either porte déjà l'information.
 */
export async function isRightExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
): Promise<ReturnType<Transformer<GoAST.Expression>["transformer"]>> {
	if (!TsAST.isCallExpression(node)) {
		// `DEither.isRight` passé comme valeur (par exemple à DArray.filter) : non géré pour l'instant.
		return context.error(node, "either-is-right-used-as-value");
	}

	const argument = DArray.first(node.arguments);

	if (!argument || !DArray.lengthEqual(node.arguments, 1)) {
		return context.error(node, "either-is-right-expects-one-argument");
	}

	const value = await DCommon.asyncPipe(
		context.transform(argument, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(value)) {
		return value;
	}

	return context.success({
		before: value.before,
		result: GoAST.createSelectorExpression({
			target: value.result,
			identifier: eitherIsRightFieldIdentifier,
		}),
	});
}
