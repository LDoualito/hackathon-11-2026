import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { eitherDependency, eitherFieldIdentifiers, eitherTypeIdentifier } from "./sharedDependency";

// Construit `shard_dependencies.Either{IsRight: ..., Information: "...", Value: ...}`
function createEitherLiteral(
	context: BuildContext,
	params: {
		isRight: boolean;
		information: GoAST.Expression;
		value?: GoAST.Expression;
	},
) {
	return GoAST.createStructLiteral({
		typeReference: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherDependency.value),
			identifier: eitherTypeIdentifier,
		}),
		elements: [
			GoAST.createKeyedElement({
				key: eitherFieldIdentifiers.isRight,
				value: GoAST.createBooleanLiteral({ value: params.isRight }),
			}),
			GoAST.createKeyedElement({
				key: eitherFieldIdentifiers.information,
				value: params.information,
			}),
			...(params.value
				? [
					GoAST.createKeyedElement({
						key: eitherFieldIdentifiers.value,
						value: params.value,
					}),
				]
				: []),
		],
	});
}

// Traduit un argument et le range dans une variable temporaire (ordre d'évaluation)
async function transformArgument(node: TsAST.Expression, context: BuildContext) {
	const argument = await DCommon.asyncPipe(
		context.transform(node, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const statement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: argument.result,
	});

	return DEither.right("argument", {
		before: DArray.concat(argument.before, [statement]),
		identifier: statement.identifier,
	});
}

// DEither.success(x) → Either{IsRight: true, Information: "success", Value: x}
export async function successAnyExpressionHandler(node: TsAST.Node, context: BuildContext) {
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 1) {
		return context.error(node, "success-must-be-called-with-one-argument");
	}

	const argument = await transformArgument(DArray.first(node.arguments)!, context);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const { before, identifier } = DEither.unwrapRight(argument);

	return context.success({
		before,
		result: createEitherLiteral(context, {
			isRight: true,
			information: GoAST.createStringLiteral({ value: "success" }),
			value: identifier,
		}),
	});
}

// DEither.fail() → Either{IsRight: false, Information: "fail"}
export async function failAnyExpressionHandler(node: TsAST.Node, context: BuildContext) {
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 0) {
		return context.error(node, "fail-must-be-called-without-argument");
	}

	return context.success({
		result: createEitherLiteral(context, {
			isRight: false,
			information: GoAST.createStringLiteral({ value: "fail" }),
		}),
	});
}

// DEither.left("info", x) → Either{IsRight: false, Information: "info", Value: x}
export async function leftAnyExpressionHandler(node: TsAST.Node, context: BuildContext) {
	if (!TsAST.isCallExpression(node) || node.arguments.length < 1 || node.arguments.length > 2) {
		return context.error(node, "left-must-be-called-with-information-and-value");
	}

	const [informationNode, valueNode] = node.arguments;

	// L'information doit être une chaîne écrite en dur ("negative-operand")
	if (!informationNode || !TsAST.isStringLiteral(informationNode)) {
		return context.error(node, "left-information-must-be-a-string-literal");
	}

	if (!valueNode) {
		return context.success({
			result: createEitherLiteral(context, {
				isRight: false,
				information: GoAST.createStringLiteral({ value: informationNode.text }),
			}),
		});
	}

	const argument = await transformArgument(valueNode, context);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const { before, identifier } = DEither.unwrapRight(argument);

	return context.success({
		before,
		result: createEitherLiteral(context, {
			isRight: false,
			information: GoAST.createStringLiteral({ value: informationNode.text }),
			value: identifier,
		}),
	});
}

// DEither.isRight(x) → x.IsRight
export async function isRightAnyExpressionHandler(node: TsAST.Node, context: BuildContext) {
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 1) {
		return context.error(node, "isRight-must-be-called-with-one-argument");
	}

	const argument = await transformArgument(DArray.first(node.arguments)!, context);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const { before, identifier } = DEither.unwrapRight(argument);

	return context.success({
		before,
		result: GoAST.createSelectorExpression({
			target: identifier,
			identifier: eitherFieldIdentifiers.isRight,
		}),
	});
}