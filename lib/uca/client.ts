import "server-only";

// Server-only klient pro Universal Content API (https://content-api.darbujan.com).
// Žádná projekt-specifická byznys logika tady — jen HTTP mechanika sdílená
// napříč records/media. Token se čte líné (ne na top-level modulu), aby
// chybějící env proměnná nikdy nerozbila build — jen běhový request selže
// kontrolovaně (viz UcaError).
//
// `UCA_PROJECT_SLUG` se nastavuje jednou přes env při založení projektu
// (viz .env.example) — jednotlivé collections (records/media) v UCA jsou
// vždy scoped pod tenhle jeden projekt.

export class UcaError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UcaError";
    this.status = status;
  }
}

function getConfig(): { baseUrl: string; projectSlug: string; token: string } {
  const baseUrl = process.env.UCA_BASE_URL;
  const projectSlug = process.env.UCA_PROJECT_SLUG;
  const token = process.env.UCA_API_TOKEN;

  if (!baseUrl || !projectSlug || !token) {
    throw new UcaError(
      "Universal Content API není nakonfigurované (chybí UCA_BASE_URL / UCA_PROJECT_SLUG / UCA_API_TOKEN)."
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), projectSlug, token };
}

async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UcaError("Universal Content API neodpovídá včas.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body?.error?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 20_000;

/** JSON request (create record, read) — no-store, volitelný Next cache revalidate pro čtení. */
export async function ucaJsonRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number; revalidateSeconds?: number }
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return withTimeout(timeoutMs, async (signal) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal,
      ...(init.revalidateSeconds !== undefined
        ? { next: { revalidate: init.revalidateSeconds } }
        : { cache: "no-store" as const }),
    });

    if (!response.ok) {
      throw new UcaError(await parseErrorBody(response), response.status);
    }

    return (await response.json()) as T;
  });
}

/** Multipart upload (media) — vlastní Content-Type nastavuje fetch (boundary), nikdy ruční hlavička. */
export async function ucaUploadRequest<T>(
  path: string,
  formData: FormData,
  timeoutMs: number = DEFAULT_UPLOAD_TIMEOUT_MS
): Promise<T> {
  const { baseUrl, token } = getConfig();

  return withTimeout(timeoutMs, async (signal) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new UcaError(await parseErrorBody(response), response.status);
    }

    return (await response.json()) as T;
  });
}

export function recordsPath(collection: string, suffix = ""): string {
  const { projectSlug } = getConfig();
  return `/api/v1/projects/${projectSlug}/collections/${collection}/records${suffix}`;
}

export function mediaPath(): string {
  const { projectSlug } = getConfig();
  return `/api/v1/projects/${projectSlug}/media`;
}
