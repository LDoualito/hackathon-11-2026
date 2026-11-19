import * as DCommon from "@duplojs/lang/common";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

// Nom du type Go commun à TOUS les Either (Success, Fail, Left, et leurs unions).
export const eitherTypeIdentifier = GoAST.createIdentifier("Either");

export const eitherFieldIdentifiers = {
	isRight: GoAST.createIdentifier("IsRight"),
	information: GoAST.createIdentifier("Information"),
	value: GoAST.createIdentifier("Value"),
};

// type Either struct { IsRight bool; Information string; Value any }
// Une seule struct, quel que soit le nombre de variantes (success, fail, negative-operand...).
export const eitherDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createTypeDefinition({
				identifier: eitherTypeIdentifier,
				type: GoAST.createStructType({
					fields: [
						GoAST.createStructField({
							identifier: eitherFieldIdentifiers.isRight,
							typeReference: GoAST.builtinTypeReferences.bool,
						}),
						GoAST.createStructField({
							identifier: eitherFieldIdentifiers.information,
							typeReference: GoAST.builtinTypeReferences.string,
						}),
						GoAST.createStructField({
							identifier: eitherFieldIdentifiers.value,
							typeReference: GoAST.builtinTypeReferences.any,
						}),
					],
				}),
			}),
		],
	}),
);