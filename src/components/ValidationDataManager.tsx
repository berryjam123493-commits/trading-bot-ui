import { useMemo, useRef, useState } from "react";
import {
  Upload,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Database,
  FileSpreadsheet,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import { useValidationStore, type TickerInfo } from "../data/validationStore";
import { extractTickersFromBots } from "../utils/extractTickers";
import { parseTickerCsv } from "../utils/csvParser";
import type { Bot } from "../types";
import { Abbr } from "./Abbr";

interface Props {
  bots: Bot[];
}

interface FeedbackMsg {
  ticker: string;
  kind: "ok" | "error";
  text: string;
}

export function ValidationDataManager({ bots }: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const store = useValidationStore();

  const detectedFromBots = useMemo(() => extractTickersFromBots(bots), [bots]);
  const detectedSet = useMemo(
    () => new Set(detectedFromBots.map((d) => d.ticker)),
    [detectedFromBots]
  );

  // 수동 입력 + 감지된 티커 + 스토어 티커를 union
  const allTickers = useMemo(() => {
    const set = new Set<string>([...store.tickers, ...detectedSet]);
    return [...set].sort();
  }, [store.tickers, detectedSet]);

  const [manualInput, setManualInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackMsg | null>(null);

  const handleAddManual = () => {
    const tk = manualInput.trim().toUpperCase();
    if (!tk) return;
    if (!/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(tk)) {
      setFeedback({
        ticker: tk,
        kind: "error",
        text: t("invalidTickerFormat"),
      });
      return;
    }
    store.addTicker(tk);
    setManualInput("");
    setFeedback({ ticker: tk, kind: "ok", text: t("tickerAdded", { symbol: tk }) });
  };

  return (
    <div className={`${isMobile ? "p-3 space-y-3" : "p-6 space-y-4"} overflow-y-auto`}>
      {/* 설명 */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Database size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed space-y-1">
            <p className="font-semibold">{t("validationDataTitle")}</p>
            <p>{t("validationDataHelp")}</p>
            <p className="text-sky-700 dark:text-sky-300">
              {t("syntheticFallback", {
                range: `${store.syntheticRange.start} ~ ${store.syntheticRange.end}`,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 수동 티커 추가 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
          {t("addTickerManually")}
        </p>
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
            placeholder="예: BRK.B"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-md font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAddManual}
            className="flex items-center gap-1 px-3 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={14} />
            {t("add")}
          </button>
        </div>
        {feedback && feedback.ticker !== "" && feedback.kind === "error" && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{feedback.text}</p>
        )}
      </div>

      {/* 감지된 티커 요약 */}
      {detectedFromBots.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t("detectedFromBots")} ({detectedFromBots.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {detectedFromBots.map((d) => (
              <span
                key={d.ticker}
                className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                title={d.bots.map((b) => b.name).join(", ")}
              >
                {d.ticker}
                <span className="text-slate-400 dark:text-slate-500 ml-1">
                  ({d.bots.length})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 티커 목록 + 업로드 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <FileSpreadsheet size={14} className="text-slate-500 dark:text-slate-400" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {t("tickerList")} ({allTickers.length})
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            <Abbr term="CSV">CSV</Abbr>
          </span>
        </div>
        {allTickers.length === 0 ? (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
            {t("noTickersYet")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {allTickers.map((tk) => (
              <TickerRow
                key={tk}
                ticker={tk}
                status={store.statusOf(tk)}
                fromBots={detectedSet.has(tk)}
                onUpload={(result) => setFeedback(result)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* 최근 피드백 */}
      {feedback && feedback.ticker !== "" && feedback.kind === "ok" && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
          <Check size={14} />
          {feedback.text}
        </div>
      )}
    </div>
  );
}

function TickerRow({
  ticker,
  status,
  fromBots,
  onUpload,
}: {
  ticker: string;
  status: TickerInfo;
  fromBots: boolean;
  onUpload: (msg: FeedbackMsg) => void;
}) {
  const { t } = useI18n();
  const store = useValidationStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    setBusy(true);
    setLocalError(null);
    try {
      const text = await file.text();
      const result = parseTickerCsv(text, ticker);
      if (!result.ok) {
        setLocalError(result.error ?? "unknown error");
        onUpload({
          ticker,
          kind: "error",
          text: `${ticker}: ${result.error}`,
        });
        return;
      }
      store.setUploadedData(ticker, result.data!);
      onUpload({
        ticker,
        kind: "ok",
        text: t("csvUploaded", {
          symbol: ticker,
          rows: result.rowCount ?? 0,
          range: `${result.range!.start} ~ ${result.range!.end}`,
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg);
      onUpload({ ticker, kind: "error", text: `${ticker}: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const sourceBadge =
    status.source === "uploaded" ? (
      <Abbr term="UPLOADED" underline={false}>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
          UPLOADED
        </span>
      </Abbr>
    ) : status.source === "synthetic" ? (
      <Abbr term="SAMPLE" underline={false}>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
          SAMPLE
        </span>
      </Abbr>
    ) : (
      <Abbr term="EMPTY" underline={false}>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
          EMPTY
        </span>
      </Abbr>
    );

  return (
    <li className="px-3 py-2.5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-semibold text-sm text-slate-800 dark:text-slate-100">
            {ticker}
          </span>
          {sourceBadge}
          {fromBots && (
            <Abbr term="BOT" underline={false}>
              <span className="text-[9px] px-1 py-0.5 rounded bg-brand-50 dark:bg-brand-700/30 text-brand-700 dark:text-brand-100 font-medium">
                BOT
              </span>
            </Abbr>
          )}
        </div>
        {status.source !== "none" && status.range && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {status.rowCount} rows · {status.range.start} ~ {status.range.end}
          </p>
        )}
        {localError && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-start gap-1">
            <AlertCircle size={11} className="shrink-0 mt-px" />
            {localError}
          </p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // 같은 파일 다시 선택 가능
        }}
      />
      <button
        onClick={handlePick}
        disabled={busy}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        title={t("uploadCsv")}
      >
        <Upload size={12} />
        {t("upload")}
      </button>
      {status.source === "uploaded" && (
        <button
          onClick={() => {
            store.clearUploadedData(ticker);
            onUpload({
              ticker,
              kind: "ok",
              text: t("uploadCleared", { symbol: ticker }),
            });
          }}
          className="flex items-center justify-center w-7 h-7 text-slate-400 dark:text-slate-500 rounded-md hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          title={t("clearUploadedData")}
        >
          <Trash2 size={13} />
        </button>
      )}
      {!fromBots && (
        <button
          onClick={() => {
            store.removeTicker(ticker);
            onUpload({
              ticker,
              kind: "ok",
              text: t("tickerRemoved", { symbol: ticker }),
            });
          }}
          className="flex items-center justify-center w-7 h-7 text-slate-300 dark:text-slate-600 rounded-md hover:text-slate-600 dark:hover:text-slate-400"
          title={t("removeTicker")}
        >
          ×
        </button>
      )}
    </li>
  );
}

// 현재 미사용이지만 향후 "샘플 포맷 다운로드" 기능용으로 남겨둠
export function sampleCsvTemplate(): string {
  return (
    "Date,Close,Ticker\n" +
    "2024-01-02,185.64,AAPL\n" +
    "2024-01-03,184.25,AAPL\n" +
    "2024-01-04,181.91,AAPL\n"
  );
}
// suppress unused Download import warning in build:
void Download;
