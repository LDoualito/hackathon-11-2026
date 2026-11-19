// Refusé : une étape de rightPipe qui renvoie une valeur brute (pas un Either).
// TS l'emballe dans success() à la fin ; en Go il faudrait convertir les types.
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

DCommon.print(
	DEither.rightPipe(
		add(1, 2),
		(value) => value * 2,
	),
);
