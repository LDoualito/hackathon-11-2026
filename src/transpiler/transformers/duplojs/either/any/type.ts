import { GoAST } from "@go";
import { TsAST } from "@typescript";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import { type BuildContext } from "../../../../context/build";
import { eitherDependency, eitherTypeIdentifier } from "./sharedDependency";

// Vrai si le nœud est un type venant de @duplojs/lang/either (Success<X>, Fail, Left<...>...)
async function isEitherTypeReference(node: TsAST.Node, context: BuildContext) {
	if (!TsAST.isTypeReferenceNode(node) && !TsAST.isImportTypeNode(node)) {
		return false;
	}

	const moduleReference = await DCommon.asyncPipe(
		context.resolveReferenceModule(
			TsAST.isTypeReferenceNode(node) ? node.typeName : node,
			"@duplojs/lang",
			/^dist\/either\//,
		),
		DEither.unwrapRight,
	);

	return !DEither.isLeft(moduleReference);
}

// Tout type Either, ou union de types Either, devient `shard_dependencies.Either`.
export async function eitherAnyTypeHandler(node: TsAST.Node, context: BuildContext) {
	// ① Un membre seul (ex: Success<number>) ou une union (Success<number> | Fail)
	const members = TsAST.isUnionTypeNode(node)
		? node.types
		: [node];

	// ② Tous les membres doivent être des types Either de DuploJS
	for (const member of members) {
		if (!await isEitherTypeReference(member, context)) {
			return context.notSupport();
		}
	}

	// ③ Peu importe les variantes : le type Go est toujours le même
	return context.success({
		result: GoAST.createPackageTypeReference({
			packageName: context.registerSharedDependency(eitherDependency.value),
			identifier: eitherTypeIdentifier,
		}),
	});
}