import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

/**
 * `(A | B)` -> le type Go de `A | B`. Les parenthèses d'un type TS ne servent
 * qu'à la lecture ou à la priorité des opérateurs de types : elles n'existent pas en Go.
 */
export const parenthesizedTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (!TsAST.isParenthesizedTypeNode(node)) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);
