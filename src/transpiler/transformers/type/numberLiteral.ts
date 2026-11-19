import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/**
 * Type littéral nombre (`0`, `-1`) -> `float64`.
 *
 * TS donne parfois un type plus précis que `number` : après `divisor === 0`,
 * il sait que `divisor` vaut 0 (`Left<"division-by-zero", 0>`). Go n'a pas de
 * types littéraux : la valeur reste un float64 comme les autres.
 */
export const numberLiteralTypeTransformer: Transformer<GoAST.BuiltinTypeReference<"float64">> = createTransformer(
	(node, context) => {
		if (!TsAST.isLiteralTypeNode(node)) {
			return context.notSupport();
		}

		const { literal } = node;
		const isNumber = TsAST.isNumericLiteral(literal)
			|| (
				TsAST.isPrefixUnaryExpression(literal)
				&& literal.operator === TsAST.SyntaxKind.MinusToken
				&& TsAST.isNumericLiteral(literal.operand)
			);

		if (!isNumber) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.float64,
		});
	},
);
