import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import { printExpressionHandler } from "./print";
import { pipeExpressionHandler } from "./pipe";

// Aiguillage des fonctions de @duplojs/lang/common (comme either/index.ts pour Either)
export const duploJSCommonExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
	async(node, context) => {
		const reference = TsAST.isCallExpression(node)
			? node.expression
			: node;

		if (
			!TsAST.isIdentifier(reference)
			&& !TsAST.isPropertyAccessExpression(reference)
		) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/common\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("print"),
				() => printExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("pipe"),
				() => pipeExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

// `DCommon.print(x);` seul sur sa ligne est une instruction (ExpressionStatement) :
// on récupère l'appel à l'intérieur et on le traite comme l'expression ci-dessus.
export const duploJSCommonStatementTransformer: Transformer<GoAST.CallExpression> = createTransformer(
	async(node, context) => {
		if (!TsAST.isExpressionStatement(node) || !TsAST.isCallExpression(node.expression)) {
			return context.notSupport();
		}

		const callee = node.expression.expression;

		if (!TsAST.isIdentifier(callee) && !TsAST.isPropertyAccessExpression(callee)) {
			return context.notSupport();
		}

		const moduleReference = await DCommon.asyncPipe(
			context.resolveReferenceModule(callee, "@duplojs/lang", /^dist\/common\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference) || moduleReference.symbol.name !== "print") {
			return context.notSupport();
		}

		return printExpressionHandler(node.expression, context);
	},
);