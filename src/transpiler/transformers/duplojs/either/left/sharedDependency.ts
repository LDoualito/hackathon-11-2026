import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const leftFunctionIdentifier = GoAST.createIdentifier("EitherLeftOf");

/**
 * Constructeur Go de `DEither.left`. Écrit à la main dans left.go (runtime)
 * et copié tel quel par le build. Il s'appuie sur le type Either : le handler
 * enregistre aussi `eitherDependency`.
 */
export const eitherLeftDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_left.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("left.go")],
				),
			},
		],
	}),
);
