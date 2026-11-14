"""GitHub Pages 向けに静的 HTML を docs/ へ書き出す。

使い方: python build.py  → docs/*.html を生成
"""
from pathlib import Path

from page import PAGES, render

OUT = Path(__file__).resolve().parent / "docs"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for name in PAGES:
        (OUT / name).write_text(render(name), encoding="utf-8")
        print(f"Built {OUT / name}")
    (OUT / ".nojekyll").touch()  # Jekyll 処理を無効化してそのまま配信


if __name__ == "__main__":
    main()
