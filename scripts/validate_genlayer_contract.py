from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path.cwd()
CONTRACT = ROOT / "contracts" / "pacta_covenant_registry.py"
RUNNER_PREFIX = '# { "Depends": "py-genlayer:'


def main() -> None:
    source = CONTRACT.read_text(encoding="utf-8")
    first_line = source.splitlines()[0] if source.splitlines() else ""
    if not first_line.startswith(RUNNER_PREFIX):
        raise SystemExit(
            "GenLayer runner comment is missing from the first line. "
            f"First line was: {first_line!r}"
        )
    if "__receive__" in source:
        raise SystemExit("Contract contains __receive__; remove it before Studio schema loading.")
    ast.parse(source)
    print("GenLayer contract preflight ok")
    print(first_line)


if __name__ == "__main__":
    main()
