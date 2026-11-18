import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";

// `const x = <expr>;` / `let x = <expr>;`  ->  `Sourced_x := <expr>`
// Volontairement limité : une seule variable, un nom simple, une valeur initiale.
export const variableStatementTransformer: Transformer<GoAST.ShortVariableDeclarationStatement> = createTransformer(
	async(node, context) => {
		if (!TsAST.isVariableStatement(node)) {
			return context.notSupport();
		}

		const declarations = node.declarationList.declarations;
		const [declaration] = declarations;

		if (
			declarations.length !== 1
			|| !declaration
			|| !TsAST.isIdentifier(declaration.name)
			|| !declaration.initializer
		) {
			// Cas reconnu mais pas encore géré : destructuration, plusieurs variables, pas de valeur.
			return context.error(node);
		}

		const initializer = await DCommon.asyncPipe(
			context.transform(declaration.initializer, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(initializer)) {
			return initializer;
		}

		return context.success({
			before: initializer.before,
			result: GoAST.createShortVariableDeclarationStatement({
				identifier: context.createSourceIdentifier(declaration.name.text),
				initializer: initializer.result,
			}),
		});
	},
);
