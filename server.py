"""Hello World を表示する最小の Python Web サーバー（標準ライブラリのみ）。

使い方: python server.py [port]  → http://localhost:8000
"""
import sys
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    with HTTPServer(("0.0.0.0", port), handler) as httpd:
        print(f"Serving on http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
