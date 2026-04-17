import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 종목별 색상 관리.
 *
 * 규칙:
 * - 현금은 항상 고정 연두(lime).
 * - 그 외 종목은 포트폴리오에 처음 나타났을 때 랜덤 색상을 배정하고,
 *   그 종목이 포트폴리오에서 사라지기 전까지 동일 색 유지.
 * - 사용자가 직접 골라서 바꾸면 그 선택을 우선.
 * - 설정값은 localStorage 에 저장 (UI 데모용).
 */

const STORAGE_KEY = "asset-colors-v1";
export const CASH_COLOR = "#84cc16"; // lime-500 ≈ 연두

export const CASH_KEY = "__CASH__";

/** 색상 피커에서 쓸 팔레트 + 랜덤 배정 풀 (연두는 현금 전용이라 제외) */
export const COLOR_PALETTE: string[] = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#d946ef", "#ec4899", "#64748b", "#78716c",
  "#fecaca", "#fed7aa", "#fde68a", "#fef08a", "#d9f99d", "#a7f3d0",
  "#a5f3fc", "#bfdbfe", "#c7d2fe", "#ddd6fe", "#f5d0fe", "#fbcfe8",
  "#991b1b", "#9a3412", "#92400e", "#854d0e", "#3f6212", "#065f46",
  "#155e75", "#1e40af", "#3730a3", "#5b21b6", "#86198f", "#9d174d",
];

/** 랜덤 배정용 풀 — 서로 구분이 명확한 채도 높은 색들 */
const RANDOM_POOL: string[] = [
  "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#10b981",
  "#eab308", "#6366f1", "#14b8a6", "#d946ef",
  "#0ea5e9", "#dc2626", "#7c3aed", "#db2777",
];

function loadMap(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function pickRandomColor(exclude: Set<string>): string {
  const available = RANDOM_POOL.filter((c) => !exclude.has(c));
  const pool = available.length > 0 ? available : RANDOM_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 현재 포트폴리오 보유 종목 리스트를 받아 종목별 색상 맵을 유지.
 * - 새 종목 → 랜덤 배정
 * - 사라진 종목 → 맵에서 제거 (다시 나타나면 새로 랜덤)
 * - 수동 override → setColor() 로 덮어쓰기
 */
export function useAssetColors(symbols: string[]) {
  const [map, setMap] = useState<Record<string, string>>(() => loadMap());

  // 심볼 리스트 안정화 (같은 구성이면 동일 레퍼런스 유지)
  const key = useMemo(() => [...symbols].sort().join("|"), [symbols]);

  useEffect(() => {
    setMap((prev) => {
      const next: Record<string, string> = {};
      const used = new Set<string>();

      // 기존 색상 유지
      for (const s of symbols) {
        if (prev[s]) {
          next[s] = prev[s];
          used.add(prev[s]);
        }
      }
      // 새 종목 랜덤 배정
      for (const s of symbols) {
        if (!next[s]) {
          next[s] = pickRandomColor(used);
          used.add(next[s]);
        }
      }

      // 포트폴리오 밖에 있는 키는 제거 (예외: CASH_KEY 가 혹시 저장돼 있어도 상관없음 → 현금은 고정 색 사용)
      const changed =
        Object.keys(next).length !== Object.keys(prev).length ||
        Object.entries(next).some(([k, v]) => prev[k] !== v) ||
        Object.keys(prev).some((k) => !(k in next) && k !== CASH_KEY);

      if (!changed) return prev;
      saveMap(next);
      return next;
    });
    // key만 의존 (symbols 레퍼런스 변경으로 인한 무한루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getColor = useCallback(
    (symbol: string): string => {
      if (symbol === CASH_KEY) return CASH_COLOR;
      return map[symbol] ?? "#64748b";
    },
    [map]
  );

  const setColor = useCallback((symbol: string, color: string) => {
    if (symbol === CASH_KEY) return; // 현금은 고정
    setMap((prev) => {
      if (prev[symbol] === color) return prev;
      const next = { ...prev, [symbol]: color };
      saveMap(next);
      return next;
    });
  }, []);

  return { getColor, setColor };
}
