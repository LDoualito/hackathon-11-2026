import argparse

from search import Index

parser = argparse.ArgumentParser(description="Recherche sémantique dans la base de connaissances du hackathon.")
parser.add_argument("query")
parser.add_argument("-k", type=int, default=8)
parser.add_argument("--source", nargs="*", choices=["notes", "boilerplate", "ecosystem", "typescript-go"])
parser.add_argument("--kind", nargs="*", choices=["note", "code", "test", "doc", "skill", "exercise"])
parser.add_argument("--package", nargs="*")
parser.add_argument("--family", nargs="*")
parser.add_argument("--full", action="store_true")
arguments = parser.parse_args()

filters = {
    key: set(values)
    for key, values in {
        "source": arguments.source,
        "kind": arguments.kind,
        "package": arguments.package,
        "family": arguments.family,
    }.items()
    if values
}

index = Index()
for position, (chunk_id, score) in enumerate(index.search(arguments.query, arguments.k, filters), 1):
    chunk = index.chunks[chunk_id]
    text = chunk["text"] if arguments.full else chunk["text"][:400]
    print(f"\n[{position}] {score:.3f}  #{chunk_id}  {chunk['path']}:{chunk['line']}")
    print(f"    {chunk['kind']} · {chunk['package']} · famille {chunk['family']} · {chunk['title']}")
    print("    " + text.replace("\n", "\n    "))
