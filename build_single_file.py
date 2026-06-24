from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
OUTPUT = ROOT / "outputs" / "orcamentos-app-local.html"


def main() -> None:
    html = (APP / "index.html").read_text(encoding="utf-8")
    css = (APP / "styles.css").read_text(encoding="utf-8")
    tax = (APP / "tax-rules.js").read_text(encoding="utf-8")
    js = (APP / "app.js").read_text(encoding="utf-8")

    html = html.replace(
        '<link rel="stylesheet" href="./styles.css" />',
        f"<style>\n{css}\n</style>",
    )
    html = html.replace(
        '<script src="./tax-rules.js"></script>\n    <script src="./app.js"></script>',
        f"<script>\n{tax}\n</script>\n    <script>\n{js}\n</script>",
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
