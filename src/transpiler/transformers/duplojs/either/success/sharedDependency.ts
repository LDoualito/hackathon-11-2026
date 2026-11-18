import * as DCommon from "@duplojs/lang/common";
import * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { createSharedDependency } from "@transformer";

export const successFunctionIdentifier = GoAST.createIdentifier("EitherSuccessOf");

/**
 * Constructeur Go de `DEither.success`. Écrit à la main dans success.go
 * (runtime) et copié tel quel par le build. Il s'appuie sur le type Either :
 * le handler enregistre aussi `eitherDependency`.
 */
export const eitherSuccessDependency = DCommon.memo(
	() => createSharedDependency({
		imports: [],
		declarations: [],
		init: [],
		goFiles: [
			{
				fileName: "either_success.go",
				sourcePath: DPath.resolveFrom(
					DPath.createAbsoluteOrThrow(import.meta.dirname),
					[DPath.declarePath("success.go")],
				),
			},
		],
	}),
);
