import hashlib
import json
import re
import subprocess
import urllib.request
from pathlib import Path

import numpy as np

RAG = Path(__file__).resolve().parent
PROJECT = RAG.parent.parent
DATA = RAG / "data"
MODEL = "bge-m3"
OLLAMA = "http://localhost:11434/api/embed"
MAX_CHARS = 1800
TEXT_EXT = {".md", ".ts", ".mts", ".vue"}
SKIP_PARTS = {"node_modules", "dist", ".vitepress", "__snapshots__"}
TSGO_SKIP = re.compile(r"_test\.go$|generated|^internal/(fourslash|bundled|testutil|diagnostics)/")
API_TOKEN = re.compile(r"\bD[A-Z][A-Za-z]*\.[a-zA-Z_]\w*")
API_LINK = re.compile(r"\[(D[A-Z][A-Za-z]*\.[a-zA-Z_]\w*)\]\(")

FAMILIES = {
    "valeurs": "Représentation des valeurs en Go : number vers float64, chaînes UTF-16, tableaux, tuples à cardinalité fixe, undefined et null, contraintes de type effaçables, formatage des nombres.",
    "unions": "Unions et discrimination : représentation d'un Either Right ou Left, Success ou Fail, information nommée, kinds, matchInformation, isRight, isLeft, rétrécissement de type après une garde, retour d'union.",
    "fonctions": "Fonctions comme valeurs : fonction fléchée, closure et capture de variable, référence de fonction passée en argument, callback, déstructuration des paramètres, génériques et instanciation.",
    "forme-appel": "Forme d'appel donnée d'abord ou curryfiée : data-first, data-last, currying décidé par le nombre d'arguments, pipe, surcharges, étapes d'un pipe.",
    "flux": "Flux de contrôle et ordre d'évaluation : if, return multiples, ternaire, court-circuit && et ||, instructions préparatoires before, arrêt anticipé, rightPipe, reduce avec next et exit, group.",
    "async": "Asynchronisme : async, await, Promise, asyncPipe, rightAsyncPipe, asyncGroup, promiseAll, goroutines et canaux, ordre d'exécution asynchrone.",
    "effets": "Effets observables et structure du programme : print et console, format util.inspect, sérialisation JSON, init de package Go, main.go, go.mod, imports, dépendances partagées, ordre d'initialisation des modules.",
    "architecture": "Architecture du transpileur : transformer, dispatch, contexte de build, AST Go, printer, routeur et handler de domaine, diagnostics, erreurs de transformation, tests, lint, conventions de code DuploJS.",
}

FAMILY_SIGNALS = {
    "valeurs": r"float64|\bNaN\b|UTF-16|\btuples?\b|\bundefined\b|\bnull\b|toString|\bInteger\b|bigint|-0\b",
    "unions": r"Either|isRight|isLeft|\bLeft\b|\bRight\b|\bSuccess\b|\bFail\b|matchInformation|hasInformation|\bunions?\b|discrimin|narrowing|rétrécissement",
    "fonctions": r"callback|closure|fermeture|\bcaptur|déstructur|destructur|générique|\bgenerics?\b|fléchée|arrow function|instanci",
    "forme-appel": r"data-first|data-last|curr[iy]|args\.length|arguments\.length|overload|surcharge|donnée d'abord",
    "flux": r"ternaire|ternary|court-circuit|short-circuit|arrêt anticipé|early return|rightPipe|\bexit\(|\bnext\(|\breduce\b|\bloop\b|\bgroup\(|\bbefore\b",
    "async": r"\basync\b|\bawait\b|Promise|asyncPipe|AsyncPipe|asyncGroup|goroutine|\bchan\b|asynchron",
    "effets": r"console\.|\bprint\(|util\.inspect|JSON\.stringify|\binit\(\)|main\.go|go\.mod|stdout|stderr|writeTextFile|sérialis",
    "architecture": r"[Tt]ransformer|\bAST\b|[Pp]rinter|notSupport|dispatch|BuildContext|oxlint|tsconfig|\blint\b",
}
SIGNAL_BONUS = 0.75
FAMILY_THRESHOLD = 1.0


def git_files(root):
    out = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True, check=True)
    return [root / line for line in out.stdout.splitlines()]


def classify_kind(rel):
    parts = rel.parts
    name = rel.name
    if "skills" in parts or name in {"AGENTS.md", "SKILL.md"}:
        return "skill"
    if name.endswith(".test.ts") or name.endswith(".test-d.ts") or "tests" in parts:
        return "test"
    if rel.suffix == ".md":
        return "doc"
    return "code"


def collect():
    sources = []
    documents = [path for folder in ("notes", "guidelines", "designs") for path in sorted((RAG.parent / folder).glob("*.md"))]
    for path in documents:
        sources.append({"path": path, "rel": path.relative_to(PROJECT), "source": "notes",
                        "package": "notes", "domain": path.stem, "kind": "note"})
    for path in git_files(PROJECT):
        rel = path.relative_to(PROJECT)
        if path.suffix not in TEXT_EXT or not path.is_file():
            continue
        top = rel.parts[0]
        if top == "projects":
            package, domain, kind = "exercices", rel.parts[1], "exercise"
        elif top == "src":
            package = "boilerplate"
            domain = "/".join(rel.parts[1:3]) if len(rel.parts) > 3 else rel.parts[1]
            kind = "code"
        else:
            package, domain, kind = "boilerplate", top, classify_kind(rel)
        sources.append({"path": path, "rel": rel, "source": "boilerplate", "package": package,
                        "domain": domain, "kind": kind})
    eco = RAG.parent / "sources" / "ecosystem"
    for path in git_files(eco):
        rel = path.relative_to(eco)
        if path.suffix not in TEXT_EXT or not path.is_file():
            continue
        if SKIP_PARTS & set(rel.parts) or rel.parts[:2] == ("docs", "libs") or rel.name.endswith(".d.ts"):
            continue
        if rel.parts[0] in {"packages", "packages-private"} and len(rel.parts) > 2:
            package = rel.parts[1]
            inner = rel.parts[2:]
            domain = inner[1] if len(inner) > 2 and inner[0] in {"scripts", "tests", "docs", "skills"} else inner[0]
        else:
            package, domain = "ecosystem-racine", rel.parts[0]
        sources.append({"path": path, "rel": Path("ecosystem") / rel, "source": "ecosystem",
                        "package": package, "domain": domain, "kind": classify_kind(rel)})
    tsgo = RAG.parent / "sources" / "typescript-go"
    for path in git_files(tsgo):
        rel = path.relative_to(tsgo)
        if rel.parts[0] == "testdata" or not path.is_file():
            continue
        if path.suffix == ".md":
            package, domain, kind = "typescript-go-racine", rel.parts[0], classify_kind(rel)
        elif path.suffix == ".go" and rel.parts[0] == "internal" and not TSGO_SKIP.search(str(rel)):
            package, domain, kind = rel.parts[1], rel.parts[1], "code"
        else:
            continue
        sources.append({"path": path, "rel": Path("typescript-go") / rel, "source": "typescript-go",
                        "package": package, "domain": domain, "kind": kind})
    return sources


def pack(blocks):
    pieces, current, start = [], "", None
    for line_no, block in blocks:
        while len(block) > MAX_CHARS:
            if current:
                pieces.append((start, current))
                current, start = "", None
            pieces.append((line_no, block[:MAX_CHARS]))
            block = block[MAX_CHARS:]
        if current and len(current) + len(block) + 2 > MAX_CHARS:
            pieces.append((start, current))
            current, start = "", None
        if not current:
            start = line_no
        current = f"{current}\n\n{block}" if current else block
    if current.strip():
        pieces.append((start, current))
    return pieces


def paragraphs(lines, offset):
    blocks, buffer, start = [], [], offset
    for index, line in enumerate(lines):
        if line.strip() == "" and buffer:
            blocks.append((start, "\n".join(buffer)))
            buffer = []
        elif line.strip() != "":
            if not buffer:
                start = offset + index
            buffer.append(line)
    if buffer:
        blocks.append((start, "\n".join(buffer)))
    return blocks


def chunk_markdown(text):
    lines = text.splitlines()
    sections, trail, current, start, in_fence = [], [], [], 1, False
    for index, line in enumerate(lines):
        if line.startswith("```"):
            in_fence = not in_fence
        match = None if in_fence else re.match(r"^(#{1,3})\s+(.*)", line)
        if match:
            if current:
                sections.append((" › ".join(trail), start, current))
            level = len(match.group(1))
            trail = trail[: level - 1] + [match.group(2).strip()]
            current, start = [], index + 1
        current.append(line)
    if current:
        sections.append((" › ".join(trail), start, current))
    chunks = []
    for title, line_no, body in sections:
        for piece_line, piece in pack(paragraphs(body, line_no)):
            chunks.append((title, piece_line, piece))
    return chunks


def chunk_code(text):
    lines = text.splitlines()
    blocks, buffer, start = [], [], 1
    for index, line in enumerate(lines):
        top_level = bool(line) and not line[0].isspace() and line[0] not in ")}]"
        if top_level and buffer and buffer[-1].strip() == "":
            blocks.append((start, "\n".join(buffer).rstrip()))
            buffer, start = [], index + 1
        buffer.append(line)
    if buffer:
        blocks.append((start, "\n".join(buffer).rstrip()))
    return [("", line_no, piece) for line_no, piece in pack(blocks)]


def make_chunks(sources):
    chunks = []
    for item in sources:
        text = item["path"].read_text(encoding="utf-8", errors="replace")
        if len(text.strip()) < 80:
            continue
        pieces = chunk_markdown(text) if item["path"].suffix == ".md" else chunk_code(text)
        for title, line_no, piece in pieces:
            if len(piece.strip()) < 60:
                continue
            rel = str(item["rel"])
            chunks.append({
                "id": len(chunks),
                "source": item["source"],
                "package": item["package"],
                "domain": item["domain"],
                "kind": item["kind"],
                "path": rel,
                "line": line_no,
                "title": title or Path(rel).name,
                "text": piece,
            })
    return chunks


def embed(texts):
    DATA.mkdir(exist_ok=True)
    keys_path, vecs_path = DATA / "cache_keys.json", DATA / "cache_vecs.npy"
    keys = json.loads(keys_path.read_text()) if keys_path.exists() else {}
    vecs = list(np.load(vecs_path)) if vecs_path.exists() else []
    hashes = [hashlib.sha1(text.encode()).hexdigest() for text in texts]
    missing = [index for index, key in enumerate(hashes) if key not in keys]
    for position in range(0, len(missing), 24):
        batch = missing[position: position + 24]
        payload = json.dumps({"model": MODEL, "input": [texts[index] for index in batch]}).encode()
        request = urllib.request.Request(OLLAMA, payload, {"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=600) as response:
            result = json.load(response)["embeddings"]
        for index, vector in zip(batch, result):
            keys[hashes[index]] = len(vecs)
            vecs.append(np.asarray(vector, dtype=np.float32))
        if position % 480 == 0:
            print(f"  embeddings {position + len(batch)}/{len(missing)}", flush=True)
            np.save(vecs_path, np.stack(vecs))
            keys_path.write_text(json.dumps(keys))
    if missing:
        np.save(vecs_path, np.stack(vecs))
        keys_path.write_text(json.dumps(keys))
    matrix = np.stack([vecs[keys[key]] for key in hashes])
    return matrix / np.linalg.norm(matrix, axis=1, keepdims=True)


def embedding_text(chunk):
    return f"{chunk['path']} — {chunk['title']}\n{chunk['text']}"


def neighbours(matrix, count):
    result = []
    for begin in range(0, len(matrix), 1024):
        scores = matrix[begin: begin + 1024] @ matrix.T
        for row, line in enumerate(scores):
            line[begin + row] = -1
            best = np.argpartition(-line, count)[:count]
            best = best[np.argsort(-line[best])]
            result.append([[int(index), round(float(line[index]), 3)] for index in best])
    return result


def api_domain(namespace):
    name = namespace[2:] if len(namespace) > 2 and namespace[1] == "S" and namespace[2].isupper() else namespace[1:]
    return name[0].lower() + name[1:]


def api_index(chunks, mentions, exercise_cards):
    names = set()
    for chunk in chunks:
        if chunk["package"] == "agents-kit" and "/docs/API/" in chunk["path"]:
            names.update(API_LINK.findall(chunk["text"]))
            names.update(API_LINK.findall(chunk["title"]))
    names.update(token for card in exercise_cards for token in card["apis"])
    entries = []
    for name in sorted(names):
        namespace, function = name.split(".")
        domain = api_domain(namespace)
        groups = {"notes": [], "doc": [], "source": [], "tests": [], "concepts": [], "usages": [], "otherTests": []}
        declared = re.compile(
            rf"export (?:declare )?(?:(?:async )?function|type|interface|class|const) {re.escape(function)}\b"
        )
        own_entry = f"[{name}]("
        for chunk in chunks:
            cited = chunk["id"] in mentions.get(name, ())
            in_api_docs = chunk["package"] == "agents-kit" and "/docs/API/" in chunk["path"]
            same_domain = chunk["domain"] == domain
            file_name = Path(chunk["path"]).name
            if chunk["kind"] == "note":
                if cited or f"`{function}`" in chunk["title"]:
                    groups["notes"].append(chunk["id"])
            elif in_api_docs:
                own_page = file_name.endswith(f"-{function}.ts") and f"-{domain.lower()}/" in chunk["path"].lower()
                if own_page or chunk["title"].split(" › ")[-1].startswith(own_entry):
                    groups["doc"].append(chunk["id"])
                elif cited:
                    groups["concepts"].append(chunk["id"])
            elif chunk["package"] == "agents-kit":
                if cited:
                    groups["concepts"].append(chunk["id"])
            elif chunk["kind"] == "test":
                if same_domain and file_name.startswith(f"{function}.test"):
                    groups["tests"].append(chunk["id"])
                elif cited:
                    groups["otherTests"].append(chunk["id"])
            elif chunk["kind"] == "code" and same_domain and "/scripts/" in chunk["path"] and declared.search(chunk["text"]):
                groups["source"].append(chunk["id"])
            elif cited and chunk["kind"] == "code":
                groups["usages"].append(chunk["id"])
        test_prefixes = tuple(
            chunks[index]["path"].replace("/scripts/", "/tests/").removesuffix(".ts") + ".test"
            for index in groups["source"]
        )
        if test_prefixes:
            own_tests = [chunk["id"] for chunk in chunks
                         if chunk["kind"] == "test" and chunk["path"].startswith(test_prefixes)]
            groups["tests"] = sorted(set(groups["tests"]) | set(own_tests))
            groups["otherTests"] = [index for index in groups["otherTests"] if index not in set(own_tests)]
        entries.append({
            "name": name, "namespace": namespace, "function": function,
            "uses": len(groups["usages"]),
            "exercises": [card["name"] for card in exercise_cards if name in card["apis"]],
            "groups": groups,
        })
    return sorted(entries, key=lambda entry: (-len(entry["exercises"]), -entry["uses"], entry["name"]))


def main():
    import umap

    sources = collect()
    chunks = make_chunks(sources)
    print(f"{len(sources)} fichiers, {len(chunks)} chunks", flush=True)
    matrix = embed([embedding_text(chunk) for chunk in chunks])

    family_names = list(FAMILIES)
    family_scores = matrix @ embed(list(FAMILIES.values())).T
    family_scores = (family_scores - family_scores.mean(axis=0)) / family_scores.std(axis=0)
    for column, name in enumerate(family_names):
        signal = re.compile(FAMILY_SIGNALS[name])
        family_scores[:, column] += [SIGNAL_BONUS if signal.search(chunk["text"]) else 0 for chunk in chunks]

    exercises = sorted({chunk["domain"] for chunk in chunks if chunk["kind"] == "exercise"})
    exercise_texts = []
    for name in exercises:
        folder = PROJECT / "projects" / name
        parts = [path.read_text() for path in sorted(folder.glob("*.md")) + sorted(folder.glob("*.ts"))]
        exercise_texts.append("\n\n".join(parts)[:6000])
    exercise_scores = matrix @ embed(exercise_texts).T

    signature = hashlib.sha1("".join(embedding_text(chunk) for chunk in chunks).encode()).hexdigest()
    points_path, signature_path = DATA / "points.npy", DATA / "points.sha1"
    if points_path.exists() and signature_path.exists() and signature_path.read_text() == signature:
        points = np.load(points_path)
    else:
        print("projection UMAP", flush=True)
        points = umap.UMAP(n_neighbors=20, min_dist=0.15, metric="cosine", random_state=7).fit_transform(matrix)
        points = (points - points.min(axis=0)) / (points.max(axis=0) - points.min(axis=0))
        np.save(points_path, points)
        signature_path.write_text(signature)
    near = neighbours(matrix, 8)

    for chunk in chunks:
        index = chunk["id"]
        chunk["x"], chunk["y"] = round(float(points[index, 0]), 4), round(float(points[index, 1]), 4)
        ranked_families = [int(column) for column in np.argsort(-family_scores[index])
                           if family_scores[index, column] >= FAMILY_THRESHOLD][:3]
        chunk["families"] = [family_names[column] for column in ranked_families] or ["aucune"]
        chunk["family"] = chunk["families"][0]
        chunk["near"] = near[index]

    mentions = {}
    for chunk in chunks:
        for token in set(API_TOKEN.findall(chunk["text"])):
            mentions.setdefault(token, set()).add(chunk["id"])

    exercise_cards = []
    for column, name in enumerate(exercises):
        folder = PROJECT / "projects" / name
        readme = (folder / "README.md").read_text()
        code = {path.name: path.read_text() for path in sorted(folder.glob("*.ts"))}
        used = sorted({token for text in code.values() for token in API_TOKEN.findall(text)})
        ranked = [int(index) for index in np.argsort(-exercise_scores[:, column])
                  if chunks[index]["kind"] != "exercise"][:120]
        exercise_cards.append({
            "name": name,
            "problems": re.findall(r"^### (.+)$", readme.split("## Solution")[0], flags=re.M),
            "solved": "## Solution" in readme,
            "readme": readme,
            "code": code,
            "apis": used,
            "related": [[index, round(float(exercise_scores[index, column]), 3)] for index in ranked],
        })

    np.save(DATA / "vectors.npy", matrix.astype(np.float32))
    (DATA / "chunks.json").write_text(json.dumps(chunks, ensure_ascii=False))
    (DATA / "matrix.json").write_text(json.dumps({
        "families": FAMILIES, "exercises": exercise_cards,
    }, ensure_ascii=False))
    (DATA / "api.json").write_text(json.dumps(api_index(chunks, mentions, exercise_cards), ensure_ascii=False))
    print(f"écrit : {len(chunks)} chunks, matrice {matrix.shape}", flush=True)


if __name__ == "__main__":
    main()
