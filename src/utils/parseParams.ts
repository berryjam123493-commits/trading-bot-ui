import type { DetectedParam } from "../types";

/**
 * 코드에서 # === BUY PARAMS === / # === SELL PARAMS === 블록을 찾아
 * 그 안의 `NAME = number` 형태 라인을 파라미터로 추출한다.
 *
 * 예시 코드:
 *   # === BUY PARAMS ===
 *   FAST_PERIOD = 20
 *   SLOW_PERIOD = 50
 *   # === SELL PARAMS ===
 *   STOP_LOSS_PCT = 0.05
 */
export function parseParams(code: string): DetectedParam[] {
  const lines = code.split("\n");
  const result: DetectedParam[] = [];
  let currentKind: "buy" | "sell" | null = null;

  const headerRegex = /^\s*#\s*=+\s*(BUY|SELL)\s+PARAMS\s*=+\s*$/i;
  const assignRegex = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*([-+]?\d*\.?\d+)\s*(?:#.*)?$/;
  const sectionEndRegex = /^\s*#\s*=+\s*\w+\s*=+\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const header = line.match(headerRegex);
    if (header) {
      currentKind = header[1].toLowerCase() as "buy" | "sell";
      continue;
    }

    // 다른 섹션 헤더(예: # === MAIN ===) 만나면 섹션 종료
    if (currentKind && sectionEndRegex.test(line) && !headerRegex.test(line)) {
      currentKind = null;
      continue;
    }

    if (!currentKind) continue;

    const m = line.match(assignRegex);
    if (m) {
      result.push({
        name: m[1],
        value: Number(m[2]),
        line: i + 1,
        kind: currentKind,
        raw: line,
      });
    }
  }

  return result;
}

/** 사용자가 파라미터 값을 수정하면 코드의 해당 라인을 업데이트한다. */
export function applyParamChanges(
  code: string,
  changes: { line: number; name: string; newValue: number }[]
): string {
  const lines = code.split("\n");
  for (const c of changes) {
    const idx = c.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const orig = lines[idx];
    // 주석 보존
    const commentMatch = orig.match(/(\s*#.*)$/);
    const trailingComment = commentMatch ? commentMatch[1] : "";
    // 값만 교체
    lines[idx] = `${c.name} = ${c.newValue}${trailingComment}`;
  }
  return lines.join("\n");
}
