import { TsAST } from "@typescript";
import { GoAST } from "@go";
import { createTransformer, type Transformer } from "@transformer";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { expressionTransformers } from "../expression";
import { blockStatementTransformer } from "./block";

export const ifStatementTransformer: Transformer<GoAST.IfStatement> = createTransformer(
	async(node, context) => {
		// ① Seulement les if
		if (!TsAST.isIfStatement(node)) {
			return context.notSupport();
		}

		// ② La condition, traduite (ses préparations passent dans before, AVANT le if)
		const condition = await DCommon.asyncPipe(
			context.transform(node.expression, expressionTransformers.value),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(condition)) {
			return condition;
		}

		// ③ Le bloc « then ». Go exige des accolades : on refuse `if (x) foo();` sans bloc
		if (!TsAST.isBlock(node.thenStatement)) {
			return context.error(node, "if-body-must-be-a-block");
		}

		const body = await DCommon.asyncPipe(
			context.transform(node.thenStatement, [blockStatementTransformer]),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(body)) {
			return body;
		}

		// ④ Le else éventuel : un bloc, ou un autre if (else if)
		let elseBranch: GoAST.BlockStatement | GoAST.IfStatement | undefined = undefined;

		if (node.elseStatement) {
			if (TsAST.isBlock(node.elseStatement)) {
				const elseBlock = await DCommon.asyncPipe(
					context.transform(node.elseStatement, [blockStatementTransformer]),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(elseBlock)) {
					return elseBlock;
				}

				elseBranch = elseBlock.result;
			} else if (TsAST.isIfStatement(node.elseStatement)) {
				const elseIf = await DCommon.asyncPipe(
					context.transform(node.elseStatement, [ifStatementTransformer]),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(elseIf)) {
					return elseIf;
				}

				// Les préparations du `else if` ne doivent s'exécuter que si on arrive dans le else :
				// on enveloppe donc le else if dans un bloc qui les contient.
				elseBranch = elseIf.before.length === 0
					? elseIf.result
					: GoAST.createBlockStatement({
						statements: [...elseIf.before, elseIf.result],
					});
			} else {
				return context.error(node, "else-must-be-a-block-or-if");
			}
		}

		return context.success({
			before: condition.before,
			result: GoAST.createIfStatement({
				condition: condition.result,
				body: body.result,
				elseBranch,
			}),
		});
	},
);