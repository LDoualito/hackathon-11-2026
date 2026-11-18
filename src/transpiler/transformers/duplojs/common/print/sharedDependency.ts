import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const printFunctionIdentifier = GoAST.createIdentifier("Print");

/**
 * Fonction Go `Print`, équivalent de console.log de Node.
 * Écrite à la main dans print.go (runtime) et copiée telle quelle par le build :
 * environ 300 lignes de Go qu'il serait illisible de reconstruire avec les
 * factories de l'AST (décision d'équipe n°3).
 */
export const printDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "print.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("print.go")],
				),
			},
		],
	}),
);
