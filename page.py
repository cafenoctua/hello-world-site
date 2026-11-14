"""ページの中身（唯一の定義元）。server.py と build.py の両方がここを使う。"""

TITLE = "Hello World"


def render() -> str:
    return f"""<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{TITLE}</title>
  <style>
    body {{ margin: 0; min-height: 100vh; display: grid; place-items: center;
           font-family: system-ui, sans-serif; background: #f7f7f5; color: #222; }}
    h1 {{ font-size: 3rem; }}
  </style>
</head>
<body>
  <h1>{TITLE}</h1>
</body>
</html>
"""
