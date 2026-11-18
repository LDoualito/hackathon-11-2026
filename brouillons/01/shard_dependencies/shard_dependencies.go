// BROUILLON écrit à la main : Go que le transpileur devra générer pour l'exercice 01.
// Ce fichier regroupe ce qui ira dans shard_dependencies (code commun).
package shard_dependencies

type JSNull struct{}

type JSUndefined struct{}

// Either : un seul struct, passé par valeur (décision d'équipe n°1).
//
// Ajout par rapport à la décision : le champ Kind.
// En TypeScript, DEither.success(3) et DEither.right("success", 3) n'affichent pas
// la même chose : success() ajoute une 4e clé « success: null ». Même chose pour
// fail(), ok(), error(), none(), some() et result(). Sans Kind, Print ne pourrait
// pas savoir s'il faut afficher cette clé.
//
//	Kind == ""        -> créé par left() / right() : pas de 4e clé
//	Kind == "success" -> créé par success() : 4e clé « success: null »
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string
	Left        L
	Right       R
}

// DEither.success(value).
// L ne peut pas être deviné à partir de l'argument : le transpileur l'écrit
// explicitement (EitherSuccessOf[JSUndefined, float64]) en lisant le type de
// retour déclaré de la fonction TS.
func EitherSuccessOf[L any, R any](value R) Either[L, R] {
	return Either[L, R]{
		IsRight:     true,
		Information: "success",
		Kind:        "success",
		Right:       value,
	}
}
