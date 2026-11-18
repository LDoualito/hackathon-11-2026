import { TsAST } from "@typescript";
import type { Type } from "typescript/async";
import { type BuildContext } from "../../../context/build";

type EnclosingFunction = (
	| TsAST.FunctionDeclaration
	| TsAST.FunctionExpression
	| TsAST.ArrowFunction
	| TsAST.MethodDeclaration
);

function findEnclosingFunction(node: TsAST.Node | undefined): EnclosingFunction | undefined {
	if (!node) {
		return undefined;
	}

	if (
		TsAST.isFunctionDeclaration(node)
		|| TsAST.isFunctionExpression(node)
		|| TsAST.isArrowFunction(node)
		|| TsAST.isMethodDeclaration(node)
	) {
		return node;
	}

	return findEnclosingFunction(node.parent);
}

/**
 * Type TypeScript attendu pour un Either construit par `expression`.
 *
 * En Go, `Either[A, B]` et `Either[C, D]` sont deux types différents, sans
 * conversion automatique : la valeur doit être construite directement avec le
 * type de l'endroit où elle va.
 * - `return DEither.success(...)` : type de retour de la fonction englobante
 *   (déclaré ou déduit par TypeScript), c'est-à-dire celui de la signature Go.
 *   Le checker ne donne pas de type contextuel quand la fonction n'a pas de
 *   type de retour écrit (exercice 04), d'où ce cas particulier.
 * - Sinon : le type attendu par le contexte, ou à défaut le type de l'expression.
 */
export async function getExpectedEitherType(
	expression: TsAST.Expression,
	context: BuildContext,
): Promise<Type> {
	const checker = context.transpilation.typeChecker;
	const enclosingFunction = TsAST.isReturnStatement(expression.parent)
		? findEnclosingFunction(expression.parent)
		: undefined;

	if (enclosingFunction) {
		const signature = await checker.getSignatureFromDeclaration(enclosingFunction);

		return checker.getReturnTypeOfSignature(signature);
	}

	return await checker.getContextualType(expression) ?? checker.getTypeAtLocation(expression);
}
