import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DArray from "@duplojs/lang/array";
import { expressionTransformers } from "../expression";
import { typeTransformers } from "../type";

export const variableStatementTransformer: Transformer<GoAST.VariableDeclarationZeroValue> = createTransformer(
	async(node, context) => {
		// ① Pour moi seulement si c'est une variable AU NIVEAU DU FICHIER
		if (!TsAST.isVariableStatement(node) || !TsAST.isSourceFile(node.parent)) {
			return context.notSupport();
		}

		// ② On récupère la déclaration (on n'accepte qu'une variable par ligne)
		const declarations = node.declarationList.declarations;
		if (declarations.length !== 1) {
			return context.error(node, "only-one-variable-per-statement");
		}
		const declaration = declarations[0]!;

		if (!TsAST.isIdentifier(declaration.name) || !declaration.initializer) {
			return context.error(node, "variable-must-have-name-and-initializer");
		}

		// ③ Le nom Go de la variable (result → Sourced_result)
		const identifier = context.createSourceIdentifier(declaration.name.text);

		// ④ Le type : celui écrit dans le code, sinon on le demande au TypeChecker
		const typeNode = declaration.type ?? await context.transpilation.typeChecker.typeToTypeNode(
			await context.transpilation.typeChecker.getTypeAtLocation(declaration.name),
			declaration,
		) ?? TsAST.factory.createKeywordTypeNode(TsAST.SyntaxKind.AnyKeyword);

		const type = await DCommon.asyncPipe(
			context.transform(typeNode, typeTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(type)) {
			return type;
		}

		// ⑤ La valeur : add(1, 2) traduit en Go
		const value = await DCommon.asyncPipe(
			context.transform(declaration.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);
		if (DEither.isLeft(value)) {
			return value;
		}

		// ⑥ result = déclaration (→ package) ; before = assignation (→ init())
		return context.success({
			before: DArray.concat(
				type.before,
				value.before,
				[
					GoAST.createAssignmentStatement({
						targets: DCommon.cast([identifier]),
						values: DCommon.cast([value.result]),
					}),
				],
			),
			result: GoAST.createVariableDeclarationZeroValue({
				identifier,
				typeReference: type.result,
			}),
		});
	},
);