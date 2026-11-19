import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";
import { TsAST } from "@typescript";
import { type BuildContext } from "../../../context/build";
import { expressionTransformers } from "../../expression";

export const coalescingFunctionIdentifier = GoAST.createIdentifier("Coalescing");

// Le Go produit dans shard_dependencies :
// func Coalescing(value any) any {
//     var slice []any
//     var isSlice bool
//     slice, isSlice = value.([]any)
//     if isSlice { return slice }    // déjà un tableau : tel quel
//     return []any{value}            // sinon : on l'enveloppe dans un tableau
// }
export const coalescingDependency = DCommon.memo(() => {
	const value = GoAST.createIdentifier("value");
	const slice = GoAST.createIdentifier("slice");
	const isSlice = GoAST.createIdentifier("isSlice");
	const anySliceType = GoAST.createSliceType({ elementType: GoAST.builtinTypeReferences.any });

	return createSharedDependency({
		imports: [],
		init: [],
		declarations: [
			GoAST.createFunctionDeclaration({
				identifier: coalescingFunctionIdentifier,
				generic: [],
				arguments: [
					GoAST.createFunctionArgument({ identifier: value, type: GoAST.builtinTypeReferences.any }),
				],
				returnTypes: [GoAST.builtinTypeReferences.any],
				body: GoAST.createBlockStatement({
					statements: [
						GoAST.createVariableDeclarationZeroValue({ identifier: slice, typeReference: anySliceType }),
						GoAST.createVariableDeclarationZeroValue({ identifier: isSlice, typeReference: GoAST.builtinTypeReferences.bool }),
						GoAST.createAssignmentStatement({
							targets: DCommon.cast([slice, isSlice]),
							values: DCommon.cast([GoAST.createTypeAssertionExpression({ target: value, typeReference: anySliceType })]),
						}),
						GoAST.createIfStatement({
							condition: isSlice,
							body: GoAST.createBlockStatement({
								statements: [GoAST.createReturnStatement({ values: [slice] })],
							}),
						}),
						GoAST.createReturnStatement({
							values: [GoAST.createSliceLiteral({ typeReference: anySliceType, elements: [value] })],
						}),
					],
				}),
			}),
		],
	});
});

// DArray.coalescing      (passé comme valeur) → shard_dependencies.Coalescing
// DArray.coalescing(x)   (appelé)             → shard_dependencies.Coalescing(x)
export async function coalescingExpressionHandler(node: TsAST.Node, context: BuildContext) {
	const reference = GoAST.createSelectorExpression({
		target: context.registerSharedDependency(coalescingDependency.value),
		identifier: coalescingFunctionIdentifier,
	});

	// ① Passé comme valeur : on transmet simplement la fonction Go
	if (!TsAST.isCallExpression(node)) {
		return context.success({ result: reference });
	}

	if (node.arguments.length !== 1) {
		return context.error(node, "coalescing-must-be-called-with-one-argument");
	}

	// ② Appelé directement : l'argument passe par une variable temporaire
	const argument = await DCommon.asyncPipe(
		context.transform(DArray.first(node.arguments)!, expressionTransformers.value),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(argument)) {
		return argument;
	}

	const statement = GoAST.createShortVariableDeclarationStatement({
		identifier: context.generateIdentifier(),
		initializer: argument.result,
	});

	return context.success({
		before: DArray.concat(argument.before, [statement]),
		result: GoAST.createCallExpression({
			callee: reference,
			arguments: [statement.identifier],
		}),
	});
}