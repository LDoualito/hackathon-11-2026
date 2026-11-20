import json
import re
import urllib.request
from pathlib import Path

import numpy as np

DATA = Path(__file__).resolve().parent / "data"
MODEL = "bge-m3"
OLLAMA = "http://localhost:11434/api/embed"
IDENTIFIER = re.compile(r"\b(?:[A-Za-z]+\.[A-Za-z]+|[a-z]+[A-Z][A-Za-z]*|D[A-Z][A-Za-z]+)\b")


class Occurrences(dict):
    def __init__(self, texts):
        super().__init__()
        self.texts = texts

    def __missing__(self, word):
        needle = word.split(".")[-1]
        self[word] = np.fromiter((needle in text for text in self.texts), dtype=np.float32, count=len(self.texts))
        return self[word]


class Index:
    def __init__(self):
        self.chunks = json.loads((DATA / "chunks.json").read_text())
        self.vectors = np.load(DATA / "vectors.npy")
        heads = [f"{chunk['path']} {chunk['title']}".lower() for chunk in self.chunks]
        bodies = [chunk["text"].lower() for chunk in self.chunks]
        self.heads = Occurrences(heads)
        self.bodies = Occurrences(bodies)

    def embed(self, text):
        payload = json.dumps({"model": MODEL, "input": [text]}).encode()
        request = urllib.request.Request(OLLAMA, payload, {"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=120) as response:
            vector = np.asarray(json.load(response)["embeddings"][0], dtype=np.float32)
        return vector / np.linalg.norm(vector)

    def search(self, query, count=10, filters=None):
        scores = self.vectors @ self.embed(query)
        for identifier in {word.lower() for word in IDENTIFIER.findall(query)}:
            scores = scores + 0.08 * self.heads[identifier] + 0.04 * self.bodies[identifier]
        allowed = [
            index for index, chunk in enumerate(self.chunks)
            if all(
                values & set(chunk["families"]) if key == "family" else chunk[key] in values
                for key, values in (filters or {}).items()
            )
        ]
        ranked = sorted(allowed, key=lambda index: -scores[index])[:count]
        return [(index, float(scores[index])) for index in ranked]
