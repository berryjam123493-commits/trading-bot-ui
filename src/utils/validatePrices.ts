/**
 * 웹에서 가져온 시세와 로컬 검증 데이터셋을 비교하여
 * 백테스트를 실제로 돌려도 되는지 판정한다.
 *
 * 규칙:
 * 1) 로컬에 해당 종목 데이터가 없으면 → no_local_data
 * 2) 로컬 데이터 범위와 백테스트 기간이 겹치지 않으면 → no_overlap
 *    (에러 메시지에 로컬 범위 포함 → 사용자가 기간 조정 가능)
 * 3) 겹치는 기간에서 종가가 허용오차 밖이면 → price_mismatch
 * 4) 모두 통과 시 ok
 */

import type { DailyBar } from "../data/marketData";
import type { DailyClose } from "../data/validationData";

export type FailureReason =
  | "no_local_data"
  | "no_overlap"
  | "price_mismatch"
  | "fetch_failed";

export interface Mismatch {
  date: string;
  localClose: number;
  fetchedClose: number;
  diffPct: number;
}

export interface ValidationResult {
  symbol: string;
  ok: boolean;
  reason?: FailureReason;
  /** 겹친 비교 일 수. */
  overlapDays?: number;
  /** 최초 허용오차 초과 케이스 (최대 5개). */
  mismatches?: Mismatch[];
  /** 로컬 데이터 범위 (no_overlap 일 때 보여줌). */
  localRange?: { start: string; end: string };
  /** fetch 에러 발생 시 세부. */
  fetchError?: string;
}

/**
 * 단일 종목 가격 검증.
 *
 * @param tolerance 허용 상대 오차. 예: 0.02 → 2%
 */
export function validatePrices(
  symbol: string,
  fetchedBars: DailyBar[] | undefined,
  localData: DailyClose[] | undefined,
  backtestStart: string,
  backtestEnd: string,
  tolerance = 0.02,
  fetchError?: string
): ValidationResult {
  if (fetchError) {
    return { symbol, ok: false, reason: "fetch_failed", fetchError };
  }
  if (!localData || localData.length === 0) {
    return { symbol, ok: false, reason: "no_local_data" };
  }

  const localStart = localData[0].date;
  const localEnd = localData[localData.length - 1].date;

  // 백테스트 기간과 로컬 범위 교집합
  const overlapStart = backtestStart > localStart ? backtestStart : localStart;
  const overlapEnd = backtestEnd < localEnd ? backtestEnd : localEnd;

  if (overlapStart > overlapEnd) {
    return {
      symbol,
      ok: false,
      reason: "no_overlap",
      localRange: { start: localStart, end: localEnd },
    };
  }

  if (!fetchedBars || fetchedBars.length === 0) {
    return { symbol, ok: false, reason: "fetch_failed", fetchError: "empty bars" };
  }

  // 로컬 날짜 → close 맵
  const localMap = new Map(localData.map((p) => [p.date, p.close]));
  const mismatches: Mismatch[] = [];
  let overlap = 0;

  for (const bar of fetchedBars) {
    if (bar.date < overlapStart || bar.date > overlapEnd) continue;
    const localClose = localMap.get(bar.date);
    if (localClose == null) continue;
    overlap++;
    const diff = Math.abs(localClose - bar.close) / localClose;
    if (diff > tolerance) {
      if (mismatches.length < 5) {
        mismatches.push({
          date: bar.date,
          localClose,
          fetchedClose: bar.close,
          diffPct: diff * 100,
        });
      }
    }
  }

  if (overlap === 0) {
    // 겹치는 거래일이 하나도 없다면 범위상 겹쳐도 실질 겹침 없음
    return {
      symbol,
      ok: false,
      reason: "no_overlap",
      localRange: { start: localStart, end: localEnd },
    };
  }

  // mismatches 가 있는 순간 실패로 본다 (first-fail 전략)
  // 단, 일정 비율 이하면 통과시키는 완화 정책은 향후 옵션화 가능.
  if (mismatches.length > 0) {
    return {
      symbol,
      ok: false,
      reason: "price_mismatch",
      overlapDays: overlap,
      mismatches,
      localRange: { start: localStart, end: localEnd },
    };
  }

  return {
    symbol,
    ok: true,
    overlapDays: overlap,
    localRange: { start: localStart, end: localEnd },
  };
}
