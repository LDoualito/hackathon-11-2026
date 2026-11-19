import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const printFunctionIdentifier = GoAST.createIdentifier("Print");

// func Print[T any](value T) T { fmt.Printf("%+v\n", value); return value }
// Comme DCommon.print, la fonction affiche la valeur puis la renvoie.
export const printDependency = DCommon.memo(() => {
	const generic = GoAST.createIdentifier("T");
	const value = GoAST.createIdentifier("value");
	const fmt = GoAST.createIdentifier("fmt");

	return createSharedDependency({
		imports: [GoAST.createImportDeclaration({ path: "fmt" })],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: printFunctionIdentifier,
				generic: [
					GoAST.createTypeParameter({
						identifier: generic,
						constraint: GoAST.builtinTypeReferences.any,
					}),
				],
				arguments: [
					GoAST.createFunctionArgument({
						identifier: value,
						type: generic,
					}),
				],
				returnTypes: [generic],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createCallExpression({
							callee: GoAST.createSelectorExpression({
								target: fmt,
								identifier: GoAST.createIdentifier("Printf"),
							}),
							arguments: [
								GoAST.createStringLiteral({ value: "%+v\n" }),
								value,
							],
						}),
						GoAST.createReturnStatement({ values: [value] }),
					],
				}),
			}),
		],
	});
});