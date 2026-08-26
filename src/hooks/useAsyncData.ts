"use client";

import { useEffect, useState } from "react";

type Snapshot<T> = { key: string; data: T | null; error: string | null };

/**
 * key 가 바뀔 때마다 fetcher 를 실행하는 조회 훅.
 *
 * loading 을 별도 state 로 두지 않고 "마지막으로 응답이 도착한 key" 와 현재 key 를
 * 비교해 파생시킨다. 덕분에 이펙트 본문에서 동기적으로 setState 를 호출하지 않아
 * 연쇄 렌더링(react-hooks/set-state-in-effect)이 발생하지 않는다.
 *
 * fetcher 는 반드시 useCallback 으로 감싸서 넘길 것.
 */
export function useAsyncData<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled = true,
): { data: T | null; error: string | null; loading: boolean } {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setSnapshot({
          key,
          data: null,
          error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
        });
      });

    return () => controller.abort();
  }, [key, fetcher, enabled]);

  const fresh = snapshot?.key === key;
  return {
    data: fresh ? snapshot.data : null,
    error: fresh ? snapshot.error : null,
    loading: enabled && !fresh,
  };
}
