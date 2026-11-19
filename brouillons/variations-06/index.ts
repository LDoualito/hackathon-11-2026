// Exercice 06, partie Either : add.ts (left, ternaire, ||) et matchInformation,
// sans whenIsRightOtherwise, DArray.map ni DString.to (exercice 05, autre chantier).
import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { add } from "./add";

// Chemin échec : un Left « negative-operand » qui porte l'opérande négatif.
// Pas de 4e clé à l'affichage (left() n'en ajoute pas, contrairement à fail()).
const failed = add(-1, 2);
DCommon.print(failed);

// Le ternaire choisit le second opérande quand le premier est positif.
DCommon.print(add(1, -5));

// matchInformation : un traitement par information, comme dans index.ts.
const message = DEither.matchInformation(
	failed,
	{
		"negative-operand": () => "un opérande est négatif",
		success: () => "calcul réussi",
	},
);
DCommon.print(message);

// Les traitements reçoivent la valeur du bon côté : Left pour l'échec, Right pour le succès.
const succeeded = add(1, 2);
const doubled = DEither.matchInformation(
	succeeded,
	{
		"negative-operand": (operand) => operand * 10,
		success: (value) => value * 2,
	},
);
DCommon.print(doubled);
