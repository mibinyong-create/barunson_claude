"use client";

import { useEffect, useState } from "react";

/** 값이 delay(ms) 동안 안정될 때까지 반영을 미룬다. 검색어 입력에 사용. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
