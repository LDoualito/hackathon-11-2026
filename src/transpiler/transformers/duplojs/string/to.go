// Code Go écrit à la main (runtime), copié tel quel dans shard_dependencies
// par le transpileur. Voir sharedDependency.ts à côté de ce fichier.
package shard_dependencies

// StringTo correspond à DString.to(value), c'est-à-dire `${value}` en JS.
//
// Générique pour garder le type de la valeur (pas de conversion vers any à l'appel).
// Les nombres utilisent formatNumber (print.go), qui écrit les nombres comme JS
// (1e+21, NaN…), sauf -0 : `${-0}` vaut "0" en JS, alors que l'affichage de Node écrit -0.
func StringTo[T any](value T) string {
	switch typed := any(value).(type) {
	case float64:
		if typed == 0 {
			return "0"
		}
		return formatNumber(typed)
	case string:
		return typed
	case bool:
		if typed {
			return "true"
		}
		return "false"
	}
	panic("shard_dependencies.StringTo : type non géré")
}
