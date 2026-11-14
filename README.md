# hello-world-site

タブ付きの小さなサイト。

- **Hello**: Hello World を表示
- **Earth**: アスキーアートの地球が回る

| ファイル | 役割 |
|---|---|
| `page.py` | 各ページの HTML（唯一の定義元）。`PAGES` にタブを登録 |
| `data/world_map.txt` | 地球の陸地マップ（96×48、`#`=陸） |
| `server.py` | 開発用サーバー: `python server.py` → http://localhost:8000 |
| `build.py` | GitHub Pages 向けビルド: `python build.py` → `docs/*.html` |

## 公開
`python build.py` で `docs/` を再生成してコミット・push。
GitHub Pages は Settings → Pages で「Deploy from a branch」→ 既定ブランチ / `/docs` を指定。
