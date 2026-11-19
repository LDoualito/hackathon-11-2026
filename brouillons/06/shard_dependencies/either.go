// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// Either est la représentation Go d'un Either DuploJS : un seul struct,
// passé par valeur (pas de pointeur, pas d'interface).
//
//	IsRight      true pour un Right (succès), false pour un Left (échec).
//	Information  l'information DuploJS : "success", "fail", "division-by-zero"...
//	Kind         le marqueur ajouté par success(), fail(), ok(), error()...
//	             "" pour un Either créé par left() ou right().
//	Left, Right  la valeur ; seul le champ du côté actif est significatif.
//
// Kind est nécessaire pour reproduire l'affichage de Node : DEither.success(3)
// affiche une clé « success: null » que DEither.right("success", 3) n'a pas.
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

const eitherKindPrefix = "@duplojs/lang/kind/@DuplojsLangEither/"

// jsEntries donne les clés et les valeurs de l'objet JS équivalent,
// dans l'ordre où DuploJS les crée (et donc où Node les affiche) :
// right|left, information, value, puis le marqueur s'il existe.
func (either Either[L, R]) jsEntries() ([]string, []any) {
	keys := make([]string, 0, 4)
	values := make([]any, 0, 4)
	if either.IsRight {
		keys = append(keys, eitherKindPrefix+"right")
		values = append(values, JSNull{}, either.Information, either.Right)
	} else {
		keys = append(keys, eitherKindPrefix+"left")
		values = append(values, JSNull{}, either.Information, either.Left)
	}
	keys = append(keys, eitherKindPrefix+"information", eitherKindPrefix+"value")
	if either.Kind != "" {
		keys = append(keys, eitherKindPrefix+either.Kind)
		values = append(values, JSNull{})
	}
	return keys, values
}
