import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";
import { typeTransformers } from ".";

// (A | B) : les parenthèses ne changent rien, on traduit le type à l'intérieur
export const parenthesizedTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (!TsAST.isParenthesizedTypeNode(node)) {
			return context.notSupport();
		}

		return context.transform(node.type, typeTransformers.value);
	},
);