import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  PlayCircle,
  Sparkles,
  Send,
  FileCode,
  FilePlus,
  LineChart as LineIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Code2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MessageSquare,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import { useTheme } from "../theme/context";
import { useValidationStore } from "../data/validationStore";
import type { Bot } from "../types";
import { fetchMultipleSymbols, type DailyBar } from "../data/marketData";
import { validatePrices, type ValidationResult } from "../utils/validatePrices";
import { simulateBacktest, type SimTradeLog, type SimResult } from "../utils/simulateBacktest";
import { Abbr, HelpIcon } from "./Abbr";

interface Props {
  bots: Bot[];
}

const DEFAULT_NEW_CODE = `"""백테스트할 새 전략 코드를 여기에 작성하세요."""
import pandas as pd

SYMBOLS = ["AAPL", "MSFT", "NVDA"]

# === BUY PARAMS ===
FAST_PERIOD = 20
SLOW_PERIOD = 50

# === SELL PARAMS ===
STOP_LOSS_PCT = 0.05


def on_bar(symbol, history):
    if len(history) < SLOW_PERIOD:
        return []
    fast = history["close"].rolling(FAST_PERIOD).mean()
    slow = history["close"].rolling(SLOW_PERIOD).mean()
    if fast.iloc[-2] <= slow.iloc[-2] and fast.iloc[-1] > slow.iloc[-1]:
        return [{"action": "BUY", "symbol": symbol, "price": history["close"].iloc[-1]}]
    if fast.iloc[-2] >= slow.iloc[-2] and fast.iloc[-1] < slow.iloc[-1]:
        return [{"action": "SELL", "symbol": symbol, "price": history["close"].iloc[-1]}]
    return []
`;

type Phase = "idle" | "fetching" | "validating" | "running" | "success" | "error";
type FetchResp = { symbol: string; bars?: DailyBar[]; error?: string };
type PanelKey = "code" | "results" | "chat";

export function Backtesting({ bots }: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const validation = useValidationStore();

  const [source, setSource] = useState<"new" | string>("new");
  const [code, setCode] = useState(DEFAULT_NEW_CODE);
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [symbols, setSymbols] = useState("AAPL,MSFT,NVDA");
  const [initialCash, setInitialCash] = useState(100000);
  const [tolerance, setTolerance] = useState(2); // %

  const [phase, setPhase] = useState<Phase>("idle");
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [sim, setSim] = useState<SimResult | null>(null);

  // 패널 접기/펴기 상태 (데스크톱 전용)
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>({
    code: true,
    results: true,
    chat: true,
  });
  // 모바일: 3탭 전환
  const [mobileTab, setMobileTab] = useState<PanelKey>("results");

  // Claude 챗 (placeholder)
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const handleSourceChange = (s: string) => {
    setSource(s);
    if (s === "new") setCode(DEFAULT_NEW_CODE);
    else {
      const bot = bots.find((b) => b.id === s);
      if (bot) setCode(bot.code);
    }
  };

  const runBacktest = async () => {
    setSim(null);
    setValidations([]);
    setPhase("fetching");

    const symList = symbols
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (symList.length === 0) {
      setPhase("error");
      return;
    }

    // 1. 웹에서 시세 가져오기
    let fetched: FetchResp[];
    try {
      fetched = await fetchMultipleSymbols(symList, startDate, endDate);
    } catch (e) {
      setPhase("error");
      setValidations(
        symList.map((s) => ({
          symbol: s,
          ok: false,
          reason: "fetch_failed" as const,
          fetchError: e instanceof Error ? e.message : String(e),
        }))
      );
      return;
    }

    // 2. 로컬 10년치와 대조 검증
    setPhase("validating");
    await new Promise((r) => setTimeout(r, 300));

    const vResults = fetched.map((f) =>
      validatePrices(
        f.symbol,
        f.bars,
        validation.getLocalData(f.symbol),
        startDate,
        endDate,
        tolerance / 100,
        f.error
      )
    );
    setValidations(vResults);

    const allOk = vResults.every((v) => v.ok);
    if (!allOk) {
      setPhase("error");
      return;
    }

    // 3. 검증 통과 → 백테스트 실행 (프론트엔드 모의: SMA 20/50)
    setPhase("running");
    await new Promise((r) => setTimeout(r, 400));

    const barsBySymbol: Record<string, DailyBar[]> = {};
    for (const f of fetched) {
      if (f.bars) barsBySymbol[f.symbol] = f.bars;
    }
    const result = simulateBacktest(barsBySymbol, initialCash);
    setSim(result);
    setPhase("success");
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setChatHistory((h) => [
      ...h,
      { role: "user", content: chatMsg },
      { role: "assistant", content: t("claudeComingSoon") },
    ]);
    setChatMsg("");
  };

  // ─── 개별 패널 렌더러 ────────────────────────────────────────────
  const codePanel = (
    <CodePanel
      bots={bots}
      source={source}
      code={code}
      onSourceChange={handleSourceChange}
      onCodeChange={(v) => setCode(v ?? "")}
      monacoTheme={theme === "dark" ? "vs-dark" : "vs"}
    />
  );

  const resultsPanel = (
    <ResultsPanel
      startDate={startDate}
      endDate={endDate}
      symbols={symbols}
      initialCash={initialCash}
      tolerance={tolerance}
      phase={phase}
      validations={validations}
      sim={sim}
      isMobile={isMobile}
      localRange={validation.syntheticRange}
      onStartDate={setStartDate}
      onEndDate={setEndDate}
      onSymbols={setSymbols}
      onInitialCash={setInitialCash}
      onTolerance={setTolerance}
      onRun={runBacktest}
    />
  );

  const chatPanel = (
    <ChatPanel
      chatHistory={chatHistory}
      chatMsg={chatMsg}
      onChange={setChatMsg}
      onSend={sendChat}
      isMobile={isMobile}
    />
  );

  // ─── 헤더 ────────────────────────────────────────────────────────
  const header = (
    <div
      className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 ${
        isMobile ? "px-3 py-2" : "px-6 py-3"
      }`}
    >
      <LineIcon size={isMobile ? 16 : 18} className="text-brand-600 dark:text-brand-500" />
      <h2
        className={`font-semibold text-slate-900 dark:text-slate-100 ${
          isMobile ? "text-base" : "text-lg"
        }`}
      >
        {t("backtestTitle")}
      </h2>
    </div>
  );

  // ─── 모바일: 3탭 ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {header}
        <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <MobileTab
            active={mobileTab === "code"}
            onClick={() => setMobileTab("code")}
            icon={<Code2 size={14} />}
            label={t("code")}
          />
          <MobileTab
            active={mobileTab === "results"}
            onClick={() => setMobileTab("results")}
            icon={<BarChart3 size={14} />}
            label={t("result")}
          />
          <MobileTab
            active={mobileTab === "chat"}
            onClick={() => setMobileTab("chat")}
            icon={<MessageSquare size={14} />}
            label={t("askClaude")}
          />
        </div>
        <div className="flex-1 min-h-0">
          {mobileTab === "code" && codePanel}
          {mobileTab === "results" && resultsPanel}
          {mobileTab === "chat" && chatPanel}
        </div>
      </div>
    );
  }

  // ─── 데스크톱: 3 collapsible 패널 ─────────────────────────────────
  const colTemplate = [
    panels.code ? "minmax(320px, 1fr)" : "44px",
    panels.results ? "minmax(360px, 1.3fr)" : "44px",
    panels.chat ? "minmax(300px, 1fr)" : "44px",
  ].join(" ");

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {header}
      <div
        className="flex-1 min-h-0 grid"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <Panel
          title={t("code")}
          open={panels.code}
          onToggle={() => setPanels((p) => ({ ...p, code: !p.code }))}
          railIcon={<Code2 size={16} />}
          borderSide="right"
        >
          {codePanel}
        </Panel>
        <Panel
          title={t("result")}
          open={panels.results}
          onToggle={() => setPanels((p) => ({ ...p, results: !p.results }))}
          railIcon={<BarChart3 size={16} />}
          borderSide="right"
        >
          {resultsPanel}
        </Panel>
        <Panel
          title={t("askClaude")}
          open={panels.chat}
          onToggle={() => setPanels((p) => ({ ...p, chat: !p.chat }))}
          railIcon={<MessageSquare size={16} />}
        >
          {chatPanel}
        </Panel>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Panel wrapper (collapsible)
// ════════════════════════════════════════════════════════════════════

function Panel({
  title,
  open,
  onToggle,
  railIcon,
  children,
  borderSide,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  railIcon: React.ReactNode;
  children: React.ReactNode;
  borderSide?: "right";
}) {
  const borderCls =
    borderSide === "right" ? "border-r border-slate-200 dark:border-slate-700" : "";

  if (!open) {
    return (
      <aside
        className={`flex flex-col items-center py-2 gap-2 bg-white dark:bg-slate-800 ${borderCls}`}
      >
        <button
          onClick={onToggle}
          title={title}
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ChevronRight size={16} />
        </button>
        <span
          className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400"
          style={{ writingMode: "vertical-rl" }}
        >
          {title.toUpperCase()}
        </span>
        <span className="text-slate-400 dark:text-slate-500">{railIcon}</span>
      </aside>
    );
  }

  return (
    <section className={`flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-800 ${borderCls}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {railIcon}
          {title}
        </div>
        <button
          onClick={onToggle}
          title="collapse"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

function MobileTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 ${
        active
          ? "border-brand-600 text-brand-700 dark:text-brand-400"
          : "border-transparent text-slate-500 dark:text-slate-400"
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Code panel
// ════════════════════════════════════════════════════════════════════

function CodePanel({
  bots,
  source,
  code,
  onSourceChange,
  onCodeChange,
  monacoTheme,
}: {
  bots: Bot[];
  source: string;
  code: string;
  onSourceChange: (s: string) => void;
  onCodeChange: (v: string | undefined) => void;
  monacoTheme: "vs-dark" | "vs";
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => onSourceChange("new")}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium shrink-0 ${
            source === "new"
              ? "bg-brand-600 text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
          }`}
        >
          <FilePlus size={12} />
          {t("newCode")}
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">|</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {t("loadFromBot")}:
        </span>
        {bots.map((b) => (
          <button
            key={b.id}
            onClick={() => onSourceChange(b.id)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium shrink-0 ${
              source === b.id
                ? "bg-brand-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
            }`}
          >
            <FileCode size={12} />
            {b.name}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-[220px]">
        <Editor
          height="100%"
          language="python"
          theme={monacoTheme}
          value={code}
          onChange={onCodeChange}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Results panel (params + validation + summary + trade log + equity)
// ════════════════════════════════════════════════════════════════════

function ResultsPanel(props: {
  startDate: string;
  endDate: string;
  symbols: string;
  initialCash: number;
  tolerance: number;
  phase: Phase;
  validations: ValidationResult[];
  sim: SimResult | null;
  isMobile: boolean;
  localRange: { start: string; end: string };
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
  onSymbols: (v: string) => void;
  onInitialCash: (v: number) => void;
  onTolerance: (v: number) => void;
  onRun: () => void;
}) {
  const {
    startDate,
    endDate,
    symbols,
    initialCash,
    tolerance,
    phase,
    validations,
    sim,
    isMobile,
    localRange,
    onStartDate,
    onEndDate,
    onSymbols,
    onInitialCash,
    onTolerance,
    onRun,
  } = props;
  const { t } = useI18n();
  const running = phase === "fetching" || phase === "validating" || phase === "running";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* 파라미터 */}
      <div
        className={`px-3 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 grid gap-2.5 ${
          isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-5"
        }`}
      >
        <LabeledInput
          label={t("startDate")}
          type="date"
          value={startDate}
          onChange={onStartDate}
        />
        <LabeledInput
          label={t("endDate")}
          type="date"
          value={endDate}
          onChange={onEndDate}
        />
        <LabeledInput label={t("symbols")} value={symbols} onChange={onSymbols} />
        <LabeledInput
          label={t("initialCash")}
          type="number"
          value={String(initialCash)}
          onChange={(v) => onInitialCash(Number(v))}
        />
        <LabeledInput
          label="Tol %"
          helpTerm="TOL"
          type="number"
          value={String(tolerance)}
          onChange={(v) => onTolerance(Number(v))}
        />
      </div>

      {/* 검증 안내 배너 */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900 px-3 py-2 flex items-start gap-2">
        <Info size={14} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-sky-800 dark:text-sky-200 leading-snug">
          {t("validationInfo")}
          <br />
          <span className="text-sky-700 dark:text-sky-300">
            {t("localDataRange")}: {localRange.start} ~ {localRange.end}
          </span>
        </div>
      </div>

      {/* 실행 버튼 + 진행 상태 */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {running ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PlayCircle size={16} />
            )}
            {phase === "fetching"
              ? t("fetchingData")
              : phase === "validating"
              ? t("validatingData")
              : phase === "running"
              ? t("runningBacktest")
              : t("runBacktest")}
          </button>
          <PhaseIndicator phase={phase} />
        </div>
        {validations.length > 0 && <ValidationReport validations={validations} tolerance={tolerance} />}
      </div>

      {/* 성공 시 결과: summary + equity + trade log */}
      {phase === "success" && sim && (
        <div className="p-3 space-y-3">
          <SummaryCards sim={sim} />
          <EquityChart sim={sim} isMobile={isMobile} />
          <TradeLogTable trades={sim.trades} isMobile={isMobile} />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ sim }: { sim: SimResult }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <SummaryCard
        label={<Abbr term="TOTAL_RETURN">{t("totalReturn")}</Abbr>}
        value={`${sim.totalReturnPct.toFixed(2)}%`}
        positive={sim.totalReturnPct >= 0}
      />
      <SummaryCard
        label={<Abbr term="MDD">MDD</Abbr>}
        value={`${sim.maxDrawdownPct.toFixed(2)}%`}
        positive={false}
      />
      <SummaryCard
        label={t("totalTrades")}
        value={sim.totalTrades.toString()}
      />
      <SummaryCard
        label={<Abbr term="WIN_RATE">{t("winRate")}</Abbr>}
        value={`${sim.winRate.toFixed(1)}%`}
      />
    </div>
  );
}

function EquityChart({ sim, isMobile }: { sim: SimResult; isMobile: boolean }) {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <Abbr term="EQUITY">{t("equityCurve")}</Abbr>
        </p>
      </div>
      <div style={{ width: "100%", height: isMobile ? 150 : 200 }}>
        <ResponsiveContainer>
          <LineChart data={sim.equity}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey="equity" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TradeLogTable({
  trades,
  isMobile,
}: {
  trades: SimTradeLog[];
  isMobile: boolean;
}) {
  const { t } = useI18n();
  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("noTrades")}
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {t("tradeLog")} ({trades.length})
        </p>
      </div>
      {isMobile ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {trades.map((tr) => (
            <TradeRowMobile key={tr.id} tr={tr} />
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">
              <tr>
                <Th>{t("tlTime")}</Th>
                <Th>{t("tlSide")}</Th>
                <Th>{t("tlSymbol")}</Th>
                <Th right>{t("tlPrice")}</Th>
                <Th right>{t("tlQty")}</Th>
                <Th right>{t("tlCash")}</Th>
                <Th right>
                  <Abbr term="CASH_RATIO">{t("tlCashRatio")}</Abbr>
                </Th>
                <Th right>
                  <Abbr term="RETURN_PCT">{t("tlReturn")}</Abbr>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200 font-mono">
              {trades.map((tr) => (
                <TradeRowDesktop key={tr.id} tr={tr} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-2.5 py-1.5 font-semibold ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TradeRowDesktop({ tr }: { tr: SimTradeLog }) {
  const isBuy = tr.side === "buy";
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
      <td className="px-2.5 py-1.5 whitespace-nowrap">{tr.date}</td>
      <td className="px-2.5 py-1.5">
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isBuy
              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
          }`}
        >
          {isBuy ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          {isBuy ? "BUY" : "SELL"}
        </span>
      </td>
      <td className="px-2.5 py-1.5 font-semibold">{tr.symbol}</td>
      <td className="px-2.5 py-1.5 text-right">${tr.price.toFixed(2)}</td>
      <td className="px-2.5 py-1.5 text-right">{tr.qty}</td>
      <td className="px-2.5 py-1.5 text-right">${tr.cash.toLocaleString()}</td>
      <td className="px-2.5 py-1.5 text-right">
        {(tr.cashRatio * 100).toFixed(1)}%
      </td>
      <td
        className={`px-2.5 py-1.5 text-right font-semibold ${
          tr.returnPct >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {tr.returnPct >= 0 ? "+" : ""}
        {tr.returnPct.toFixed(2)}%
      </td>
    </tr>
  );
}

function TradeRowMobile({ tr }: { tr: SimTradeLog }) {
  const { t } = useI18n();
  const isBuy = tr.side === "buy";
  return (
    <li className="px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isBuy
              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
          }`}
        >
          {isBuy ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          {isBuy ? "BUY" : "SELL"}
        </span>
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
          {tr.symbol}
        </span>
        <span className="text-slate-400 dark:text-slate-500 ml-auto text-[10px]">
          {tr.date}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
        <div>
          {t("tlPrice")}: <span className="text-slate-900 dark:text-slate-100">${tr.price.toFixed(2)} × {tr.qty}</span>
        </div>
        <div>
          {t("tlCash")}: <span className="text-slate-900 dark:text-slate-100">${tr.cash.toLocaleString()}</span>
        </div>
        <div>
          <Abbr term="CASH_RATIO">{t("tlCashRatio")}</Abbr>:{" "}
          <span className="text-slate-900 dark:text-slate-100">{(tr.cashRatio * 100).toFixed(1)}%</span>
        </div>
        <div>
          <Abbr term="RETURN_PCT">{t("tlReturn")}</Abbr>:{" "}
          <span
            className={`font-semibold ${
              tr.returnPct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {tr.returnPct >= 0 ? "+" : ""}
            {tr.returnPct.toFixed(2)}%
          </span>
        </div>
      </div>
    </li>
  );
}

// ════════════════════════════════════════════════════════════════════
// Chat panel
// ════════════════════════════════════════════════════════════════════

function ChatPanel({
  chatHistory,
  chatMsg,
  onChange,
  onSend,
  isMobile,
}: {
  chatHistory: { role: "user" | "assistant"; content: string }[];
  chatMsg: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-0 bg-white dark:bg-slate-800 h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
        <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("askClaude")}
        </h3>
        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded ml-auto">
          beta
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 ? (
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
            <Sparkles size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p>{t("askClaudeHint")}</p>
          </div>
        ) : (
          chatHistory.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-brand-50 dark:bg-brand-950/40 text-slate-800 dark:text-slate-100 ml-6"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 mr-6"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <textarea
          value={chatMsg}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("askClaudeHint")}
          rows={isMobile ? 2 : 3}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={onSend}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Send size={14} />
          {t("send")}
        </button>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {t("claudeComingSoon")}
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Shared tiny components
// ════════════════════════════════════════════════════════════════════

function PhaseIndicator({ phase }: { phase: Phase }) {
  const { t } = useI18n();
  const items = useMemo(() => {
    if (phase === "idle") return [];
    return [
      {
        label: t("fetchingData"),
        active: phase === "fetching",
        done: phase !== "fetching",
      },
      {
        label: t("validatingData"),
        active: phase === "validating",
        done: phase === "running" || phase === "success",
      },
      {
        label: t("runningBacktest"),
        active: phase === "running",
        done: phase === "success",
      },
    ];
  }, [phase, t]);
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
      {items.map((it, i) => (
        <span
          key={i}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
            it.active
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 font-medium"
              : it.done
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
          }`}
        >
          {it.active ? (
            <Loader2 size={10} className="animate-spin" />
          ) : it.done ? (
            <CheckCircle2 size={10} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

function ValidationReport({
  validations,
  tolerance,
}: {
  validations: ValidationResult[];
  tolerance: number;
}) {
  const { t } = useI18n();
  const failed = validations.filter((v) => !v.ok);
  const passed = validations.filter((v) => v.ok);

  return (
    <div className="space-y-2">
      {passed.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle2 size={14} />
            {t("validationOk")} ({passed.length})
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {passed.map((v) => (
              <span key={v.symbol}>
                <strong>{v.symbol}</strong>: {t("overlapDays")} {v.overlapDays}
              </span>
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 text-xs font-semibold">
            <AlertTriangle size={14} />
            {t("validationFailed")} ({failed.length})
          </div>
          {failed.map((v) => (
            <FailureMessage key={v.symbol} v={v} tolerance={tolerance} />
          ))}
        </div>
      )}
    </div>
  );
}

function FailureMessage({
  v,
  tolerance,
}: {
  v: ValidationResult;
  tolerance: number;
}) {
  const { t } = useI18n();
  if (v.reason === "no_local_data") {
    return (
      <div className="text-[11px] text-rose-700 dark:text-rose-300">
        {t("noLocalData", { symbol: v.symbol })}
      </div>
    );
  }
  if (v.reason === "no_overlap") {
    const range = v.localRange
      ? `${v.localRange.start} ~ ${v.localRange.end}`
      : "?";
    return (
      <div className="text-[11px] text-rose-700 dark:text-rose-300">
        <strong>{v.symbol}</strong>: {t("noOverlap", { range })}
      </div>
    );
  }
  if (v.reason === "price_mismatch") {
    const count = v.mismatches?.length ?? 0;
    return (
      <div className="text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
        <div>
          {t("priceMismatch", {
            symbol: v.symbol,
            count,
            tol: tolerance,
          })}
        </div>
        {v.mismatches && v.mismatches.length > 0 && (
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono pl-2">
            {v.mismatches.slice(0, 3).map((m) => (
              <div key={m.date}>
                {m.date}: local ${m.localClose.toFixed(2)} vs web ${m.fetchedClose.toFixed(2)} (Δ {m.diffPct.toFixed(1)}%)
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (v.reason === "fetch_failed") {
    return (
      <div className="text-[11px] text-rose-700 dark:text-rose-300">
        {t("fetchFailed", { symbol: v.symbol, detail: v.fetchError ?? "?" })}
      </div>
    );
  }
  return null;
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  helpTerm,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  helpTerm?: Parameters<typeof HelpIcon>[0]["term"];
}) {
  return (
    <label className="block relative">
      <span className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
        <span>{label}</span>
        {helpTerm && <HelpIcon term={helpTerm} size={11} />}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: React.ReactNode;
  value: string;
  positive?: boolean;
}) {
  const color =
    positive === undefined
      ? "text-slate-900 dark:text-slate-100"
      : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-white dark:bg-slate-800">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}
