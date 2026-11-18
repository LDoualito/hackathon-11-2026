import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { createTransformer, type Transformer } from "@transformer";
import type { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DPattern from "@duplojs/lang/pattern";
import { type BuildContext } from "../../../context/build";
import { successExpressionHandler } from "./success";
import { isRightExpressionHandler } from "./isRight";
import { eitherTypeHandler, type EitherTypeMember } from "./eitherType";

export const duploJSEitherDeclarationTransformer: Transformer<GoAST.Declaration> = createTransformer(
	(_node, context) => context.notSupport(),
);

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
				() => successExpressionHandler(
					node,
					context,
				),
			),
			DPattern.match(
				DCommon.equal("isRight"),
				() => isRightExpressionHandler(
					node,
					context,
				),
			),
			DPattern.otherwise(
				() => context.error(node, "either-function-not-supported-yet"),
			),
		);
	},
);

/**
 * Reconnaît un type Either DuploJS : une variante seule (`DEither.Success<number>`)
 * ou une union dont TOUS les membres sont des variantes Either
 * (`DEither.Success<number> | DEither.Fail`). Fonctionne aussi sur les types
 * reconstruits par le checker (type de retour déduit, type attendu).
 */
async function resolveEitherTypeMember(
	member: TsAST.TypeNode,
	context: BuildContext,
): Promise<EitherTypeMember | undefined> {
	if (!TsAST.isTypeReferenceNode(member) && !TsAST.isImportTypeNode(member)) {
		return undefined;
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(
			TsAST.isTypeReferenceNode(member) ? member.typeName : member,
			"@duplojs/lang",
			/^dist\/either\//,
		),
		DEither.unwrapRight,
	);

	if (DEither.isLeft(moduleReference)) {
		return undefined;
	}

	return {
		node: member,
		exportName: moduleReference.symbol.name,
	};
}

export const duploJSEitherTypeTransformer: Transformer<GoAST.GenericTypeReference> = createTransformer(
	async(node, context) => {
		if (!TsAST.isTypeNode(node)) {
			return context.notSupport();
		}

		const resolvedMembers = await DCommon.asyncPipe(
			TsAST.isUnionTypeNode(node) ? node.types : [node],
			DArray.map((member) => resolveEitherTypeMember(member, context)),
			DCommon.promiseAll,
		);

		const members = DArray.filter(
			resolvedMembers,
			(member): member is EitherTypeMember => member !== undefined,
		);

		// Un seul membre qui n'est pas un Either (ex. `string | DEither.Fail`) : pas pour ce routeur.
		if (members.length !== resolvedMembers.length) {
			return context.notSupport();
		}

		return eitherTypeHandler(node, members, context);
	},
);
