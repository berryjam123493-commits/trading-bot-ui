// 도메인 타입 정의

export type TradeMode = "paper" | "live";
export type BotStatus = "running" | "paused";
export type Language = "ko" | "en";
export type DeviceView = "desktop" | "mobile";
export type MainTab = "dashboard" | "bots" | "backtest" | "settings" | "help";
export type BotDetailTab = "dashboard" | "settings" | "code";
export type Theme = "light" | "dark";
export type SettingsSubTab = "general" | "validation";

export interface TradeLogEntry {
  id: string;
  timestamp: string;       // ISO
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  reason: string;
}

export interface EquityPoint {
  date: string;            // YYYY-MM-DD
  equity: number;
}

export interface Bot {
  id: string;
  name: string;
  mode: TradeMode;
  status: BotStatus;
  createdAt: string;
  code: string;            // Python 소스
  tradeLogs: TradeLogEntry[];
  equityCurve: EquityPoint[];
}

/** 코드에서 감지한 파라미터 하나. buy/sell 조건으로 분류됨. */
export interface DetectedParam {
  name: string;            // 변수명 (예: FAST_PERIOD)
  value: number;           // 현재 값
  line: number;            // 코드 내 줄 번호 (1-based)
  kind: "buy" | "sell";
  raw: string;             // 원본 라인 텍스트
}
