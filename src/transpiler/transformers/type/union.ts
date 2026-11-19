import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import { TsAST } from "@typescript";

// Une union qui n'est pas composée uniquement d'Either (ex: Fail | readonly [number])
// ne peut pas être un seul type Go précis : elle devient `any`.
// Ce transformer passe APRÈS celui des Either : une union 100 % Either reste `Either`.
export const unionTypeTransformer: Transformer<GoAST.Type | GoAST.TypeReference> = createTransformer(
	(node, context) => {
		if (!TsAST.isUnionTypeNode(node)) {
			return context.notSupport();
		}

		return context.success({
			result: GoAST.builtinTypeReferences.any,
		});
	},
);