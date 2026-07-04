from __future__ import annotations

from pathlib import Path
import runpy

ROOT = Path.cwd()


def main() -> None:
    runpy.run_path(str(ROOT / "scripts" / "rewrite_contract_schema_safe.py"), run_name="__main__")


if __name__ == "__main__":
    main()
