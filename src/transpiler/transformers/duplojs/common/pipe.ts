import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";

// DCommon.pipe(x, f, g)  →  a := x ; fA := f ; b := fA(a) ; gA := g ; c := gA(b)  → résultat : c
// Comme DuploJS : chaque étape reçoit le résultat de la précédente.
// Pas de fonction Go « Pipe » : on écrit les appels directement, dans l'ordre.
export async function pipeExpressionHandler(node: TsAST.Node, context: BuildContext) {
	// ① Il faut au moins la valeur de départ
	if (!TsAST.isCallExpression(node) || node.arguments.length < 1) {
		return context.error(node, "pipe-must-be-called-with-an-input");
	}

	const [inputNode, ...stepNodes] = node.arguments;

	// ② La valeur de départ, rangée dans une variable
	const input = await DCommon.asyncPipe(
		context.transform(inputNode!, expressionTransformers.value),
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
	let accumulator: GoAST.Identifier = inputStatement.identifier;

	// ③ Pour chaque étape : on traduit la fonction, puis on l'appelle avec le résultat précédent
	for (const stepNode of stepNodes) {
		const step = await DCommon.asyncPipe(
			context.transform(stepNode, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(step)) {
			return step;
		}

		const stepStatement = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: step.result,
		});

		const callStatement = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: GoAST.createCallExpression({
				callee: stepStatement.identifier,
				arguments: [accumulator],
			}),
		});

		before = [...before, ...step.before, stepStatement, callStatement];
		accumulator = callStatement.identifier;
	}

	// ④ Le résultat du pipe, c'est le résultat de la dernière étape
	return context.success({
		before,
		result: accumulator,
	});
}