"""page.py のページを返す Python Web サーバー（開発用・標準ライブラリのみ）。

使い方: python server.py [port]  → http://localhost:8000
"""
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from page import PAGES, render


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        name = self.path.split("?")[0].lstrip("/") or "index.html"
        if name not in PAGES:
            self.send_error(404)
            return
        body = render(name).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with HTTPServer(("0.0.0.0", port), Handler) as httpd:
        print(f"Serving on http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
