/**
 * 파이썬 전략 코드에서 티커 심볼을 추출한다.
 *
 * 전략:
 * 1) `SYMBOLS = [...]`, `TICKERS = [...]` 같은 명시적 리스트 우선
 * 2) 그 외에도 모든 문자열 리터럴 중 "티커처럼 보이는 것" 스캔
 *    (대문자 2~5 글자, 선택적으로 `.` + 거래소 접미사)
 * 3) 흔한 비-티커 대문자 단어는 제외 (BUY, SELL 등)
 */

const EXCLUDE_WORDS = new Set([
  "BUY",
  "SELL",
  "HOLD",
  "LONG",
  "SHORT",
  "OPEN",
  "CLOSE",
  "HIGH",
  "LOW",
  "OHLC",
  "OHLCV",
  "VOLUME",
  "DATE",
  "TIME",
  "BAR",
  "NAN",
  "NULL",
  "NONE",
  "TRUE",
  "FALSE",
  "OK",
  "INFO",
  "WARN",
  "ERROR",
  "DEBUG",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "KRW",
  "CNY",
  "CAD",
  "AUD",
  "PARAMS",
  "UTC",
  "EST",
  "PST",
  "KST",
]);

/** 단일 문자열이 티커처럼 보이는지. */
function looksLikeTicker(s: string): boolean {
  // 2~5 대문자, 선택적 `.XX` 접미사 (BRK.B 등)
  return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(s) && !EXCLUDE_WORDS.has(s) && s.length >= 2;
}

export function extractTickers(code: string): string[] {
  const tickers = new Set<string>();

  // 1) SYMBOLS/TICKERS 리스트
  const listPattern = /(?:SYMBOLS|TICKERS|UNIVERSE|WATCHLIST)\s*=\s*\[([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = listPattern.exec(code)) !== null) {
    const inside = m[1];
    const strs = inside.matchAll(/["']([^"']+)["']/g);
    for (const s of strs) {
      const t = s[1].trim().toUpperCase();
      if (looksLikeTicker(t)) tickers.add(t);
    }
  }

  // 2) 모든 문자열 리터럴 스캔 (주석은 무시)
  const stripped = stripComments(code);
  const strPattern = /["']([^"']+)["']/g;
  while ((m = strPattern.exec(stripped)) !== null) {
    const t = m[1].trim();
    if (looksLikeTicker(t)) tickers.add(t);
  }

  return [...tickers].sort();
}

/** 여러 봇 코드로부터 티커를 모아서 중복 제거한다. */
export function extractTickersFromBots(
  bots: { id: string; name: string; code: string }[]
): { ticker: string; bots: { id: string; name: string }[] }[] {
  const bySymbol = new Map<string, { id: string; name: string }[]>();
  for (const bot of bots) {
    const ts = extractTickers(bot.code);
    for (const t of ts) {
      if (!bySymbol.has(t)) bySymbol.set(t, []);
      bySymbol.get(t)!.push({ id: bot.id, name: bot.name });
    }
  }
  return [...bySymbol.entries()]
    .map(([ticker, bots]) => ({ ticker, bots }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/** 파이썬 `#` 한 줄 주석 제거. 완벽하지 않지만 대충 걸러냄. */
function stripComments(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      // 따옴표 안의 # 은 제거하지 않도록 간단 처리
      let inStr: string | null = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inStr) {
          if (ch === inStr && line[i - 1] !== "\\") inStr = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inStr = ch;
          continue;
        }
        if (ch === "#") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
}
