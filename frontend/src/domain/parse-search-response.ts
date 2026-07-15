import type { JobResult, SearchMeta, SearchResponse } from "./job-result";

export class MalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedResponseError";
  }
}

/**
 * Validate that `json` has the top-level SearchResponse envelope shape
 * (`data` is an array, `meta` carries numeric total_records/limit/offset).
 * Individual JobResult fields are NOT deep-validated here — they are already
 * all-nullable/permissive by contract, and mapJobResult (Field_Mapper)
 * defensively coalesces every field, so a per-record shape mismatch cannot
 * crash the mapping step. Throws MalformedResponseError when the envelope
 * itself does not match (Requirement 5.2 — "cannot be parsed into the
 * expected shape").
 */
export function parseSearchResponse(json: unknown): SearchResponse {
  if (typeof json !== "object" || json === null) {
    throw new MalformedResponseError("Response body is not an object");
  }
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.data)) {
    throw new MalformedResponseError("Response body is missing a data array");
  }
  const meta = obj.meta as Record<string, unknown> | undefined;
  if (
    typeof meta !== "object" ||
    meta === null ||
    typeof meta.total_records !== "number" ||
    typeof meta.limit !== "number" ||
    typeof meta.offset !== "number"
  ) {
    throw new MalformedResponseError("Response body has an invalid meta object");
  }
  return { data: obj.data as JobResult[], meta: meta as unknown as SearchMeta };
}
