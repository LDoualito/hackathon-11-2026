import { GoAST, GoPrinter } from "@go";
import { TsAST } from "@typescript";
import * as DArray from "@duplojs/lang/array";
import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";
import * as DPattern from "@duplojs/lang/pattern";
import { type BuildContext } from "../../../../context/build";
import { typeTransformers } from "../../../type";
import { eitherDependency, eitherTypeIdentifier, undefinedTypeIdentifier } from "../sharedDependency";

/** Un membre d'une union TS déjà reconnu comme type Either de DuploJS par le routeur. */
export interface EitherTypeMember {
	readonly node: TsAST.TypeReferenceNode | TsAST.ImportTypeNode;
	readonly exportName: string;
}

type GoType = GoAST.Type | GoAST.TypeReference;

/**
 * Reconnaît un type Either DuploJS : une variante seule (`DEither.Success<number>`)
 * ou une union dont TOUS les membres sont des variantes Either
 * (`DEither.Success<number> | DEither.Fail`). Fonctionne aussi sur les types
 * reconstruits par le checker (type de retour déduit, type attendu).
 */
export async function resolveEitherTypeMember(
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

export interface EitherMemberSide {
	readonly side: "left" | "right";

	/**
	 * Information portée par la variante : "success", "fail", ou le premier
	 * paramètre de `Left<"negative-operand", …>`. Undefined si le type ne la fixe
	 * pas (ex. `Left<string, number>`).
	 */
	readonly information: string | undefined;

	/** Type TS de la valeur ; undefined quand la valeur JS est `undefined`. */
	readonly value: TsAST.TypeNode | undefined;
}

/** `"negative-operand"` (type littéral) -> negative-operand ; autre type -> undefined. */
function readLiteralInformation(typeNode: TsAST.TypeNode | undefined) {
	if (
		typeNode
		&& TsAST.isLiteralTypeNode(typeNode)
		&& TsAST.isStringLiteral(typeNode.literal)
	) {
		return typeNode.literal.text;
	}

	return undefined;
}

/**
 * Côté (Left ou Right) et type de valeur de chaque type Either DuploJS pris en charge.
 * Un type absent de cette table produit une erreur explicite, jamais un `any`.
 */
export function describeEitherMember(member: EitherTypeMember): EitherMemberSide | undefined {
	return DCommon.pipe(
		member.exportName,
		DPattern.match(
			DCommon.equal("Success"),
			(): EitherMemberSide => ({
				side: "right",
				information: "success",
				value: member.node.typeArguments && DArray.first(member.node.typeArguments),
			}),
		),
		DPattern.match(
			DCommon.equal("Fail"),
			(): EitherMemberSide => ({
				side: "left",
				information: "fail",
				value: undefined,
			}),
		),
		// Left<information, valeur>. `Left<"x">` écrit sans valeur veut dire
		// « valeur de type unknown » : pas de type Go, donc pas dans la table.
		DPattern.match(
			DCommon.equal("Left"),
			(): EitherMemberSide | undefined => {
				const [information, value] = member.node.typeArguments ?? [];

				if (!value) {
					return undefined;
				}

				return {
					side: "left",
					information: readLiteralInformation(information),
					value,
				};
			},
		),
		DPattern.otherwise(() => undefined),
	);
}

function removeDuplicateGoTypes(goTypes: readonly GoType[]): readonly GoType[] {
	const rendered = DArray.map(goTypes, (goType) => GoPrinter.renderNode(goType));

	return DArray.filter(
		goTypes,
		(goType, { index }) => DArray.indexOf(rendered, GoPrinter.renderNode(goType)) === index,
	);
}

/**
 * Traduit un type Either TypeScript (une variante seule ou une union de variantes)
 * en `shard_dependencies.Either[L, R]` :
 * - L = type des valeurs des variantes Left (Fail -> JSUndefined) ;
 * - R = type des valeurs des variantes Right (Success<number> -> float64) ;
 * - un côté sans aucune variante prend JSUndefined (0 octet, décision d'équipe n°2).
 * Si deux variantes d'un même côté ont des valeurs de types Go différents, un seul
 * L (ou R) ne suffit pas : erreur explicite, c'est une limite documentée.
 */
export async function eitherTypeHandler(
	node: TsAST.TypeNode,
	members: readonly EitherTypeMember[],
	context: BuildContext,
) {
	const packageName = context.registerSharedDependency(eitherDependency.value);
	const undefinedType: GoType = GoAST.createPackageTypeReference({
		packageName,
		identifier: undefinedTypeIdentifier,
	});

	const sides = await DCommon.asyncPipe(
		members,
		DArray.map(
			async(member) => {
				const description = describeEitherMember(member);

				if (!description) {
					return context.error(member.node, "either-type-not-supported-yet");
				}

				if (!description.value) {
					return DEither.right("either-member-side", {
						side: description.side,
						goType: undefinedType,
					});
				}

				const value = await DCommon.asyncPipe(
					context.transform(description.value, typeTransformers.value),
					DEither.unwrapRight,
				);

				if (DEither.isLeft(value)) {
					return value;
				}

				if (!DArray.lengthEqual(value.before, 0)) {
					return context.error(description.value, "un-support-before-on-type");
				}

				return DEither.right("either-member-side", {
					side: description.side,
					goType: value.result,
				});
			},
		),
		DCommon.promiseAll,
	);

	const failedSide = DArray.find(sides, DEither.isLeft);

	if (failedSide) {
		return failedSide;
	}

	const resolvedSides = DArray.map(
		DArray.filter(sides, DEither.isRight),
		DEither.unwrapRight,
	);

	const goTypesOfSide = (side: EitherMemberSide["side"]) => removeDuplicateGoTypes(
		DArray.map(
			DArray.filter(resolvedSides, (resolvedSide) => resolvedSide.side === side),
			(resolvedSide) => resolvedSide.goType,
		),
	);

	const leftTypes = goTypesOfSide("left");
	const rightTypes = goTypesOfSide("right");

	if (leftTypes.length > 1 || rightTypes.length > 1) {
		return context.error(node, {
			reason: "either-side-with-several-go-types",
			left: DArray.map(leftTypes, (goType) => GoPrinter.renderNode(goType)),
			right: DArray.map(rightTypes, (goType) => GoPrinter.renderNode(goType)),
		});
	}

	return context.success({
		result: GoAST.createGenericTypeReference({
			typeReference: GoAST.createPackageTypeReference({
				packageName,
				identifier: eitherTypeIdentifier,
			}),
			typeArguments: DCommon.cast([
				DArray.first(leftTypes) ?? undefinedType,
				DArray.first(rightTypes) ?? undefinedType,
			]),
		}),
	});
}
