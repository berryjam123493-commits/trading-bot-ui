/**
 * 프론트엔드용 백테스트 시뮬레이터.
 *
 * 현 단계에서는 실제 Python 코드를 실행하지 않고, 간단한 SMA 20/50 크로스오버
 * 전략을 fetched bar 데이터 위에서 돌려 거래 로그/에쿼티 커브를 만든다.
 * (백엔드 연동 전의 데모·UI용)
 *
 * 결과 로그는 거래별로 다음 필드를 갖는다:
 *   - timestamp, symbol, side, price, qty
 *   - cash: 체결 직후 현금 잔고
 *   - stockValue: 체결 직후 전체 종목의 주식 평가액 합계
 *   - totalAsset: stockValue + cash
 *   - cashRatio: cash / totalAsset (0~1)
 *   - returnPct: (totalAsset - initialCash) / initialCash * 100
 */

import type { DailyBar } from "../data/marketData";

export type TradeSide = "buy" | "sell";

export interface SimTradeLog {
  id: string;
  timestamp: string; // ISO
  date: string; // YYYY-MM-DD
  symbol: string;
  side: TradeSide;
  qty: number;
  price: number;
  /** 체결 직후 현금 잔고 */
  cash: number;
  /** 체결 직후 전체 주식 평가액 (cash 제외) */
  stockValue: number;
  /** cash + stockValue */
  totalAsset: number;
  /** cash / totalAsset (0 ~ 1) */
  cashRatio: number;
  /** (totalAsset - initialCash) / initialCash * 100 */
  returnPct: number;
  reason: string;
}

export interface SimEquityPoint {
  date: string;
  equity: number;
}

export interface SimResult {
  trades: SimTradeLog[];
  equity: SimEquityPoint[];
  finalAsset: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRate: number;
  totalTrades: number;
}

interface BarsBySymbol {
  [symbol: string]: DailyBar[];
}

/**
 * 매우 단순한 SMA20/50 크로스오버 백테스터.
 * - 매수 시점에 현금의 (1/종목수)를 해당 종목에 올-인 (분산)
 * - 매도 시점에 해당 종목 전량 청산
 */
export function simulateBacktest(
  barsBySymbol: BarsBySymbol,
  initialCash: number,
  fast = 20,
  slow = 50
): SimResult {
  const symbols = Object.keys(barsBySymbol);
  if (symbols.length === 0) {
    return {
      trades: [],
      equity: [],
      finalAsset: initialCash,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      winRate: 0,
      totalTrades: 0,
    };
  }

  // 날짜 축을 union 으로 생성 (모든 심볼에서 나타난 날짜의 합집합).
  const dateSet = new Set<string>();
  for (const s of symbols) {
    for (const b of barsBySymbol[s]) dateSet.add(b.date);
  }
  const dates = [...dateSet].sort();

  // 심볼별 date → close 로 빠른 조회.
  const priceMap: Record<string, Record<string, number>> = {};
  for (const s of symbols) {
    priceMap[s] = {};
    for (const b of barsBySymbol[s]) priceMap[s][b.date] = b.close;
  }

  const holdings: Record<string, { qty: number; avgPrice: number }> = {};
  const closedTrades: { entry: number; exit: number }[] = []; // 승률 계산용 (간이)
  const trades: SimTradeLog[] = [];
  const equity: SimEquityPoint[] = [];
  let cash = initialCash;
  let peak = initialCash;
  let maxDd = 0;
  let tradeId = 0;

  const slotCash = initialCash / symbols.length; // 신규 매수 시 한 종목이 쓸 수 있는 현금

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (i < slow) {
      // 이동평균이 준비 안 된 구간에도 에쿼티 포인트는 찍어준다.
      const eq = cash + valuation(holdings, priceMap, d);
      equity.push({ date: d, equity: round2(eq) });
      continue;
    }

    for (const s of symbols) {
      const bars = barsBySymbol[s];
      const idx = bars.findIndex((b) => b.date === d);
      if (idx < slow) continue;

      const closePrev = bars[idx - 1].close;
      const closeNow = bars[idx].close;
      const fastPrev = sma(bars, idx - 1, fast);
      const fastNow = sma(bars, idx, fast);
      const slowPrev = sma(bars, idx - 1, slow);
      const slowNow = sma(bars, idx, slow);
      if (fastPrev == null || slowPrev == null || fastNow == null || slowNow == null) continue;

      const hasPosition = (holdings[s]?.qty ?? 0) > 0;

      // 골든 크로스 → 매수
      if (!hasPosition && fastPrev <= slowPrev && fastNow > slowNow) {
        const budget = Math.min(slotCash, cash);
        if (budget > closeNow) {
          const qty = Math.floor(budget / closeNow);
          if (qty > 0) {
            const cost = qty * closeNow;
            cash -= cost;
            holdings[s] = { qty, avgPrice: closeNow };
            const stockValue = valuation(holdings, priceMap, d);
            const totalAsset = cash + stockValue;
            trades.push({
              id: `tr${tradeId++}`,
              timestamp: `${d}T15:30:00Z`,
              date: d,
              symbol: s,
              side: "buy",
              qty,
              price: round2(closeNow),
              cash: round2(cash),
              stockValue: round2(stockValue),
              totalAsset: round2(totalAsset),
              cashRatio: totalAsset > 0 ? cash / totalAsset : 0,
              returnPct: ((totalAsset - initialCash) / initialCash) * 100,
              reason: `Golden cross (SMA${fast} > SMA${slow})`,
            });
          }
        }
      }

      // 데드 크로스 → 매도
      if (hasPosition && fastPrev >= slowPrev && fastNow < slowNow) {
        const pos = holdings[s]!;
        const proceeds = pos.qty * closeNow;
        cash += proceeds;
        closedTrades.push({
          entry: pos.avgPrice * pos.qty,
          exit: proceeds,
        });
        delete holdings[s];
        const stockValue = valuation(holdings, priceMap, d);
        const totalAsset = cash + stockValue;
        trades.push({
          id: `tr${tradeId++}`,
          timestamp: `${d}T15:30:00Z`,
          date: d,
          symbol: s,
          side: "sell",
          qty: pos.qty,
          price: round2(closeNow),
          cash: round2(cash),
          stockValue: round2(stockValue),
          totalAsset: round2(totalAsset),
          cashRatio: totalAsset > 0 ? cash / totalAsset : 0,
          returnPct: ((totalAsset - initialCash) / initialCash) * 100,
          reason: `Dead cross (SMA${fast} < SMA${slow})`,
        });
      }

      // 참조 방지 경고 제거
      void closePrev;
    }

    const totalAsset = cash + valuation(holdings, priceMap, d);
    equity.push({ date: d, equity: round2(totalAsset) });
    if (totalAsset > peak) peak = totalAsset;
    const dd = peak > 0 ? (totalAsset - peak) / peak : 0;
    if (dd < maxDd) maxDd = dd;
  }

  const finalAsset = equity.at(-1)?.equity ?? initialCash;
  const totalReturnPct = ((finalAsset - initialCash) / initialCash) * 100;
  const wins = closedTrades.filter((t) => t.exit > t.entry).length;
  const winRate =
    closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  return {
    trades,
    equity,
    finalAsset,
    totalReturnPct,
    maxDrawdownPct: maxDd * 100,
    winRate,
    totalTrades: trades.length,
  };
}

function valuation(
  holdings: Record<string, { qty: number; avgPrice: number }>,
  priceMap: Record<string, Record<string, number>>,
  date: string
): number {
  let total = 0;
  for (const [s, pos] of Object.entries(holdings)) {
    const price = priceMap[s]?.[date] ?? pos.avgPrice;
    total += pos.qty * price;
  }
  return total;
}

function sma(bars: DailyBar[], idx: number, period: number): number | null {
  if (idx + 1 < period) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += bars[i].close;
  return sum / period;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
