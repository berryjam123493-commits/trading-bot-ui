/**
 * 로컬 검증 데이터 스토어.
 *
 * 동작:
 * - 메모리 상태로 사용자가 추가한 티커와 업로드된 CSV 데이터를 보관
 * - CSV 업로드만 localStorage 에 영속화 (합성 샘플은 영속화 X - 용량 낭비)
 * - `getLocalData(sym)` 은 사용자 업로드 → 합성 샘플 → undefined 순으로 조회
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  validationData as seedData,
  type DailyClose,
  LOCAL_RANGE,
} from "./validationData";

export type DataSource = "uploaded" | "synthetic" | "none";

export interface TickerInfo {
  ticker: string;
  source: DataSource;
  rowCount: number;
  range?: { start: string; end: string };
}

interface ValidationStoreValue {
  /** 사용자가 추가/감지한 모든 티커 (업로드 없이 감지만 된 것도 포함). */
  tickers: string[];
  /** 티커별 상세 상태 (업로드/합성/없음). */
  statusOf: (symbol: string) => TickerInfo;
  /** 업로드된 데이터 (있을 때만). */
  userData: Record<string, DailyClose[]>;
  /** 전체 종목에 대한 실제 데이터 조회 (업로드 우선, 합성 폴백). */
  getLocalData: (symbol: string) => DailyClose[] | undefined;
  addTicker: (symbol: string) => void;
  removeTicker: (symbol: string) => void;
  setUploadedData: (symbol: string, data: DailyClose[]) => void;
  clearUploadedData: (symbol: string) => void;
  /** 합성 샘플 데이터 범위 (안내용). */
  syntheticRange: { start: string; end: string };
}

const STORAGE_KEY = "validationData.v1";
const TICKERS_KEY = "validationTickers.v1";

const Ctx = createContext<ValidationStoreValue | null>(null);

export function ValidationStoreProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<Record<string, DailyClose[]>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  const [tickers, setTickers] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(TICKERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallthrough
    }
    return Object.keys(seedData); // 초기엔 샘플 제공되는 종목들
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }, [userData]);

  useEffect(() => {
    localStorage.setItem(TICKERS_KEY, JSON.stringify(tickers));
  }, [tickers]);

  const getLocalData = useCallback(
    (symbol: string): DailyClose[] | undefined => {
      const key = symbol.trim().toUpperCase();
      return userData[key] ?? seedData[key];
    },
    [userData]
  );

  const statusOf = useCallback(
    (symbol: string): TickerInfo => {
      const key = symbol.trim().toUpperCase();
      const uploaded = userData[key];
      if (uploaded && uploaded.length > 0) {
        return {
          ticker: key,
          source: "uploaded",
          rowCount: uploaded.length,
          range: {
            start: uploaded[0].date,
            end: uploaded[uploaded.length - 1].date,
          },
        };
      }
      const synth = seedData[key];
      if (synth && synth.length > 0) {
        return {
          ticker: key,
          source: "synthetic",
          rowCount: synth.length,
          range: LOCAL_RANGE,
        };
      }
      return { ticker: key, source: "none", rowCount: 0 };
    },
    [userData]
  );

  const addTicker = useCallback((symbol: string) => {
    const key = symbol.trim().toUpperCase();
    if (!key) return;
    setTickers((prev) => (prev.includes(key) ? prev : [...prev, key].sort()));
  }, []);

  const removeTicker = useCallback((symbol: string) => {
    const key = symbol.trim().toUpperCase();
    setTickers((prev) => prev.filter((t) => t !== key));
    setUserData((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setUploadedData = useCallback((symbol: string, data: DailyClose[]) => {
    const key = symbol.trim().toUpperCase();
    setUserData((prev) => ({ ...prev, [key]: data }));
    setTickers((prev) => (prev.includes(key) ? prev : [...prev, key].sort()));
  }, []);

  const clearUploadedData = useCallback((symbol: string) => {
    const key = symbol.trim().toUpperCase();
    setUserData((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value: ValidationStoreValue = {
    tickers,
    statusOf,
    userData,
    getLocalData,
    addTicker,
    removeTicker,
    setUploadedData,
    clearUploadedData,
    syntheticRange: LOCAL_RANGE,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useValidationStore() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useValidationStore must be used within ValidationStoreProvider");
  return ctx;
}
