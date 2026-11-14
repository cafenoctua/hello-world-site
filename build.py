"""GitHub Pages 向けに静的 HTML を docs/ へ書き出す。

使い方: python build.py  → docs/index.html を生成
"""
from pathlib import Path

from page import render

OUT = Path(__file__).resolve().parent / "docs"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(render(), encoding="utf-8")
    (OUT / ".nojekyll").touch()  # Jekyll 処理を無効化してそのまま配信
    print(f"Built {OUT / 'index.html'}")


if __name__ == "__main__":
    main()
