import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../../context/build";
import { expressionTransformers } from "../../../expression";
import { eitherDependency, eitherFieldIdentifiers, eitherTypeIdentifier } from "./sharedDependency";

export const whenIsRightFunctionIdentifier = GoAST.createIdentifier("WhenIsRight");

// Le type Go d'une fonction passée comme valeur : func(value any) any
export function createAnyFunctionType() {
	return GoAST.createFunctionType({
		arguments: [
			GoAST.createFunctionArgument({
				identifier: GoAST.createIdentifier("value"),
				type: GoAST.builtinTypeReferences.any,
			}),
		],
		returnTypes: [GoAST.builtinTypeReferences.any],
	});
}

// Le Go produit dans shard_dependencies :
// func WhenIsRight(input any, theFunction func(value any) any) any {
//     var either Either
//     var isEither bool
//     either, isEither = input.(Either)
//     if isEither && either.IsRight {
//         return theFunction(either.Value)   // succès : le résultat de la fonction, tel quel
//     }
//     return input                           // sinon : inchangé
// }
export const whenIsRightDependency = DCommon.memo(() => {
	const input = GoAST.createIdentifier("input");
	const theFunction = GoAST.createIdentifier("theFunction");
	const either = GoAST.createIdentifier("either");
	const isEither = GoAST.createIdentifier("isEither");

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: whenIsRightFunctionIdentifier,
				generic: [],
				arguments: [
					GoAST.createFunctionArgument({ identifier: input, type: GoAST.builtinTypeReferences.any }),
					GoAST.createFunctionArgument({ identifier: theFunction, type: createAnyFunctionType() }),
				],
				returnTypes: [GoAST.builtinTypeReferences.any],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createVariableDeclarationZeroValue({ identifier: either, typeReference: eitherTypeIdentifier }),
						GoAST.createVariableDeclarationZeroValue({ identifier: isEither, typeReference: GoAST.builtinTypeReferences.bool }),
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([either, isEither]),
							values: DCommon.cast([GoAST.createTypeAssertionExpression({ target: input, typeReference: eitherTypeIdentifier })]),
						}),
						GoAST.createIfStatement({
							condition: GoAST.createBinaryExpression({
								operator: "&&",
								left: isEither,
								right: GoAST.createSelectorExpression({ target: either, identifier: eitherFieldIdentifiers.isRight }),
							}),
							body: GoAST.createBlockStatement({
								statements: [
									GoAST.createReturnStatement({
										values: [
											GoAST.createCallExpression({
												callee: theFunction,
												arguments: [GoAST.createSelectorExpression({ target: either, identifier: eitherFieldIdentifiers.value })],
											}),
										],
									}),
								],
							}),
						}),
						GoAST.createReturnStatement({ values: [input] }),
					],
				}),
			}),
		],
	});
});

// DEither.whenIsRight(input, theFunction) → shard_dependencies.WhenIsRight(input, theFunction)
// DEither.whenIsRight(theFunction)        → func(value any) any { return shard_dependencies.WhenIsRight(value, theFunction) }
export async function whenIsRightAnyExpressionHandler(node: TsAST.Node, context: BuildContext) {
	// ① Seulement les appels à 1 argument (version curryfiée) ou 2 arguments
	if (!TsAST.isCallExpression(node) || (node.arguments.length !== 1 && node.arguments.length !== 2)) {
		return context.error(node, "whenIsRight-must-be-called-with-one-or-two-arguments");
	}

	// ② Chaque argument est traduit puis rangé dans une variable temporaire (ordre d'évaluation)
	let before: readonly GoAST.Statement[] = [];
	const argumentIdentifiers: GoAST.Identifier[] = [];

	for (const argumentNode of node.arguments) {
		const argument = await DCommon.asyncPipe(
			context.transform(argumentNode, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(argument)) {
			return argument;
		}

		const statement = GoAST.createShortVariableDeclarationStatement({
			identifier: context.generateIdentifier(),
			initializer: argument.result,
		});

		before = DArray.concat(before, argument.before, [statement]);
		argumentIdentifiers.push(statement.identifier);
	}

	// ③ On s'assure que la struct Either existe aussi (WhenIsRight l'utilise)
	context.registerSharedDependency(eitherDependency.value);

	const whenIsRightReference = GoAST.createSelectorExpression({
		target: context.registerSharedDependency(whenIsRightDependency.value),
		identifier: whenIsRightFunctionIdentifier,
	});

	// ④ Version curryfiée (1 argument, utilisée dans pipe) : on renvoie une fonction
	//    qui attend l'entrée plus tard :
	//    func(value any) any { return WhenIsRight(value, theFunction) }
	if (argumentIdentifiers.length === 1) {
		const value = GoAST.createIdentifier("value");

		return context.success({
			before,
			result: GoAST.createFunctionLiteral({
				arguments: [
					GoAST.createFunctionArgument({ identifier: value, type: GoAST.builtinTypeReferences.any }),
				],
				returnTypes: [GoAST.builtinTypeReferences.any],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createReturnStatement({
							values: [
								GoAST.createCallExpression({
									callee: whenIsRightReference,
									arguments: [value, argumentIdentifiers[0]!],
								}),
							],
						}),
					],
				}),
			}),
		});
	}

	// ⑤ Version classique (2 arguments) : appel direct
	return context.success({
		before,
		result: GoAST.createCallExpression({
			callee: whenIsRightReference,
			arguments: argumentIdentifiers,
		}),
	});
}