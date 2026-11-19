import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const failFunctionIdentifier = GoAST.createIdentifier("EitherFailOf");

/**
 * Constructeur Go de `DEither.fail`. Écrit à la main dans fail.go (runtime)
 * et copié tel quel par le build. Il s'appuie sur le type Either : le handler
 * enregistre aussi `eitherDependency`.
 */
export const eitherFailDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_fail.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("fail.go")],
				),
			},
		],
	}),
);
