import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { expressionTransformers } from ".";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";

/**
 * `-x` (moins unaire). Les autres opérateurs préfixes (`!`, `+`, `++`…) ne
 * sont pas gérés : ils tombent sur l'erreur « aucun transformer ».
 *
 * La valeur passe TOUJOURS par une variable avant le moins :
 *
 *   Generated_1 := (float64)(0)
 *   Generated_2 := -Generated_1
 *
 * Raison : en Go, une constante n'a pas de zéro négatif. `(float64)(-0)`
 * vaut +0, alors que `-0` en JS vaut -0 (et print affiche `-0`). Sur une
 * variable, le calcul se fait à l'exécution, en float64, comme en JS.
 */
export const prefixUnaryExpressionTransformer: Transformer<GoAST.UnaryExpression> = createTransformer(
	async(node, context) => {
		if (
			!TsAST.isPrefixUnaryExpression(node)
			|| node.operator !== TsAST.SyntaxKind.MinusToken
		) {
			return context.notSupport();
		}

		const operand = await DCommon.asyncPipe(
			context.transform(node.operand, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(operand)) {
			return operand;
		}

		const operandAssignment = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: operand.result,
		});

		return context.success({
			before: DArray.concat(
				operand.before,
				[operandAssignment],
			),
			result: GoAST.createUnaryExpression({
				operator: "-",
				operand: operandAssignment.identifier,
			}),
		});
	},
);
