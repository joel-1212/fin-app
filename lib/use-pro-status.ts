"use client";

import { useEffect, useState } from "react";
import { getCachedProStatus, refreshProStatus, subscribeProStatus, type ProStatus } from "@/lib/entitlement";

/**
 * Pro かどうかを購読して返す。判定が済むまでは null。
 *
 * 購入直後や復元直後に、すでに開いている画面が無料表示のまま取り残されないよう、
 * アプリに戻ってきたとき（visibilitychange / focus）にも取り直す。
 */
export function useProStatus(): ProStatus | null {
  const [status, setStatus] = useState<ProStatus | null>(getCachedProStatus);

  useEffect(() => {
    const unsubscribe = subscribeProStatus(setStatus);
    const refresh = () => {
      void refreshProStatus().then(setStatus);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return status;
}
