import json
import re
import subprocess
import sys
from collections import Counter
from functools import lru_cache
from pathlib import Path

TOOLS = Path(__file__).resolve().parent.parent
ROOT = TOOLS.parent
DATA = TOOLS / "rag" / "data"
ECOSYSTEM = TOOLS / "sources" / "ecosystem"
EPREUVES = TOOLS / "verify" / "epreuves"
sys.path.insert(0, str(TOOLS / "rag"))


@lru_cache(maxsize=1)
def _index():
    from search import Index
    return Index()


@lru_cache(maxsize=1)
def _api():
    return {entry["name"]: entry for entry in json.loads((DATA / "api.json").read_text())}


@lru_cache(maxsize=1)
def _exercises():
    return {card["name"]: card for card in json.loads((DATA / "matrix.json").read_text())["exercises"]}


def _brief(chunk, score=None, size=500):
    result = {
        "id": chunk["id"], "path": f"{chunk['path']}:{chunk['line']}", "title": chunk["title"],
        "kind": chunk["kind"], "families": chunk["families"], "text": chunk["text"][:size],
    }
    if score is not None:
        result["score"] = round(score, 3)
    return result


def search(query: str, k: int = 8, source: str = "", kind: str = "", family: str = "") -> list:
    """Recherche par le sens dans la base (notes, guidelines, boilerplate, monorepo DuploJS).
    Renvoie les k extraits les plus proches : c'est un échantillon, pas un inventaire.
    Filtres optionnels : source (notes|boilerplate|ecosystem|typescript-go), kind (note|code|test|doc|skill|exercise), family."""
    filters = {key: {value} for key, value in (("source", source), ("kind", kind), ("family", family)) if value}
    index = _index()
    return [_brief(index.chunks[chunk_id], score) for chunk_id, score in index.search(query, k, filters)]


def chunk(chunk_id: int) -> dict:
    """Texte complet d'un extrait et ses plus proches voisins."""
    index = _index()
    item = index.chunks[chunk_id]
    return {**_brief(item, size=100000), "near": [_brief(index.chunks[near], score, 160) for near, score in item["near"]]}


def api_list(namespace: str = "", only_exercises: bool = False) -> list:
    """Inventaire exhaustif des fonctions et types DuploJS indexés (pas un top-k).
    namespace filtre un domaine (ex. DEither) ; only_exercises ne garde que ceux des onze exercices."""
    return [
        {"name": entry["name"], "usages": entry["uses"], "exercises": entry["exercises"]}
        for entry in _api().values()
        if (not namespace or entry["namespace"] == namespace) and (not only_exercises or entry["exercises"])
    ]


def api(name: str) -> dict:
    """Fiche d'une fonction ou d'un type DuploJS (ex. DEither.rightPipe) : sa page de documentation,
    son code source et ses tests en entier, et l'emplacement des notes et des citations."""
    entry = _api().get(name)
    if entry is None:
        return {"error": f"{name} inconnu", "proches": [key for key in _api() if name.split(".")[-1].lower() in key.lower()][:20]}
    chunks = _index().chunks
    groups = {}
    for group, ids in entry["groups"].items():
        full = group in {"doc", "source", "tests"}
        groups[group] = {
            "count": len(ids),
            "items": [_brief(chunks[chunk_id], size=4000 if full else 0) for chunk_id in ids[: 12 if full else 30]],
        }
    return {"name": name, "exercises": entry["exercises"], "groups": groups}


def _split_arguments(text):
    depth, angles, parts, current, previous = 0, 0, [], "", ""
    for char in text:
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
        elif char == "<" and (previous.isalnum() or previous == "_"):
            angles += 1
        elif char == ">" and angles > 0 and previous != "=":
            angles -= 1
        previous = char
        if char == "," and depth == 0 and angles == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += char
    if current.strip():
        parts.append(current.strip())
    return parts


def _balanced(text, start):
    depth = 0
    for position in range(start, len(text)):
        if text[position] == "(":
            depth += 1
        elif text[position] == ")":
            depth -= 1
            if depth == 0:
                return text[start + 1: position]
    return None


def signatures(name: str) -> dict:
    """Toutes les surcharges déclarées d'une fonction DuploJS, lues dans son code source :
    nombre de paramètres de chacune et lignes où l'implémentation tranche (args.length).
    C'est la liste complète des formes d'appel que le typage accepte."""
    entry = _api().get(name)
    if entry is None:
        return {"error": f"{name} inconnu"}
    chunks = _index().chunks
    function = entry["function"]
    files = sorted({chunks[chunk_id]["path"] for chunk_id in entry["groups"]["source"]})
    overloads, dispatch = [], []
    for relative in files:
        path = TOOLS / "sources" / relative if relative.startswith("ecosystem/") else ROOT / relative
        text = path.read_text()
        for match in re.finditer(rf"export (?:async )?function {re.escape(function)}\b", text):
            opening = text.find("(", _skip_generics(text, match.end()))
            inside = _balanced(text, opening)
            if inside is None:
                continue
            parameters = [re.sub(r"\s+", " ", part)[:120] for part in _split_arguments(inside)]
            overloads.append({
                "file": relative, "line": text.count("\n", 0, match.start()) + 1,
                "arity": len(parameters), "rest": any(part.startswith("...") for part in parameters),
                "parameters": parameters,
            })
        dispatch += [f"{relative}:{number}: {line.strip()}" for number, line in enumerate(text.splitlines(), 1)
                     if "args.length" in line or "arguments.length" in line]
    return {
        "name": name, "overloads": overloads,
        "arities": sorted({overload["arity"] for overload in overloads}),
        "runtime_dispatch": dispatch,
    }


def _skip_generics(text, position):
    if position < len(text) and text[position] == "<":
        depth = 0
        for cursor in range(position, len(text)):
            if text[cursor] == "<":
                depth += 1
            elif text[cursor] == ">" and text[cursor - 1] != "=":
                depth -= 1
                if depth == 0:
                    return cursor + 1
    return position


@lru_cache(maxsize=1)
def _sources():
    files = []
    for root, prefix in ((ROOT, ""), (ECOSYSTEM, "ecosystem/")):
        listed = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True).stdout.splitlines()
        files += [(prefix + name, root / name) for name in listed
                  if name.endswith((".ts", ".mts", ".vue")) and not name.endswith(".d.ts") and "docs/libs/" not in name]
    files += [(str(path.relative_to(ROOT)), path) for path in EPREUVES.rglob("*.ts")]
    return [(name, path.read_text(errors="replace")) for name, path in files if path.is_file()]


def _zone(name):
    if name.startswith("projects/"):
        return "exercices"
    if name.startswith("hackathon-tools/"):
        return "epreuves"
    if not name.startswith("ecosystem/"):
        return "boilerplate"
    parts = name.split("/")
    package = parts[2] if len(parts) > 2 else "racine"
    kind = "tests" if "/tests/" in name or ".test" in name else "docs" if "/docs/" in name or "/skills/" in name else "code"
    return f"{package}:{kind}"


def usages(name: str, limit: int = 12) -> dict:
    """Tous les usages réels d'une fonction DuploJS écrite avec son espace de noms (ex. DArray.map)
    dans le monorepo, le boilerplate, les exercices et les épreuves. Décompte exhaustif :
    par nombre d'arguments à l'appel, par zone, et références nues (fonction passée sans être appelée).
    Limite : ne voit pas les appels internes à la bibliothèque faits sans espace de noms."""
    pattern = re.compile(rf"(?<![\w.]){re.escape(name)}\b(\s*<[^()\n]*>)?(\s*\()?")
    by_arity, by_zone, samples, bare = Counter(), Counter(), {}, []
    for file_name, text in _sources():
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            if text.splitlines()[line - 1].lstrip().startswith(("*", "//", "/*")):
                continue
            where = f"{file_name}:{line}"
            by_zone[_zone(file_name)] += 1
            if match.group(2) is None:
                by_arity["référence nue"] += 1
                bare.append(f"{where}: {text.splitlines()[line - 1].strip()[:140]}")
                continue
            inside = _balanced(text, match.end() - 1)
            arity = len(_split_arguments(inside)) if inside is not None else -1
            by_arity[f"{arity} argument(s)"] += 1
            samples.setdefault(arity, [])
            if len(samples[arity]) < limit:
                samples[arity].append(f"{where}: {re.sub(r'\\s+', ' ', inside or '')[:140]}")
    return {
        "name": name, "total": sum(by_arity.values()),
        "par_forme": dict(by_arity.most_common()),
        "par_zone": dict(by_zone.most_common()),
        "exemples_par_arite": {str(arity): lines for arity, lines in sorted(samples.items())},
        "references_nues": bare[:limit],
    }


def _run(command, timeout=600):
    done = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    return done.returncode, done.stdout + done.stderr


def exercise(number: str) -> dict:
    """Fiche d'un exercice (00 à 10) : ce qu'il demande, son code, les fonctions DuploJS utilisées
    et la sortie de référence obtenue en exécutant le TypeScript."""
    card = _exercises().get(number)
    if card is None:
        return {"error": f"exercice {number} inconnu"}
    code, output = _run(["pnpm", "--silent", "exec", "tsx", f"projects/{number}/index.ts"], 120)
    return {
        "name": number, "problems": card["problems"], "solved_in_boilerplate": card["solved"],
        "apis": card["apis"], "code": card["code"], "reference_exit": code, "reference_output": output,
    }


def verify(target: str) -> dict:
    """Lance la vérification complète d'un exercice (ex. 01) ou d'une épreuve (chemin du dossier) :
    transpilation, exécution TypeScript, go build et go vet, exécution Go, comparaison des sorties.
    Renvoie l'étape atteinte et la cause du premier échec."""
    code, output = _run(["hackathon-tools/verify/verify.sh", target])
    steps = re.findall(r"^== (\d)/5 (.+)$", output, flags=re.M)
    failure = re.search(r"^ÉCHEC : (.+)$", output, flags=re.M)
    blocking = re.search(r"kind: '(\w+)',\s*\n\s*parentKind: '?(\w+)'?,\s*\n\s*text: '(.*)'", output)
    return {
        "target": target, "success": code == 0,
        "last_step": " ".join(steps[-1]) if steps else "aucune",
        "failure": failure.group(1) if failure else None,
        "blocking_node": {"kind": blocking.group(1), "parent": blocking.group(2), "text": blocking.group(3)} if blocking else None,
        "output_tail": output[-1500:],
    }


def coverage() -> list:
    """État de tous les exercices et de toutes les épreuves du corpus : pour chacun, réussi ou non,
    étape atteinte, et nœud TypeScript qui bloque. C'est le tableau de ce qui est réellement géré."""
    targets = sorted(path.name for path in (ROOT / "projects").iterdir() if path.is_dir())
    targets += sorted(str(path.parent.relative_to(ROOT)) for path in EPREUVES.rglob("index.ts"))
    rows = []
    for target in targets:
        result = verify(target)
        rows.append({key: result[key] for key in ("target", "success", "last_step", "failure", "blocking_node")})
    return rows


TOOLS_EXPOSED = [search, chunk, api_list, api, signatures, usages, exercise, verify, coverage]
