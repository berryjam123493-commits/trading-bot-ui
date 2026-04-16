import type { Bot, EquityPoint, TradeLogEntry } from "../types";

/**
 * 종목별 보유 상태.
 * FIFO 에 가까운 근사 평가(cost basis 를 평균 단가로 환산 후 차감) 방식.
 */
export interface Holding {
  symbol: string;
  qty: number;
  avgCost: number;        // 가중 평균 매입가
  lastPrice: number;      // 가장 최근 체결가 (매수/매도 무관)
  lastTimestamp: string;
  currentValue: number;   // qty * lastPrice
  returnPct: number;      // (lastPrice - avgCost) / avgCost * 100
  returnAbs: number;      // 평가손익 (절대값)
  botIds: string[];       // 이 종목을 거래한 봇 id 목록
}

/**
 * 거래 로그 1건에 어떤 봇에서 발생한 것인지 태그가 붙은 형태.
 * Bot.tradeLogs 는 bot id 를 저장하지 않아 원본 타입을 확장해서 쓴다.
 */
export interface TaggedTradeLog extends TradeLogEntry {
  botId: string;
  botName: string;
}

export interface PortfolioSnapshot {
  totalEquity: number;
  initialEquity: number;
  returnPct: number;
  returnAbs: number;
  holdings: Holding[];              // qty > 0 인 것만, 평가액 큰 순
  totalHoldingsValue: number;
  cash: number;                     // totalEquity - totalHoldingsValue (>=0)
  cashRatio: number;                // 0..1
  combinedEquityCurve: EquityPoint[];
  allTradeLogs: TaggedTradeLog[];   // 시간 내림차순
  allTradedSymbols: string[];       // 한 번이라도 거래한 종목(가나다순)
}

function buildCombinedEquityCurve(bots: Bot[]): EquityPoint[] {
  if (bots.length === 0) return [];

  const dates = new Set<string>();
  for (const b of bots) {
    for (const p of b.equityCurve) dates.add(p.date);
  }
  const sortedDates = Array.from(dates).sort();

  // 봇별 (date -> equity) 맵과 시작일
  const perBot = bots.map((b) => ({
    startDate: b.equityCurve[0]?.date ?? "",
    map: new Map(b.equityCurve.map((p) => [p.date, p.equity])),
  }));

  const lastKnown = new Array(bots.length).fill(0);
  const result: EquityPoint[] = [];
  for (const date of sortedDates) {
    let total = 0;
    for (let i = 0; i < perBot.length; i++) {
      const eq = perBot[i].map.get(date);
      if (eq !== undefined) lastKnown[i] = eq;
      // 봇이 시작된 이후 날짜에만 합산
      if (perBot[i].startDate && date >= perBot[i].startDate) {
        total += lastKnown[i];
      }
    }
    result.push({ date, equity: Math.round(total * 100) / 100 });
  }
  return result;
}

function computeHoldings(bots: Bot[]): Holding[] {
  interface Agg {
    qty: number;
    costBasis: number;   // 현재 보유 수량의 총 취득 원가
    lastPrice: number;
    lastTimestamp: string;
    botIds: Set<string>;
  }
  const bySymbol = new Map<string, Agg>();

  // 시간순 처리(과거→현재) 로 FIFO/평균단가 근사
  const allTrades: TaggedTradeLog[] = bots
    .flatMap((b) => b.tradeLogs.map((t) => ({ ...t, botId: b.id, botName: b.name })))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const t of allTrades) {
    let agg = bySymbol.get(t.symbol);
    if (!agg) {
      agg = {
        qty: 0,
        costBasis: 0,
        lastPrice: 0,
        lastTimestamp: "",
        botIds: new Set<string>(),
      };
      bySymbol.set(t.symbol, agg);
    }
    if (t.side === "buy") {
      agg.qty += t.qty;
      agg.costBasis += t.qty * t.price;
    } else if (agg.qty > 0) {
      // 보유 범위 안에서만 매도 (음수 포지션은 만들지 않음)
      const avgCost = agg.costBasis / agg.qty;
      const sellQty = Math.min(t.qty, agg.qty);
      agg.costBasis -= sellQty * avgCost;
      agg.qty -= sellQty;
    }
    if (t.timestamp > agg.lastTimestamp) {
      agg.lastTimestamp = t.timestamp;
      agg.lastPrice = t.price;
    }
    agg.botIds.add(t.botId);
  }

  return Array.from(bySymbol.entries())
    .filter(([, agg]) => agg.qty > 0)
    .map(([symbol, agg]) => {
      const avgCost = agg.qty > 0 ? agg.costBasis / agg.qty : 0;
      const currentValue = agg.qty * agg.lastPrice;
      const returnPct = avgCost > 0 ? ((agg.lastPrice - avgCost) / avgCost) * 100 : 0;
      const returnAbs = agg.qty * (agg.lastPrice - avgCost);
      return {
        symbol,
        qty: agg.qty,
        avgCost,
        lastPrice: agg.lastPrice,
        lastTimestamp: agg.lastTimestamp,
        currentValue,
        returnPct,
        returnAbs,
        botIds: Array.from(agg.botIds),
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);
}

export function computePortfolio(bots: Bot[]): PortfolioSnapshot {
  const combinedEquityCurve = buildCombinedEquityCurve(bots);
  const totalEquity = combinedEquityCurve.at(-1)?.equity ?? 0;
  const initialEquity = combinedEquityCurve[0]?.equity ?? 0;
  const returnPct = initialEquity ? (totalEquity / initialEquity - 1) * 100 : 0;
  const returnAbs = totalEquity - initialEquity;

  const holdings = computeHoldings(bots);
  const totalHoldingsValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  // 현금은 총평가 - 보유가치. 목업 데이터 특성상 음수가 될 수도 있어 0 으로 클램프.
  const cash = Math.max(0, totalEquity - totalHoldingsValue);
  const cashRatio = totalEquity > 0 ? cash / totalEquity : 0;

  const allTradeLogs: TaggedTradeLog[] = bots
    .flatMap((b) => b.tradeLogs.map((t) => ({ ...t, botId: b.id, botName: b.name })))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const allTradedSymbols = Array.from(
    new Set(allTradeLogs.map((t) => t.symbol))
  ).sort((a, b) => a.localeCompare(b));

  return {
    totalEquity,
    initialEquity,
    returnPct,
    returnAbs,
    holdings,
    totalHoldingsValue,
    cash,
    cashRatio,
    combinedEquityCurve,
    allTradeLogs,
    allTradedSymbols,
  };
}

export interface AssetDetail {
  symbol: string;
  holding: Holding | null;         // 현재 보유 없으면 null (과거에만 거래)
  trades: TaggedTradeLog[];        // 시간 내림차순
  valueOverTime: EquityPoint[];    // 마감 시점별 평가액 (qty * lastPrice)
  buysByMonth: Array<{ month: string; amount: number }>;
  sellsByMonth: Array<{ month: string; amount: number }>;
}

/**
 * 특정 종목 하나의 상세 계산.
 *
 * - 거래 시점별 포지션 qty/avgCost 를 재구성한다
 * - 거래가 발생한 날짜의 종가 = 마지막 체결가로 근사하여 valueOverTime 생성
 * - 월별 매수/매도 금액을 차트용으로 집계
 */
export function computeAssetDetail(bots: Bot[], symbol: string): AssetDetail {
  const trades: TaggedTradeLog[] = bots
    .flatMap((b) => b.tradeLogs.map((t) => ({ ...t, botId: b.id, botName: b.name })))
    .filter((t) => t.symbol === symbol)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (trades.length === 0) {
    return {
      symbol,
      holding: null,
      trades: [],
      valueOverTime: [],
      buysByMonth: [],
      sellsByMonth: [],
    };
  }

  // 포지션 재구성 + 일자별 평가액 스냅샷
  let qty = 0;
  let costBasis = 0;
  let lastPrice = 0;
  const valueMap = new Map<string, number>(); // date -> market value
  const botIds = new Set<string>();

  for (const t of trades) {
    if (t.side === "buy") {
      qty += t.qty;
      costBasis += t.qty * t.price;
    } else if (qty > 0) {
      const avgCost = costBasis / qty;
      const sellQty = Math.min(t.qty, qty);
      costBasis -= sellQty * avgCost;
      qty -= sellQty;
    }
    lastPrice = t.price;
    botIds.add(t.botId);
    const date = t.timestamp.slice(0, 10);
    valueMap.set(date, Math.round(qty * lastPrice * 100) / 100);
  }

  const valueOverTime = Array.from(valueMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, equity]) => ({ date, equity }));

  // 월별 매수/매도 금액 집계
  const buyMap = new Map<string, number>();
  const sellMap = new Map<string, number>();
  for (const t of trades) {
    const month = t.timestamp.slice(0, 7); // YYYY-MM
    const amount = t.qty * t.price;
    const target = t.side === "buy" ? buyMap : sellMap;
    target.set(month, (target.get(month) ?? 0) + amount);
  }
  const months = Array.from(
    new Set([...buyMap.keys(), ...sellMap.keys()])
  ).sort();
  const buysByMonth = months.map((m) => ({
    month: m,
    amount: Math.round((buyMap.get(m) ?? 0) * 100) / 100,
  }));
  const sellsByMonth = months.map((m) => ({
    month: m,
    amount: Math.round((sellMap.get(m) ?? 0) * 100) / 100,
  }));

  const avgCost = qty > 0 ? costBasis / qty : 0;
  const currentValue = qty * lastPrice;
  const returnPct = avgCost > 0 ? ((lastPrice - avgCost) / avgCost) * 100 : 0;
  const returnAbs = qty * (lastPrice - avgCost);

  const holding: Holding | null =
    qty > 0
      ? {
          symbol,
          qty,
          avgCost,
          lastPrice,
          lastTimestamp: trades.at(-1)?.timestamp ?? "",
          currentValue,
          returnPct,
          returnAbs,
          botIds: Array.from(botIds),
        }
      : null;

  return {
    symbol,
    holding,
    trades: trades.slice().reverse(), // 화면용: 최신 먼저
    valueOverTime,
    buysByMonth,
    sellsByMonth,
  };
}
