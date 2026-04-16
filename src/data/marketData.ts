/**
 * Yahoo Finance 시세 데이터 fetcher.
 *
 * dev 환경에서는 vite.config.ts 의 /yahoo 프록시를 통해 CORS 우회.
 * 응답 포맷은 Yahoo chart API v8.
 */

export interface DailyBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FetchResult {
  symbol: string;
  bars: DailyBar[];
}

/**
 * symbol 의 일봉 데이터를 [start, end] 범위로 가져온다.
 * start/end 는 YYYY-MM-DD.
 */
export async function fetchDailyBars(
  symbol: string,
  start: string,
  end: string
): Promise<FetchResult> {
  const period1 = Math.floor(new Date(start + "T00:00:00Z").getTime() / 1000);
  const period2 = Math.floor(new Date(end + "T23:59:59Z").getTime() / 1000);

  const url = `/yahoo/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();

  const result = json?.chart?.result?.[0];
  if (!result) {
    const err = json?.chart?.error?.description || "empty response";
    throw new Error(err);
  }

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const opens: (number | null)[] = quote.open ?? [];
  const highs: (number | null)[] = quote.high ?? [];
  const lows: (number | null)[] = quote.low ?? [];
  const closes: (number | null)[] = quote.close ?? [];
  const volumes: (number | null)[] = quote.volume ?? [];

  const bars: DailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue; // 결측 캔들 스킵
    const d = new Date(timestamps[i] * 1000);
    const date = d.toISOString().slice(0, 10);
    bars.push({
      date,
      open: opens[i] ?? close,
      high: highs[i] ?? close,
      low: lows[i] ?? close,
      close,
      volume: volumes[i] ?? 0,
    });
  }

  return { symbol, bars };
}

/** 다중 종목 병렬 fetch. 실패한 종목은 error 필드에 담아 반환. */
export async function fetchMultipleSymbols(
  symbols: string[],
  start: string,
  end: string
): Promise<
  { symbol: string; bars?: DailyBar[]; error?: string }[]
> {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchDailyBars(s.trim().toUpperCase(), start, end))
  );
  return results.map((r, i) => {
    const symbol = symbols[i].trim().toUpperCase();
    if (r.status === "fulfilled") {
      return { symbol, bars: r.value.bars };
    }
    return {
      symbol,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
