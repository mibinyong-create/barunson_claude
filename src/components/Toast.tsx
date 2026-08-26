"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "info" | "error";
type ToastContextValue = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastContextValue>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** 원본의 .toast 를 그대로 쓰는 전역 토스트 (1.8초 후 자동 소멸) */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 3200 : 1800);
  }, []);

  // 언마운트 시 남은 타이머를 정리한다.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    // show 는 useCallback([]) 으로 이미 안정된 참조라 별도 메모이제이션이 필요 없다.
    <ToastContext.Provider value={show}>
      {children}
      <div
        className={`toast${toast ? " show" : ""}${toast?.kind === "error" ? " toast-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast?.message ?? ""}
      </div>
    </ToastContext.Provider>
  );
}
