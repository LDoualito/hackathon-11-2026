import * as DModeling from "@duplojs/lang/modeling";
import type * as DPath from "@duplojs/lang/path";
import { GoAST } from "@go";
import { goModulePath } from "../sourcePackage";

/**
 * Fichier Go écrit à la main, copié tel quel dans le package shard_dependencies.
 * Réservé au code d'exécution commun (runtime) : types Either, Print...
 * Le code traduit depuis le TypeScript passe toujours par l'AST Go.
 */
export interface SharedDependencyGoFile {
	readonly fileName: string;
	readonly sourcePath: string & DPath.Absolute;
}

export interface SharedDependency extends DModeling.ObjectTag<"SharedDependency"> {
	readonly imports: readonly GoAST.ImportDeclaration[];
	readonly declarations: readonly GoAST.Declaration[];
	readonly init: readonly GoAST.Statement[];
	readonly goFiles: readonly SharedDependencyGoFile[];
}

export const createSharedDependency = DModeling.createTaggedObjectFactory<SharedDependency>(
	"SharedDependency",
);

export const sharedDependencyPackageName = GoAST.createIdentifier("shard_dependencies");

export const sharedDependencyImportDeclaration = GoAST.createImportDeclaration({
	path: `${goModulePath}/${sharedDependencyPackageName.value}`,
});
