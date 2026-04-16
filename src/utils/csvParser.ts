/**
 * 주가 CSV 파일 파서 + 티커 라벨 검증.
 *
 * 지원 포맷 (Yahoo / Investing.com / Stooq 등 흔한 CSV):
 *   Date,Open,High,Low,Close,Adj Close,Volume
 *   Ticker,Date,Close
 *   Symbol,Date,Close,...
 *
 * 파싱 규칙:
 * - 첫 줄은 헤더 (대소문자 무시)
 * - Date 컬럼 필수 (YYYY-MM-DD / MM/DD/YYYY / DD/MM/YYYY 허용)
 * - Close 또는 Adj Close 컬럼 필수
 * - Ticker/Symbol 컬럼이 있으면 모든 값이 기대한 티커와 일치해야 함
 */

import type { DailyClose } from "../data/validationData";

export interface ParseResult {
  ok: boolean;
  data?: DailyClose[];
  /** 에러 메시지 (사용자에게 그대로 노출 가능). */
  error?: string;
  /** CSV 내에서 감지된 티커 (있을 때). */
  detectedTicker?: string;
  /** 파싱된 행 수. */
  rowCount?: number;
  /** 파싱된 데이터의 날짜 범위. */
  range?: { start: string; end: string };
}

/**
 * CSV 텍스트를 파싱하고, 기대하는 티커 라벨과 일치하는지 검증.
 *
 * @param text CSV 원문 텍스트
 * @param expectedTicker 이 CSV 가 속해야 할 티커 (대문자)
 */
export function parseTickerCsv(
  text: string,
  expectedTicker: string
): ParseResult {
  const expected = expectedTicker.trim().toUpperCase();
  const lines = text
    .replace(/^\uFEFF/, "") // BOM
    .trim()
    .split(/\r?\n/);

  if (lines.length < 2) {
    return { ok: false, error: "CSV 에 데이터 행이 없습니다." };
  }

  const header = splitCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const dateIdx = header.findIndex(
    (h) => h === "date" || h === "timestamp" || h === "day"
  );
  const closeIdx = findClose(header);
  const tickerIdx = header.findIndex(
    (h) => h === "ticker" || h === "symbol" || h === "code"
  );

  if (dateIdx < 0) {
    return {
      ok: false,
      error: `'Date' 컬럼을 찾을 수 없습니다. 현재 헤더: [${header.join(", ")}]`,
    };
  }
  if (closeIdx < 0) {
    return {
      ok: false,
      error: `'Close' 또는 'Adj Close' 컬럼을 찾을 수 없습니다. 현재 헤더: [${header.join(", ")}]`,
    };
  }

  const rows: DailyClose[] = [];
  const tickersInFile = new Set<string>();
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cells = splitCsvLine(raw);
    if (cells.length <= Math.max(dateIdx, closeIdx)) {
      skipped++;
      continue;
    }
    const date = normalizeDate(cells[dateIdx]);
    const close = parseFloat(cells[closeIdx]);
    if (!date || isNaN(close)) {
      skipped++;
      continue;
    }
    if (tickerIdx >= 0 && cells.length > tickerIdx) {
      const tk = cells[tickerIdx].trim().toUpperCase();
      if (tk) tickersInFile.add(tk);
    }
    rows.push({ date, close: Math.round(close * 100) / 100 });
  }

  // 티커 검증
  if (tickerIdx >= 0) {
    if (tickersInFile.size === 0) {
      return {
        ok: false,
        error: "CSV 에 Ticker 컬럼이 있으나 값이 모두 비어있습니다.",
      };
    }
    if (tickersInFile.size > 1) {
      return {
        ok: false,
        error: `CSV 에 서로 다른 티커가 섞여 있습니다: ${[...tickersInFile].join(", ")}. 종목별로 파일을 분리해주세요.`,
      };
    }
    const found = [...tickersInFile][0];
    if (found !== expected) {
      return {
        ok: false,
        detectedTicker: found,
        error: `CSV 내 티커(${found}) 가 선택된 종목(${expected}) 과 일치하지 않습니다. 올바른 파일을 선택했는지 확인해주세요.`,
      };
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: "유효한 행이 하나도 없습니다." };
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    ok: true,
    data: rows,
    detectedTicker: tickerIdx >= 0 ? [...tickersInFile][0] : undefined,
    rowCount: rows.length,
    range: { start: rows[0].date, end: rows[rows.length - 1].date },
  };
}

function findClose(header: string[]): number {
  // Adj Close 를 Close 보다 우선
  const adj = header.findIndex(
    (h) => h === "adj close" || h === "adjclose" || h === "adj_close"
  );
  if (adj >= 0) return adj;
  return header.findIndex((h) => h === "close" || h === "closing price");
}

/** CSV 한 줄을 split 하되 따옴표 안의 쉼표는 무시. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** 다양한 날짜 포맷을 YYYY-MM-DD 로 정규화. 실패시 "". */
function normalizeDate(raw: string): string {
  const s = raw.trim().replace(/"/g, "");
  if (!s) return "";
  // YYYY-MM-DD 또는 YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    const [, y, mo, d] = iso;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    const [, mo, d, y] = us;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD-MM-YYYY
  const eu = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})/);
  if (eu) {
    const [, d, mo, y] = eu;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // fallback: JS Date
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}
