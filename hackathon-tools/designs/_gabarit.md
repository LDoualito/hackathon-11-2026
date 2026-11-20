# Conception : <sujet>

Gabarit obligatoire. Les règles sont dans `hackathon-tools/guidelines/generalisation.md`. Une section vide interdit de recommander.

## 1. Problème et famille

Ce qu'il faut traduire. La famille de problème. Les cas qui contraignent le même type Go, qu'un exercice les demande ou non.

## 2. Ce qui n'a pas été éprouvé

À écrire en dernier, à placer en premier. Cases de la matrice restées en hypothèse, axes non déroulés, mesures manquantes.

## 3. Options

Une ligne par option : sa forme en Go, en trois lignes de code au plus.

## 4. Matrice des axes

Une colonne par option. Chaque case : tient, se dégrade ou casse — et la preuve entre crochets : [exécuté], [lu], [hypothèse].

| Axe | Cas essayé | Option A | Option B | Option C |
|---|---|---|---|---|
| Cardinalité 0 | | | | |
| Cardinalité 1 | | | | |
| Cardinalité 2 | | | | |
| Cardinalité 6 | | | | |
| Symétrie : même essai de l'autre côté | | | | |
| Hétérogénéité : tous différents | | | | |
| Hétérogénéité : membre et non-membre | | | | |
| Profondeur | | | | |
| Succession de 6 maillons, 6 types | | | | |
| Formes d'écriture | | | | |
| Positions | | | | |
| Valeurs limites | | | | |
| Composition avec l'existant | | | | |

## 5. Mesures

Trois lignes au moins par tableau : cas courant, N = 6, cas hétérogène. Machine, version de Go, nombre de passes.

## 6. Dégradations

| Déclencheur (forme TypeScript exacte) | Coût (mesuré ou hypothèse) | Détection (transpilation, compilation Go, panique justifiée) |
|---|---|---|

## 7. Épreuves

Liste des programmes de `hackathon-tools/verify/epreuves/<famille>/` et leur état attendu après implémentation : identique, ou refusé avec quelle erreur.

## 8. Recommandation

Seulement si les sections 2 à 7 sont remplies. Ce qu'elle abandonne par rapport aux options écartées.

## 9. Go attendu

Écrit à la main, compilé et exécuté. Dire si ce n'est pas le cas.

## 10. Plan d'implémentation

Fichiers à créer. Lignes d'origine à modifier, une par une, avec la raison. Étapes et critère de vérification de chacune.

## 11. Décisions qui reviennent à l'utilisateur
