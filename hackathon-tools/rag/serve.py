import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from search import Index

ROOT = Path(__file__).resolve().parent
PORT = 8765
index = Index()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path != "/api/search":
            return super().do_GET()
        params = parse_qs(url.query)
        query = params.get("q", [""])[0]
        count = int(params.get("k", ["30"])[0])
        body = json.dumps(index.search(query, count)).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


print(f"http://localhost:{PORT}", flush=True)
ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=str(ROOT))).serve_forever()
