"use client";
import { localFetch } from "./local-api";
import { saveFile } from "./save-file";

/**
 * Client-side request helpers. Throw ApiError (with field errors) on failure.
 * Requests are answered on the device by the local API (./local-api) — the
 * same `/api/...` routes the app used to call over the network.
 */

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

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await localFetch(url, init);
  } catch (err) {
    console.error("[local-api]", err);
    throw new ApiError("Something went wrong. Please try again.", 500);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await request(url, { headers: { Accept: "application/json" } }));
}

export async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  return handle<T>(
    await request(url, {
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

/**
 * Produce a file (e.g. a CSV/JSON export) from the local API and hand it to
 * the user — the share sheet on the phone, a download in a browser. Returns
 * true on success.
 */
export async function downloadFile(url: string, onError: (message: string) => void): Promise<boolean> {
  try {
    const res = await localFetch(url);
    if (!res.ok) {
      let message = `Export failed (${res.status})`;
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
    return await saveFile(match?.[1] ?? "download", blob);
  } catch {
    onError("Could not create the file. Please try again.");
    return false;
  }
}
