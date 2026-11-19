import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { printDependency, printFunctionIdentifier } from "./sharedDependency";

// DCommon.print(x) → shard_dependencies.Print(x)
export async function printExpressionHandler(
	node: TsAST.Node,
	context: BuildContext,
) {
	// ① On ne gère que l'appel direct print(x) avec un seul argument.
	if (!TsAST.isCallExpression(node) || node.arguments.length !== 1) {
		return context.error(node, "print-must-be-called-with-one-argument");
	}

	// ② L'argument, traduit et rangé dans une variable (ordre d'évaluation)
	const argument = await DCommon.asyncPipe(
		context.transform(DArray.first(node.arguments)!, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const argumentStatement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: argument.result,
	});

	// ③ Appel direct : Print est générique, Go ne déduit T que si on l'appelle directement
	return context.success({
		before: DArray.concat(argument.before, [argumentStatement]),
		result: GoAST.createCallExpression({
			callee: GoAST.createSelectorExpression({
				target: context.registerSharedDependency(printDependency.value),
				identifier: printFunctionIdentifier,
			}),
			arguments: [argumentStatement.identifier],
		}),
	});
}