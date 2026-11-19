import { GoAST } from "@go";
import * as DCommon from "@duplojs/lang/common";

/**
 * `cible = valeur` (une seule cible, une seule valeur).
 * Raccourci pour `GoAST.createAssignmentStatement`, qui accepte plusieurs
 * cibles (`a, b = 1, 2`) et demande donc des listes d'au moins un élément.
 */
export function createSimpleAssignment(
	target: GoAST.AssignmentTarget,
	value: GoAST.Expression,
) {
	return GoAST.createAssignmentStatement({
		targets: DCommon.cast([target]),
		values: DCommon.cast([value]),
	});
}
