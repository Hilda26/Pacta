from __future__ import annotations

import argparse
import secrets
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PNPM = shutil.which("pnpm") or shutil.which("pnpm.cmd")


def pnpm_command(*args: str) -> list[str]:
  if not PNPM:
    raise RuntimeError("pnpm was not found on PATH")
  return [PNPM, *args]


def env_value(name: str) -> str:
  env_path = ROOT / ".env"
  if not env_path.exists():
    return ""
  for line in env_path.read_text(encoding="utf-8").splitlines():
    if line.startswith(f"{name}="):
      return line.split("=", 1)[1].strip().strip('"')
  return ""


def ensure_env() -> None:
  env_path = ROOT / ".env"
  if env_path.exists():
    print(".env already exists")
    return

  template = (ROOT / ".env.example").read_text(encoding="utf-8")
  template = template.replace("replace-with-strong-random-secret", secrets.token_urlsafe(48))
  template = template.replace("replace-with-strong-internal-token", secrets.token_urlsafe(48))
  env_path.write_text(template, encoding="utf-8", newline="\n")
  print("created .env with local development secrets")


def prepare_database() -> None:
  backend_provider = env_value("BACKEND_PROVIDER")
  using_supabase = backend_provider == "supabase" and "supabase.co" in env_value("SUPABASE_URL")

  if using_supabase:
    print("using Supabase directly; apply SQL migrations in supabase/migrations before first runtime use")
    return

  raise RuntimeError("Configure Supabase in .env before running Pacta.")


def start_dev_servers() -> None:
  logs_dir = ROOT / ".local" / "logs"
  logs_dir.mkdir(parents=True, exist_ok=True)
  processes = [
    ("frontend", pnpm_command("--filter", "@pacta/frontend", "dev"), logs_dir / "frontend.log"),
  ]
  for name, command, log_path in processes:
    log = log_path.open("a", encoding="utf-8")
    subprocess.Popen(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    print(f"started {name}; log: {log_path}")
  print("frontend: http://localhost:3000")
  print("api:      http://localhost:3000/api/health")


def main() -> None:
  parser = argparse.ArgumentParser(description="Prepare and optionally start the local Pacta app.")
  parser.add_argument("--start", action="store_true", help="start the Next.js frontend/API dev server after preparation")
  args = parser.parse_args()

  ensure_env()
  prepare_database()
  if args.start:
    start_dev_servers()


if __name__ == "__main__":
  try:
    main()
  except Exception as exc:
    print(f"local stack failed: {exc}", file=sys.stderr)
    raise
