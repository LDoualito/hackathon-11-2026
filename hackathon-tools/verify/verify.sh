#!/usr/bin/env bash

set -uo pipefail

target="${1:?usage: verify.sh NN ou verify.sh chemin/vers/une/epreuve}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -d "${root}/${target}" ]; then
	project="${target%/}"
else
	project="projects/${target}"
fi
exercise="$(basename "${project}")"
out="${root}/hackathon-tools/verify/out"
go_image="golang:1.27"

cd "${root}"
mkdir -p "${out}"

step() { printf '\n== %s\n' "$1"; }
fail() { printf 'ÉCHEC : %s\n' "$1"; exit 1; }

step "1/5 Transpilation TypeScript vers Go"
pnpm --silent build --tsconfig "${project}/tsconfig.json" --input "${project}/index.ts" --output "${project}/dist" \
	|| fail "la transpilation a échoué"
[ -f "${project}/dist/go.mod" ] || fail "aucun go.mod généré dans ${project}/dist"

step "2/5 Exécution de la référence TypeScript"
pnpm --silent exec tsx "${project}/index.ts" > "${out}/${exercise}.ts.txt" 2> "${out}/${exercise}.ts.err" \
	|| fail "le programme TypeScript a échoué, voir ${out}/${exercise}.ts.err"

run_go() {
	docker run --rm \
		-v "${root}/${project}/dist":/src:ro \
		-v hackathon-go-cache:/gocache \
		-w /src -e GOFLAGS=-buildvcs=false -e GOCACHE=/gocache \
		"${go_image}" "$@"
}

step "3/5 Compilation Go (go build, go vet)"
run_go sh -c 'go build ./... && go vet ./...' || fail "le Go généré ne compile pas ou ne passe pas go vet"

step "4/5 Exécution du Go"
run_go go run . > "${out}/${exercise}.go.txt" 2> "${out}/${exercise}.go.err" \
	|| fail "le programme Go a échoué, voir ${out}/${exercise}.go.err"

step "5/5 Comparaison des sorties"
if diff -u "${out}/${exercise}.ts.txt" "${out}/${exercise}.go.txt"; then
	printf 'IDENTIQUE : %s lignes de sortie\n' "$(wc -l < "${out}/${exercise}.ts.txt" | tr -d ' ')"
else
	fail "la sortie Go diffère de la sortie TypeScript (diff ci-dessus : - TypeScript, + Go)"
fi

unformatted="$(run_go gofmt -l . || true)"
if [ -n "${unformatted}" ]; then
	printf '\nÀ noter, non bloquant : fichiers non conformes à gofmt :\n%s\n' "${unformatted}"
fi
