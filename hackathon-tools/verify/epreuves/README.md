# Corpus d'épreuves

Les onze exercices sont un échantillon. Ce corpus contient les programmes qui poussent chaque famille de problème dans ses pires cas, selon les axes de `hackathon-tools/guidelines/generalisation.md`.

Chaque épreuve est un dossier avec un `index.ts` et un `tsconfig.json`. Elle se lance comme un exercice :

```bash
hackathon-tools/verify/verify.sh hackathon-tools/verify/epreuves/unions/six-succes
```

Une épreuve est réussie dans deux cas seulement : la sortie Go est identique à la sortie TypeScript, ou le transpileur la refuse avec une erreur explicite prévue par la conception.

## Famille « unions »

| Épreuve | Axes | Ce qu'elle attaque |
|---|---|---|
| `unions/chaine-six-etapes` | Succession, cardinalité 6, hétérogénéité | Six étapes de `rightPipe`, six échecs distincts à valeurs de types différents, type du succès qui change à chaque étape, puis `matchInformation` à sept branches |
| `unions/six-succes` | Symétrie, cardinalité 6, hétérogénéité | Six succès nommés de types différents renvoyés par une même fonction, puis `matchInformation` |
| `unions/either-et-brut` | Hétérogénéité membre et non-membre | `whenIsRight` qui renvoie un échec ou une valeur brute, tableau qui mêle les deux, garde `isLeft` dans un ternaire |
| `unions/elargissement-puis-mutation` | Composition, identité | Tableau élargi par annotation puis muté par `push` à travers l'alias élargi, puis comparé par `===` |
| `unions/elargissement-autres-positions` | Position, type annoté ou inféré | Élargissement d'un tableau dans la valeur d'un Either renvoyé, une propriété d'objet, un corps de fléchée, une réaffectation ; élargissements qui ne changent pas la représentation |
| `unions/covariance-puis-ecriture` | Composition, symétrie entrée et sortie | Tableau et objet d'Either aliasés sous un type plus large sans changement de type Go, écriture par l'alias large, lecture par l'alias étroit |
| `unions/covariance-lecture-seule` | Composition, type annoté ou inféré | Tableau d'Either passé pour un `readonly` plus large, puis `push` sur la source et relecture par l'alias `readonly` |

État au 2026-11-19 : les trois s'exécutent et passent le typage en TypeScript. Aucune n'est encore transpilée.

## Ajouter une épreuve

1. Créer `<famille>/<cas>/index.ts` et copier un `tsconfig.json` voisin.
2. Vérifier qu'elle s'exécute et qu'elle passe le typage :
   `pnpm --silent exec tsx <chemin>/index.ts` et `pnpm --silent exec tsc --noEmit -p <chemin>/tsconfig.json`.
3. L'ajouter au tableau ci-dessus avec les axes qu'elle couvre.
