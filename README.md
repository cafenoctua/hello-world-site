# hello-world-site

Hello World を表示するだけのサイト。

| ファイル | 役割 |
|---|---|
| `page.py` | ページの HTML（唯一の定義元） |
| `server.py` | 開発用サーバー: `python server.py` → http://localhost:8000 |
| `build.py` | GitHub Pages 向けビルド: `python build.py` → `docs/index.html` |

## 公開
`python build.py` で `docs/` を再生成してコミット・push。
GitHub Pages は Settings → Pages で「Deploy from a branch」→ 既定ブランチ / `/docs` を指定。
