from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key] = value
    return values


def request_json(url: str, service_role_key: str) -> object:
    request = urllib.request.Request(
        url,
        headers={
            "apikey": service_role_key,
            "authorization": f"Bearer {service_role_key}",
            "accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{url} returned HTTP {error.code}: {body}") from error


def main() -> None:
    env = load_env()
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bucket = env.get("SUPABASE_STORAGE_BUCKET", "pacta-evidence")

    if not supabase_url or not service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

    tables = [
        "users",
        "wallet_nonces",
        "sessions",
        "covenants",
        "covenant_participants",
        "bond_positions",
        "evidence_items",
        "evaluations",
        "reputation_events",
        "contract_events",
        "audit_logs",
    ]

    for table in tables:
        request_json(f"{supabase_url}/rest/v1/{table}?select=*&limit=1", service_role_key)
        print(f"table ok: {table}")

    bucket_result = request_json(f"{supabase_url}/storage/v1/bucket/{bucket}", service_role_key)
    if not isinstance(bucket_result, dict) or bucket_result.get("name") != bucket:
        raise RuntimeError(f"Storage bucket {bucket} was not found")
    print(f"bucket ok: {bucket}")
    print("Supabase runtime check passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Supabase runtime check failed: {exc}", file=sys.stderr)
        raise
