import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { TypeFlags } from "typescript/async";
import { expressionTransformers } from ".";
import { transformTypeOfExpression } from "../type/ofExpression";
import { createSimpleAssignment } from "../common";

/**
 * Ternaire `condition ? a : b`. Go n'en a pas :
 *
 *   var Generated_1 float64        // type du ternaire, donné par le checker TS
 *   if condition {
 *       Generated_1 = a
 *   } else {
 *       Generated_1 = b
 *   }
 *
 * Les préparations (`before`) de chaque branche restent DANS sa branche :
 * seule la branche choisie est calculée, comme en JS.
 */
export const conditionalExpressionTransformer: Transformer<GoAST.Identifier> = createTransformer(
	async(node, context) => {
		if (!TsAST.isConditionalExpression(node)) {
			return context.notSupport();
		}

		const conditionType = await context.transpilation.typeChecker.getTypeAtLocation(node.condition);

		if (!(conditionType.flags & TypeFlags.BooleanLike)) {
			// « truthiness » JS (`nombre ? a : b`) : pas d'équivalent direct en Go.
			return context.error(node.condition, "conditional-condition-is-not-boolean");
		}

		const resultType = await transformTypeOfExpression(node, context);

		if (DEither.isLeft(resultType)) {
			return resultType;
		}

		const resultIdentifier = context.generateIdentifier();

		const condition = await DCommon.asyncPipe(
			context.transform(node.condition, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		const whenTrue = await DCommon.asyncPipe(
			context.transform(node.whenTrue, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(whenTrue)) {
			return whenTrue;
		}

		const whenFalse = await DCommon.asyncPipe(
			context.transform(node.whenFalse, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(whenFalse)) {
			return whenFalse;
		}

		// Une branche Go : ses préparations, puis `Generated_1 = valeur`.
		const createBranch = (branch: typeof whenTrue) => GoAST.createBlockStatement({
			statements: DArray.push(
				branch.before,
				createSimpleAssignment(resultIdentifier, branch.result),
			),
		});

		return context.success({
			before: DArray.concat(
				resultType.before,
				[
					GoAST.createVariableDeclarationZeroValue({
						identifier: resultIdentifier,
						typeReference: resultType.result,
					}),
				],
				condition.before,
				[
					GoAST.createIfStatement({
						condition: condition.result,
						body: createBranch(whenTrue),
						elseBranch: createBranch(whenFalse),
					}),
				],
			),
			result: resultIdentifier,
		});
	},
);
