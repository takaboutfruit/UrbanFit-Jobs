// Feature: job-discovery-live-search
// The Job_Search_Client I/O layer: issues the live GET /search Search_Request
// and classifies network/HTTP/parse failures.

import type { SearchParams, SearchResponse } from "../domain";
import { MalformedResponseError, parseSearchResponse } from "../domain";

/**
 * Base URL for the backend API, read from `VITE_API_BASE_URL` so the
 * deployed URL can be overridden without a code change. Defaults to the
 * backend's default dev port when the env var is unset.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Base class for every Search_Request failure raised by this module. */
export class SearchRequestError extends Error {}

/** A `fetch()`-level failure (e.g. offline), distinct from an HTTP error status. */
export class NetworkError extends SearchRequestError {}

/** A non-2xx HTTP response from the Search_Endpoint. */
export class HttpStatusError extends SearchRequestError {
  constructor(public readonly status: number) {
    super(`Search request failed with HTTP ${status}`);
  }
}

/**
 * Issue one Search_Request. Rejects with:
 *   - the original `AbortError` (DOMException) when `signal` is aborted —
 *     callers distinguish this from a real failure and treat it as a
 *     Stale_Response, never surfacing it as an Error_State (Req 3.1, 3.2).
 *   - `NetworkError` on a `fetch()`-level failure (e.g. offline).
 *   - `HttpStatusError` on a non-2xx response.
 *   - `MalformedResponseError` (from parseSearchResponse) on an unparseable
 *     or wrong-shaped body.
 */
export async function fetchJobSearch(
  params: SearchParams,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const url = new URL("/search", API_BASE_URL);
  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lng", String(params.lng));
  url.searchParams.set("max_time", String(params.max_time));
  url.searchParams.set("sort", params.sort);
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("offset", String(params.offset));

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new NetworkError("Network request failed");
  }

  if (!res.ok) {
    throw new HttpStatusError(res.status);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new MalformedResponseError("Response body is not valid JSON");
  }

  return parseSearchResponse(json);
}
