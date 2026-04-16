/**
 * 사용자의 기존 10년치 로컬 검증 데이터.
 *
 * ⚠️ 이 파일의 샘플 데이터는 현실적인 가격대를 합성한 **플레이스홀더** 입니다.
 * 실제 사용 시에는 본인이 보유한 CSV/JSON 을 파싱해 이 구조로 대체하세요.
 *
 * 구조:
 *   validationData: { [SYMBOL]: DailyClose[] }
 *   - DailyClose: { date: "YYYY-MM-DD"; close: number }
 *
 * 범위: 2015-01-02 ~ 2025-12-31 (약 10년)
 */

export interface DailyClose {
  date: string;
  close: number;
}

/** 시드 기반 재현 가능한 의사 난수 (간이 LCG). */
function seededRand(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}

/**
 * 특정 시드와 기준가에서 출발해 일별 종가 시계열을 합성.
 * 랜덤 워크 + 약한 상승 드리프트.
 */
function synthesize(
  startDate: string,
  endDate: string,
  startPrice: number,
  drift: number,
  vol: number,
  seed: number
): DailyClose[] {
  const rand = seededRand(seed);
  const out: DailyClose[] = [];
  const d0 = new Date(startDate + "T00:00:00Z");
  const d1 = new Date(endDate + "T00:00:00Z");
  let price = startPrice;
  const cursor = new Date(d0);
  while (cursor <= d1) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      // 평일만 (주말 제외)
      const ret = drift + (rand() - 0.5) * vol;
      price = Math.max(1, price * (1 + ret));
      out.push({
        date: cursor.toISOString().slice(0, 10),
        close: Math.round(price * 100) / 100,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export const LOCAL_RANGE = {
  start: "2015-01-02",
  end: "2025-12-31",
};

/**
 * 2026-04 기준의 대략적 실제 주가와 근접하도록 앵커한 합성 샘플.
 * 실데이터 대체 지점. (실거래 전엔 반드시 실데이터로 교체할 것)
 */
export const validationData: Record<string, DailyClose[]> = {
  AAPL: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 27, 0.0007, 0.018, 1111),
  MSFT: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 46, 0.0009, 0.016, 2222),
  NVDA: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 5, 0.0022, 0.028, 3333),
  GOOGL: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 26, 0.0007, 0.017, 4444),
  TSLA: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 14, 0.0012, 0.034, 5555),
  SPY: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 205, 0.0005, 0.011, 6666),
  QQQ: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 100, 0.0007, 0.014, 7777),
  IWM: synthesize(LOCAL_RANGE.start, LOCAL_RANGE.end, 115, 0.0003, 0.015, 8888),
};

export function getLocalData(symbol: string): DailyClose[] | undefined {
  return validationData[symbol.trim().toUpperCase()];
}
