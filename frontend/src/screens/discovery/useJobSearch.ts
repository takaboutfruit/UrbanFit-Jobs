// Feature: job-discovery-live-search
// useJobSearch — the orchestration hook (task 9).
//
// Combines the debounce, the isValidSearchInput validation gate, the
// generation-counter/AbortController stale-response guard, and the
// Field_Mapper into a single { jobs, status, retry } contract consumed by
// JobDiscoveryScreen.
//
// Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.3, 5.4

import { useEffect, useRef, useState } from "react";
import {
  SEARCH_DEBOUNCE_MS,
  buildSearchParams,
  isValidSearchInput,
  mapSearchResponse,
} from "../../domain";
import type { Coordinate, Job } from "../../domain";
import { fetchJobSearch } from "../../services/job-search-client";

export type SearchStatus = "loading" | "error" | "success";

export interface UseJobSearchResult {
  /**
   * Jobs mapped from the most recent non-stale successful response, or `[]`
   * before the first success.
   */
  jobs: Job[];
  /** Derived purely from the latest-generation outcome (Requirement 5). */
  status: SearchStatus;
  /**
   * Re-issues a Search_Request using the current `home`/`toleranceMinutes`,
   * bypassing the debounce wait (Requirement 5.3).
   */
  retry: () => void;
}

/**
 * Wires `home`/`toleranceMinutes` to the live `GET /search` endpoint.
 *
 * - Debounces every `home`/`toleranceMinutes` change (combined into one
 *   dependency) by `SEARCH_DEBOUNCE_MS`, so a change to both within the
 *   window collapses into one scheduled evaluation of the latest pair
 *   (Requirement 2.1-2.4).
 * - When the debounce timer fires, `isValidSearchInput` gates issuance: an
 *   invalid pair issues no request and leaves `jobs`/`status` unchanged
 *   (Requirement 1.5-1.7).
 * - Every issued request increments a generation counter and aborts the
 *   previous generation's still-pending `AbortController` (Requirement 3.1).
 * - Only the outcome whose generation matches the current generation at
 *   settle-time is applied; every other outcome (including an `AbortError`)
 *   is discarded with no state change (Requirement 3.2, 3.3).
 * - Runs once on mount with the initial `home`/`toleranceMinutes`
 *   (Requirement 1.2), and `retry()` re-runs the validate/issue steps
 *   immediately, bypassing the debounce wait (Requirement 5.3, 5.4).
 */
export function useJobSearch(
  home: Coordinate | null | undefined,
  toleranceMinutes: number,
): UseJobSearchResult {
  const [status, setStatus] = useState<SearchStatus>("loading");
  const [jobs, setJobs] = useState<Job[]>([]);

  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const homeRef = useRef(home);
  const toleranceRef = useRef(toleranceMinutes);

  homeRef.current = home;
  toleranceRef.current = toleranceMinutes;

  function issueRequest() {
    const currentHome = homeRef.current;
    const currentTolerance = toleranceRef.current;

    if (!isValidSearchInput(currentHome, currentTolerance)) {
      return;
    }

    if (controllerRef.current !== null) {
      controllerRef.current.abort();
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");

    const params = buildSearchParams(currentHome, currentTolerance);
    fetchJobSearch(params, controller.signal).then(
      (response) => {
        if (generationRef.current !== generation) {
          return;
        }
        setStatus("success");
        setJobs(mapSearchResponse(response));
      },
      (err) => {
        if (generationRef.current !== generation) {
          return;
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setStatus("error");
      },
    );
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      issueRequest();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.lat, home?.lng, toleranceMinutes]);

  function retry() {
    issueRequest();
  }

  return { jobs, status, retry };
}
