from __future__ import annotations

import os
from pathlib import Path

ROOT = Path.cwd()

TEXT_REPLACEMENTS = {
    "Pacta": "Pacta",
    "pacta": "pacta",
    "PACTA": "PACTA",
}

HOSTING_REPLACEMENTS = {
    "Backend: TBD - requires explicit user approval": "Backend: TBD - requires explicit user approval",
    "Backend: `TBD - requires explicit user approval`": "Backend: `TBD - requires explicit user approval`",
    "- Backend: TBD - requires explicit user approval": "- Backend: TBD - requires explicit user approval",
    "backend after explicit approval, Vercel for frontend": "backend after explicit approval, Vercel for frontend",
    "Current backend hosting is **TBD and requires explicit user approval**": "Current backend hosting is **TBD and requires explicit user approval**",
}

TEXT_EXTENSIONS = {
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".py",
    ".prisma",
    ".example",
    ".css",
}

SKIP_PARTS = {"node_modules", ".git", "dist", ".next", "coverage", ".pnpm"}


def should_update(path: Path) -> bool:
    if any(part in SKIP_PARTS for part in path.parts):
        return False
    return path.suffix in TEXT_EXTENSIONS or path.name in {".env.example", ".gitignore", "Dockerfile"}


def update_text_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = original
    for source, target in TEXT_REPLACEMENTS.items():
        updated = updated.replace(source, target)
    for source, target in HOSTING_REPLACEMENTS.items():
        updated = updated.replace(source, target)
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed = []
    for current_root, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [dirname for dirname in dirnames if dirname not in SKIP_PARTS]
        for filename in filenames:
            path = Path(current_root) / filename
            if should_update(path) and update_text_file(path):
                changed.append(path.relative_to(ROOT).as_posix())

    fly_readme = ROOT / "infra" / "fly" / "README.md"
    fly_readme.write_text(
        "# Optional Fly.io Template\n\n"
        "This directory is retained only as an optional deployment template. "
        "Pacta does not have an approved backend hosting provider yet. "
        "Do not deploy the backend to Fly.io unless the user explicitly approves Fly.io during the deployment phase.\n",
        encoding="utf-8",
    )
    changed.append(fly_readme.relative_to(ROOT).as_posix())

    print(f"Applied Pacta naming and hosting-approval preference to {len(changed)} files.")


if __name__ == "__main__":
    main()
