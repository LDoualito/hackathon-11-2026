import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";

/**
 * `"texte"` -> `"texte"`. Le printer ajoute les guillemets et les échappements Go.
 *
 * Une chaîne JS peut contenir une moitié de caractère isolée (« surrogate »
 * seul, ex. "\uD800") : impossible à écrire en UTF-8, donc erreur explicite.
 */
export const stringLiteralTransformer: Transformer<GoAST.StringLiteral> = createTransformer(
	(node, context) => {
		if (!TsAST.isStringLiteral(node)) {
			return context.notSupport();
		}

		if (!node.text.isWellFormed()) {
			return context.error(node, "string-literal-lone-surrogate-not-supported");
		}

		return context.success({
			result: GoAST.createStringLiteral({ value: node.text }),
		});
	},
);
