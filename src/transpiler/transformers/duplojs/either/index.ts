import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { eitherAnyTypeHandler } from "./any/type";
import {
	failAnyExpressionHandler,
	isRightAnyExpressionHandler,
	leftAnyExpressionHandler,
	successAnyExpressionHandler,
} from "./any/constructors";

export const duploJSEitherDeclarationTransformer: Transformer<GoAST.Declaration> = createTransformer(
	(_node, context) => context.notSupport(),
);

// Aiguillage : selon la fonction DEither appelée, on choisit le bon handler
export const duploJSEitherExpressionTransformer: Transformer<GoAST.Expression> = createTransformer(
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
			context.resolveReferenceModule(reference, "@duplojs/lang", /^dist\/either\//),
			DEither.unwrapRight,
		);

		if (DEither.isLeft(moduleReference)) {
			return context.notSupport();
		}

		return DCommon.pipe(
			moduleReference.symbol.name,
			DPattern.match(
				DCommon.equal("success"),
				() => successAnyExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("fail"),
				() => failAnyExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("left"),
				() => leftAnyExpressionHandler(node, context),
			),
			DPattern.match(
				DCommon.equal("isRight"),
				() => isRightAnyExpressionHandler(node, context),
			),
			DPattern.otherwise(
				() => context.error(node),
			),
		);
	},
);

// Tous les types Either (et leurs unions) → shard_dependencies.Either
export const duploJSEitherTypeTransformer: Transformer<GoAST.TypeReference> = createTransformer(
	(node, context) => eitherAnyTypeHandler(node, context),
);