"use client";

import useSWR from "swr";

const DETAIL_CACHE_TTL_MS = 60 * 1000; // 1 minute

type Fetcher<T> = () => Promise<T>;

/**
 * Client-side cache for detail fetches (e.g. getClienteDetail, getAmministratoreDetail).
 * Use when opening dialogs that load related record by ID so repeated opens are instant.
 */
export function useDetailQuery<T>(
  key: string | null,
  fetcher: Fetcher<T> | null,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false && !!key && !!fetcher;

  const { data, error, isLoading, mutate } = useSWR<T>(
    enabled ? key : null,
    () => fetcher!(),
    {
      revalidateOnFocus: false,
      dedupingInterval: DETAIL_CACHE_TTL_MS,
      keepPreviousData: true,
    }
  );

  return {
    data: data ?? null,
    error: error ?? null,
    isLoading: enabled && isLoading,
    mutate,
  };
}
