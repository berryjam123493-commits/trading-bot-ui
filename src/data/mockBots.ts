import type { Bot, EquityPoint, TradeLogEntry } from "../types";

// 가상의 수익률 곡선 생성 (랜덤 워크)
function genEquityCurve(
  startDate: string,
  days: number,
  start: number,
  drift: number,
  vol: number
): EquityPoint[] {
  const result: EquityPoint[] = [];
  const d0 = new Date(startDate);
  let equity = start;
  for (let i = 0; i < days; i++) {
    const ret = drift + (Math.random() - 0.5) * vol;
    equity = equity * (1 + ret);
    const d = new Date(d0);
    d.setDate(d0.getDate() + i);
    result.push({
      date: d.toISOString().slice(0, 10),
      equity: Math.round(equity * 100) / 100,
    });
  }
  return result;
}

function genTradeLogs(symbols: string[], count: number): TradeLogEntry[] {
  const reasons = [
    "골든크로스 (SMA20 > SMA50)",
    "데드크로스 (SMA20 < SMA50)",
    "RSI 과매도 반등",
    "익절 발동 (+15.2%)",
    "손절 발동 (-4.8%)",
  ];
  const logs: TradeLogEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const ts = new Date(now - daysAgo * 86400000);
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? "buy" : "sell";
    const price = 100 + Math.random() * 300;
    logs.push({
      id: `t${i}`,
      timestamp: ts.toISOString(),
      symbol: sym,
      side,
      qty: Math.floor(Math.random() * 20) + 1,
      price: Math.round(price * 100) / 100,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
    });
  }
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const SMA_CROSS_CODE = `"""SMA 골든/데드 크로스 전략.

매수: fast SMA 가 slow SMA 를 상향 돌파
매도: fast SMA 가 slow SMA 를 하향 돌파 + 손절/익절 라인
"""
import pandas as pd

# 운용 종목 유니버스
SYMBOLS = ["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"]

# === BUY PARAMS ===
FAST_PERIOD = 20
SLOW_PERIOD = 50
MIN_VOLUME = 100000

# === SELL PARAMS ===
STOP_LOSS_PCT = 0.05
TAKE_PROFIT_PCT = 0.15


def on_bar(symbol: str, history: pd.DataFrame):
    if len(history) < SLOW_PERIOD + 1:
        return []

    close = history["close"]
    fast = close.rolling(FAST_PERIOD).mean()
    slow = close.rolling(SLOW_PERIOD).mean()
    volume = history["volume"].iloc[-1]

    # 매수 조건: 골든크로스 + 거래량 필터
    if fast.iloc[-2] <= slow.iloc[-2] and fast.iloc[-1] > slow.iloc[-1]:
        if volume >= MIN_VOLUME:
            return [{"action": "BUY", "symbol": symbol, "price": close.iloc[-1]}]

    # 매도 조건: 데드크로스
    if fast.iloc[-2] >= slow.iloc[-2] and fast.iloc[-1] < slow.iloc[-1]:
        return [{"action": "SELL", "symbol": symbol, "price": close.iloc[-1]}]

    return []
`;

const RSI_MEAN_REVERT_CODE = `"""RSI 평균회귀 전략.

매수: RSI 가 과매도 구간 진입 후 반등
매도: RSI 가 과매수 구간 도달 또는 익절/손절
"""
import pandas as pd

# 운용 종목 유니버스 (ETF)
SYMBOLS = ["SPY", "QQQ", "IWM"]

# === BUY PARAMS ===
RSI_PERIOD = 14
RSI_OVERSOLD = 30
LOOKBACK_DAYS = 5

# === SELL PARAMS ===
RSI_OVERBOUGHT = 70
STOP_LOSS_PCT = 0.07
TAKE_PROFIT_PCT = 0.12


def rsi(series, period):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def on_bar(symbol, history):
    if len(history) < RSI_PERIOD + LOOKBACK_DAYS:
        return []

    r = rsi(history["close"], RSI_PERIOD)

    # 매수: 최근 LOOKBACK_DAYS 안에 과매도 진입 후 현재 RSI 가 반등 중
    recent_min = r.iloc[-LOOKBACK_DAYS:].min()
    if recent_min < RSI_OVERSOLD and r.iloc[-1] > r.iloc[-2]:
        return [{"action": "BUY", "symbol": symbol, "price": history["close"].iloc[-1]}]

    # 매도: 과매수
    if r.iloc[-1] > RSI_OVERBOUGHT:
        return [{"action": "SELL", "symbol": symbol, "price": history["close"].iloc[-1]}]

    return []
`;

export const mockBots: Bot[] = [
  {
    id: "bot-sma",
    name: "SMA Cross - Tech 5",
    mode: "paper",
    status: "running",
    createdAt: "2025-11-01T00:00:00Z",
    code: SMA_CROSS_CODE,
    tradeLogs: genTradeLogs(["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"], 24),
    equityCurve: genEquityCurve("2026-01-15", 90, 100000, 0.0015, 0.015),
  },
  {
    id: "bot-rsi",
    name: "RSI Mean Revert",
    mode: "live",
    status: "running",
    createdAt: "2025-12-20T00:00:00Z",
    code: RSI_MEAN_REVERT_CODE,
    tradeLogs: genTradeLogs(["SPY", "QQQ", "IWM"], 12),
    equityCurve: genEquityCurve("2026-01-15", 90, 50000, 0.0008, 0.02),
  },
];
