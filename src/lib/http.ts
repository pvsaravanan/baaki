"use client";

/** Client-side fetch helpers. Throw ApiError (with field errors) on failure. */

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: { error?: string; fields?: Record<string, string> } | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. an HTML error page from a proxy/gateway). Fall
      // through with data=null so we still raise an ApiError below instead of
      // an unhandled SyntaxError.
      data = null;
    }
  }
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data?.fields);
  }
  return data as T;
}

// Every form in the app disables its modal's close button while a request is
// in flight (so an in-flight save can't be silently abandoned) and only
// re-enables it once the request settles. Without a timeout, a hung request
// (dead connection, cold serverless start) never settles and the modal is
// stuck forever with no escape hatch. 20s is generous for this app's payload
// sizes but still short enough that a genuinely hung request doesn't trap
// the user indefinitely.
const REQUEST_TIMEOUT_MS = 20_000;

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out. Check your connection and try again.", 0);
    }
    throw new ApiError("Network error. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await timedFetch(url, { headers: { Accept: "application/json" } }));
}

export async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  return handle<T>(
    await timedFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export const apiPost = <T>(url: string, body?: unknown) => apiSend<T>(url, "POST", body);
export const apiPatch = <T>(url: string, body?: unknown) => apiSend<T>(url, "PATCH", body);
export const apiPut = <T>(url: string, body?: unknown) => apiSend<T>(url, "PUT", body);
export const apiDelete = <T>(url: string, body?: unknown) => apiSend<T>(url, "DELETE", body);

/** SWR default fetcher. */
export const swrFetcher = <T>(url: string) => apiGet<T>(url);

// Exports can legitimately take longer than a normal CRUD request on a large
// history — give it more room than the general request timeout above.
const DOWNLOAD_TIMEOUT_MS = 60_000;

/**
 * Fetch a file download (e.g. a CSV/JSON export) and save it via a blob link,
 * instead of a bare `<a href>` navigation — which would otherwise navigate
 * the whole tab away to a raw JSON/HTML error page if the request fails,
 * with no in-app feedback. Returns true on success.
 */
export async function downloadFile(url: string, onError: (message: string) => void): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      let message = `Download failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        /* non-JSON error body */
      }
      onError(message);
      return false;
    }
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") ?? "";
    const match = /filename="?([^";]+)"?/.exec(cd);
    const filename = match?.[1] ?? "download";
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    return true;
  } catch {
    onError("Could not download the file. Check your connection and try again.");
    return false;
  } finally {
    clearTimeout(timer);
  }
}
