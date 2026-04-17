import { useMemo, useState } from "react";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import type { Bot } from "../types";
import { Abbr } from "./Abbr";

interface Props {
  bot: Bot;
}

type Range = "7d" | "30d" | "90d" | "all";

export function Dashboard({ bot }: Props) {
  const { t, lang } = useI18n();
  const isMobile = useIsMobile();
  const [range, setRange] = useState<Range>("30d");

  const filteredEquity = useMemo(() => {
    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 10_000;
    return bot.equityCurve.slice(-days);
  }, [bot.equityCurve, range]);

  const filteredLogs = useMemo(() => {
    if (range === "all") return bot.tradeLogs;
    const cutoff = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    cutoff.setDate(cutoff.getDate() - days);
    return bot.tradeLogs.filter((l) => new Date(l.timestamp) >= cutoff);
  }, [bot.tradeLogs, range]);

  const initialEquity = filteredEquity[0]?.equity ?? 0;
  const currentEquityVal = filteredEquity.at(-1)?.equity ?? 0;
  const returnPct = initialEquity
    ? (currentEquityVal / initialEquity - 1) * 100
    : 0;

  const sells = filteredLogs.filter((l) => l.side === "sell");
  const wins = sells.filter(
    (l) => l.reason.includes("익절") || l.reason.includes("profit")
  ).length;
  const winRate = sells.length ? (wins / sells.length) * 100 : 0;

  return (
    <div
      className={`${isMobile ? "p-3 space-y-4" : "p-6 space-y-6"} overflow-y-auto`}
    >
      {/* 요약 카드 */}
      <div
        className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 gap-3"}`}
      >
        <StatCard
          label={<Abbr term="EQUITY">{t("currentEquity")}</Abbr>}
          value={`$${currentEquityVal.toLocaleString()}`}
          compact={isMobile}
        />
        <StatCard
          label={<Abbr term="TOTAL_RETURN">{t("totalReturn")}</Abbr>}
          value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
          valueClass={
            returnPct >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
          compact={isMobile}
        />
        <StatCard
          label={t("totalTrades")}
          value={filteredLogs.length.toString()}
          compact={isMobile}
        />
        <StatCard
          label={<Abbr term="WIN_RATE">{t("winRate")}</Abbr>}
          value={`${winRate.toFixed(1)}%`}
          compact={isMobile}
        />
      </div>

      {/* 기간 선택 */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
          {t("timeRange")}:
        </span>
        {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium ${
              range === r
                ? "bg-slate-900 dark:bg-slate-700 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
            }`}
          >
            {r === "7d"
              ? t("last7d")
              : r === "30d"
              ? t("last30d")
              : r === "90d"
              ? t("last90d")
              : t("all")}
          </button>
        ))}
      </div>

      {/* 수익률 차트 */}
      <div
        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ${
          isMobile ? "p-3" : "p-4"
        }`}
      >
        <h3
          className={`font-semibold text-slate-700 dark:text-slate-200 mb-3 ${
            isMobile ? "text-xs" : "text-sm"
          }`}
        >
          <Abbr term="EQUITY">{t("equityCurve")}</Abbr>
        </h3>
        <div style={{ width: "100%", height: isMobile ? 200 : 280 }}>
          <ResponsiveContainer>
            <RLineChart data={filteredEquity}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 9 : 10 }}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 10 }}
                stroke="#94a3b8"
                domain={["auto", "auto"]}
                width={isMobile ? 48 : 60}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <ReferenceLine
                y={initialEquity}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </RLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 매매 로그 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <h3
          className={`font-semibold text-slate-700 dark:text-slate-200 px-4 py-3 border-b border-slate-100 dark:border-slate-700 ${
            isMobile ? "text-xs" : "text-sm"
          }`}
        >
          {t("tradeLog")}
        </h3>
        {filteredLogs.length === 0 ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
            {t("noTrades")}
          </p>
        ) : (
          <ul
            className={`divide-y divide-slate-100 dark:divide-slate-700 overflow-y-auto ${
              isMobile ? "max-h-64" : "max-h-80"
            }`}
          >
            {filteredLogs.map((log) =>
              isMobile ? (
                <MobileTradeRow key={log.id} log={log} lang={lang} />
              ) : (
                <DesktopTradeRow key={log.id} log={log} lang={lang} />
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  compact,
}: {
  label: React.ReactNode;
  value: string;
  valueClass?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <p
        className={`text-slate-500 dark:text-slate-400 mb-1 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-semibold text-slate-900 dark:text-slate-100 ${
          compact ? "text-sm" : "text-xl"
        } ${valueClass || ""}`}
      >
        {value}
      </p>
    </div>
  );
}

type Log = {
  id: string;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  reason: string;
};

function TradeSideBadge({ side }: { side: "buy" | "sell" }) {
  const { t } = useI18n();
  return side === "buy" ? (
    <span className="shrink-0 inline-block w-10 text-center text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
      {t("buySide")}
    </span>
  ) : (
    <span className="shrink-0 inline-block w-10 text-center text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
      {t("sellSide")}
    </span>
  );
}

function DesktopTradeRow({ log, lang }: { log: Log; lang: "ko" | "en" }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">
      <TradeSideBadge side={log.side} />
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-36 shrink-0">
        {new Date(log.timestamp).toLocaleString(
          lang === "ko" ? "ko-KR" : "en-US",
          {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 w-16">
        {log.symbol}
      </span>
      <span className="w-20 text-slate-600 dark:text-slate-300">
        {log.qty} @ ${log.price.toFixed(2)}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
        {log.reason}
      </span>
    </li>
  );
}

function MobileTradeRow({ log, lang }: { log: Log; lang: "ko" | "en" }) {
  return (
    <li className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
      <TradeSideBadge side={log.side} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {log.symbol}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {log.qty} @ ${log.price.toFixed(2)}
          </span>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            {new Date(log.timestamp).toLocaleString(
              lang === "ko" ? "ko-KR" : "en-US",
              { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }
            )}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
          {log.reason}
        </div>
      </div>
    </li>
  );
}
