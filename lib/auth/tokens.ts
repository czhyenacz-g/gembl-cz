import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Standardní node:crypto primitiva (CSPRNG + SHA-256), žádná vlastní
// kryptografie. Token se posílá uživateli v odkazu, do DB se ukládá jen
// jeho hash (viz magic-link.ts) — únik databáze tak sám o sobě nedá
// nikomu platný přihlašovací odkaz.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
