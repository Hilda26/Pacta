import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serviceUnavailable } from "./errors";

let localEnvCache: Record<string, string> | undefined;

export function requiredEnv(name: string) {
  const value = process.env[name] ?? localEnv()[name];
  if (!value) {
    throw serviceUnavailable(`${name} is not configured.`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string) {
  return process.env[name] ?? localEnv()[name] ?? fallback;
}

function localEnv() {
  if (localEnvCache) {
    return localEnvCache;
  }

  localEnvCache = {};
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", ".env")]) {
    if (!existsSync(candidate)) {
      continue;
    }

    for (const line of readFileSync(candidate, "utf-8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split("=");
      if (key && !(key in localEnvCache)) {
        localEnvCache[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  return localEnvCache;
}
