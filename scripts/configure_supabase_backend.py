from __future__ import annotations

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def upsert(path: Path, values: dict[str, str]) -> None:
  existing = path.read_text(encoding="utf-8") if path.exists() else ""
  lines = existing.splitlines()
  seen: set[str] = set()
  output: list[str] = []

  for line in lines:
    if "=" not in line or line.lstrip().startswith("#"):
      output.append(line)
      continue
    key = line.split("=", 1)[0]
    if key in values:
      output.append(f"{key}={values[key]}")
      seen.add(key)
    else:
      output.append(line)

  missing = [key for key in values if key not in seen]
  if missing and output and output[-1].strip():
    output.append("")
  for key in missing:
    output.append(f"{key}={values[key]}")

  path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8", newline="\n")


def main() -> None:
  parser = argparse.ArgumentParser(description="Configure Pacta for a Supabase backend project.")
  parser.add_argument("--project-ref", required=True)
  parser.add_argument("--supabase-url", required=True)
  parser.add_argument("--anon-key", required=True)
  parser.add_argument("--service-role-key", required=True)
  parser.add_argument("--storage-bucket", default="pacta-evidence")
  args = parser.parse_args()

  values = {
    "BACKEND_PROVIDER": "supabase",
    "STORAGE_PROVIDER": "supabase",
    "SUPABASE_PROJECT_REF": args.project_ref,
    "SUPABASE_URL": args.supabase_url,
    "SUPABASE_ANON_KEY": args.anon_key,
    "SUPABASE_SERVICE_ROLE_KEY": args.service_role_key,
    "SUPABASE_STORAGE_BUCKET": args.storage_bucket,
    "NEXT_PUBLIC_SUPABASE_URL": args.supabase_url,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": args.anon_key,
  }
  upsert(ROOT / ".env", values)
  print("Supabase backend configuration written to .env")


if __name__ == "__main__":
  main()
