import { useMemo, useState } from "react";
import {
  LineChart as RLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LineChart as LineIcon,
  BarChart3,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import type { Bot } from "../types";
import {
  computePortfolio,
  computeAssetDetail,
  type TaggedTradeLog,
  type AssetDetail,
  type PortfolioSnapshot,
} from "../utils/portfolio";
import { Abbr } from "./Abbr";

interface Props {
  bots: Bot[];
  userName: string;
}

type ChartType = "line" | "dashed" | "area" | "bar" | "pie";
type AssetSelection = "all" | string;

const AGGREGATE_CHARTS: ChartType[] = ["line", "dashed", "area", "bar", "pie"];
const ASSET_CHARTS: ChartType[] = ["line", "dashed", "area", "bar", "pie"];

// 자산별 색상 팔레트 (반복 사용)
const COLORS = [
  "#2563eb", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#64748b", // slate (for cash)
];

export function PortfolioDashboard({ bots, userName }: Props) {
  const { t, lang } = useI18n();
  const isMobile = useIsMobile();

  const [asset, setAsset] = useState<AssetSelection>("all");
  const [chart, setChart] = useState<ChartType>("line");

  const portfolio = useMemo(() => computePortfolio(bots), [bots]);
  const assetDetail = useMemo(
    () => (asset === "all" ? null : computeAssetDetail(bots, asset)),
    [bots, asset]
  );

  const activeCharts = asset === "all" ? AGGREGATE_CHARTS : ASSET_CHARTS;

  return (
    <div
      className={`${isMobile ? "p-3 space-y-4" : "p-6 space-y-5"} overflow-y-auto bg-slate-50 dark:bg-slate-900 min-h-full flex-1`}
    >
      {/* 환영 메시지 — 좌상단 */}
      <div>
        <h1
          className={`font-bold text-slate-800 dark:text-slate-100 ${
            isMobile ? "text-xl" : "text-2xl"
          }`}
        >
          {t("welcomeBack")}, {userName}!
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      {/* 요약 카드들 — 종합 또는 단일 자산에 따라 다름 */}
      {asset === "all" ? (
        <AggregateStatCards portfolio={portfolio} isMobile={isMobile} />
      ) : assetDetail ? (
        <AssetStatCards detail={assetDetail} isMobile={isMobile} />
      ) : null}

      {/* 종목 선택 + 차트 종류 스위처 */}
      <div
        className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row items-end flex-wrap"}`}
      >
        <AssetSelector
          value={asset}
          symbols={portfolio.allTradedSymbols}
          onChange={(v) => {
            setAsset(v);
            // 선택한 뷰에서 지원되는 기본 차트로 초기화 (라인)
            setChart("line");
          }}
        />
        <ChartTypeSwitcher
          value={chart}
          onChange={setChart}
          available={activeCharts}
        />
      </div>

      {/* 차트 영역 */}
      <div
        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ${isMobile ? "p-3" : "p-4"}`}
      >
        {asset === "all" ? (
          <AggregateChart portfolio={portfolio} chart={chart} isMobile={isMobile} />
        ) : assetDetail ? (
          <AssetChart
            detail={assetDetail}
            portfolio={portfolio}
            chart={chart}
            isMobile={isMobile}
          />
        ) : null}
      </div>

      {/* 매매 로그 — 종합 뷰는 전체 봇 최근 50건, 단일 자산 뷰는 그 자산만 */}
      <TradeLogPanel
        logs={
          asset === "all"
            ? portfolio.allTradeLogs.slice(0, 50)
            : (assetDetail?.trades ?? []).slice(0, 50)
        }
        isMobile={isMobile}
      />
    </div>
  );
}

// ───────────────────────────────────────────── stat cards

function AggregateStatCards({
  portfolio,
  isMobile,
}: {
  portfolio: PortfolioSnapshot;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  const returnPct = portfolio.returnPct;
  return (
    <div
      className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 gap-3"}`}
    >
      <StatCard
        label={<Abbr term="EQUITY">{t("currentEquity")}</Abbr>}
        value={`$${fmtMoney(portfolio.totalEquity)}`}
        compact={isMobile}
      />
      <StatCard
        label={t("holdingsValue")}
        value={`$${fmtMoney(portfolio.totalHoldingsValue)}`}
        sub={`${portfolio.holdings.length} ${portfolio.holdings.length === 1 ? "asset" : "assets"}`}
        compact={isMobile}
      />
      <StatCard
        label={<Abbr term="CASH_RATIO">{t("cashBalance")}</Abbr>}
        value={`$${fmtMoney(portfolio.cash)}`}
        sub={`${(portfolio.cashRatio * 100).toFixed(1)}%`}
        compact={isMobile}
      />
      <StatCard
        label={<Abbr term="TOTAL_RETURN">{t("totalReturn")}</Abbr>}
        value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
        sub={`${returnPct >= 0 ? "+" : "-"}$${fmtMoney(Math.abs(portfolio.returnAbs))}`}
        valueClass={
          returnPct >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }
        compact={isMobile}
      />
    </div>
  );
}

function AssetStatCards({
  detail,
  isMobile,
}: {
  detail: AssetDetail;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  const h = detail.holding;
  const hasPosition = h !== null;
  return (
    <div
      className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 gap-3"}`}
    >
      <StatCard
        label={t("sharesHeld")}
        value={hasPosition ? h!.qty.toLocaleString() : "0"}
        sub={detail.symbol}
        compact={isMobile}
      />
      <StatCard
        label={t("avgCostLabel")}
        value={hasPosition ? `$${h!.avgCost.toFixed(2)}` : "—"}
        compact={isMobile}
      />
      <StatCard
        label={t("currentPriceLabel")}
        value={hasPosition ? `$${h!.lastPrice.toFixed(2)}` : "—"}
        sub={hasPosition ? `${t("marketValue")}: $${fmtMoney(h!.currentValue)}` : undefined}
        compact={isMobile}
      />
      <StatCard
        label={t("assetReturnLabel")}
        value={
          hasPosition
            ? `${h!.returnPct >= 0 ? "+" : ""}${h!.returnPct.toFixed(2)}%`
            : "—"
        }
        sub={
          hasPosition
            ? `${h!.returnAbs >= 0 ? "+" : "-"}$${fmtMoney(Math.abs(h!.returnAbs))}`
            : undefined
        }
        valueClass={
          hasPosition
            ? h!.returnPct >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
            : undefined
        }
        compact={isMobile}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueClass,
  compact,
}: {
  label: React.ReactNode;
  value: string;
  sub?: string;
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
        className={`text-slate-500 dark:text-slate-400 mb-1 ${compact ? "text-[10px]" : "text-xs"}`}
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
      {sub && (
        <p
          className={`text-slate-400 dark:text-slate-500 mt-0.5 ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── selectors

function AssetSelector({
  value,
  symbols,
  onChange,
}: {
  value: AssetSelection;
  symbols: string[];
  onChange: (v: AssetSelection) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
        {t("assetSelectorLabel")}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="all">{t("allAssets")}</option>
        {symbols.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChartTypeSwitcher({
  value,
  onChange,
  available,
}: {
  value: ChartType;
  onChange: (v: ChartType) => void;
  available: ChartType[];
}) {
  const { t } = useI18n();
  const labelMap: Record<ChartType, { label: string; icon: React.ReactNode }> = {
    line: { label: t("chartLine"), icon: <LineIcon size={14} /> },
    dashed: { label: t("chartDashed"), icon: <Activity size={14} /> },
    area: { label: t("chartArea"), icon: <LineIcon size={14} /> },
    bar: { label: t("chartBar"), icon: <BarChart3 size={14} /> },
    pie: { label: t("chartPie"), icon: <PieIcon size={14} /> },
  };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
        {t("chartTypeLabel")}
      </label>
      <div className="inline-flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
        {available.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition ${
              value === c
                ? "bg-brand-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {labelMap[c].icon}
            <span>{labelMap[c].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── charts (aggregate view)

function AggregateChart({
  portfolio,
  chart,
  isMobile,
}: {
  portfolio: PortfolioSnapshot;
  chart: ChartType;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  const height = isMobile ? 240 : 320;

  // Pie: 자산 비중 (종목 + 현금)
  if (chart === "pie") {
    const data = [
      ...portfolio.holdings.map((h) => ({ name: h.symbol, value: h.currentValue })),
      { name: t("cashLabel"), value: portfolio.cash },
    ].filter((d) => d.value > 0);

    return (
      <ChartFrame title={t("assetAllocationChart")} height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 80 : 110}
            label={(entry) => entry.name}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                stroke="rgba(255,255,255,0.4)"
              />
            ))}
          </Pie>
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ChartFrame>
    );
  }

  // Bar: 종목별 평가액
  if (chart === "bar") {
    const data = [
      ...portfolio.holdings.map((h) => ({ name: h.symbol, value: h.currentValue })),
      { name: t("cashLabel"), value: portfolio.cash },
    ];
    return (
      <ChartFrame title={t("perAssetValueChart")} height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 11 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    );
  }

  // Line / Dashed / Area: 포트폴리오 전체 가치 시계열
  const data = portfolio.combinedEquityCurve;
  return (
    <ChartFrame title={t("portfolioValueChart")} height={height}>
      {chart === "area" ? (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 10 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#gEquity)"
          />
        </AreaChart>
      ) : (
        <RLineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 10 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray={chart === "dashed" ? "6 4" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </RLineChart>
      )}
    </ChartFrame>
  );
}

// ───────────────────────────────────────────── charts (per-asset view)

function AssetChart({
  detail,
  portfolio,
  chart,
  isMobile,
}: {
  detail: AssetDetail;
  portfolio: PortfolioSnapshot;
  chart: ChartType;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  const height = isMobile ? 240 : 320;

  // Pie: 포트폴리오 내 비중 (이 자산 vs 기타)
  if (chart === "pie") {
    const thisValue = detail.holding?.currentValue ?? 0;
    const otherValue = Math.max(0, portfolio.totalEquity - thisValue);
    const data = [
      { name: detail.symbol, value: thisValue },
      { name: t("allAssets"), value: otherValue },
    ].filter((d) => d.value > 0);
    return (
      <ChartFrame title={t("portionInPortfolio")} height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 80 : 110}
            label={(entry) => `${entry.name} (${((entry.percent as number) * 100).toFixed(1)}%)`}
            labelLine={false}
          >
            <Cell fill={COLORS[0]} />
            <Cell fill="#94a3b8" />
          </Pie>
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ChartFrame>
    );
  }

  // Bar: 월별 매수/매도 비교
  if (chart === "bar") {
    const data = detail.buysByMonth.map((row, i) => ({
      month: row.month,
      [t("buysLabel")]: row.amount,
      [t("sellsLabel")]: detail.sellsByMonth[i]?.amount ?? 0,
    }));
    return (
      <ChartFrame
        title={`${t("tradeActivityChart")} — ${detail.symbol}`}
        height={height}
      >
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="month" tick={{ fontSize: isMobile ? 9 : 11 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={t("buysLabel")} fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey={t("sellsLabel")} fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartFrame>
    );
  }

  // Line / Dashed / Area: 이 자산의 시점별 평가액
  const data = detail.valueOverTime;
  return (
    <ChartFrame
      title={`${t("valueOverTimeChart")} — ${detail.symbol}`}
      height={height}
    >
      {chart === "area" ? (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gAsset" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 10 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gAsset)"
          />
        </AreaChart>
      ) : (
        <RLineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 10 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v)}`}
            width={isMobile ? 48 : 60}
          />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray={chart === "dashed" ? "6 4" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </RLineChart>
      )}
    </ChartFrame>
  );
}

function ChartFrame({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: React.ReactElement;
}) {
  return (
    <>
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 text-sm">
        {title}
      </h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </>
  );
}

// ───────────────────────────────────────────── trade log

function TradeLogPanel({
  logs,
  isMobile,
}: {
  logs: TaggedTradeLog[];
  isMobile: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <h3
          className={`font-semibold text-slate-700 dark:text-slate-200 ${isMobile ? "text-xs" : "text-sm"}`}
        >
          {t("recentTradesAll")}
        </h3>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {t("latest50")} · {logs.length}
        </span>
      </div>
      {logs.length === 0 ? (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
          {t("noTrades")}
        </p>
      ) : (
        <ul
          className={`divide-y divide-slate-100 dark:divide-slate-700 overflow-y-auto ${
            isMobile ? "max-h-72" : "max-h-96"
          }`}
        >
          {logs.map((log) =>
            isMobile ? (
              <MobileRow key={`${log.botId}-${log.id}`} log={log} lang={lang} />
            ) : (
              <DesktopRow key={`${log.botId}-${log.id}`} log={log} lang={lang} />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function DesktopRow({ log, lang }: { log: TaggedTradeLog; lang: "ko" | "en" }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">
      {log.side === "buy" ? (
        <ArrowUpCircle className="text-emerald-500 shrink-0" size={18} />
      ) : (
        <ArrowDownCircle className="text-rose-500 shrink-0" size={18} />
      )}
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-36 shrink-0">
        {new Date(log.timestamp).toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 w-16">
        {log.symbol}
      </span>
      <span className="w-24 text-slate-600 dark:text-slate-300 text-xs">
        {log.qty} @ ${log.price.toFixed(2)}
      </span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 max-w-[140px] truncate">
        {log.botName}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
        {log.reason}
      </span>
    </li>
  );
}

function MobileRow({ log, lang }: { log: TaggedTradeLog; lang: "ko" | "en" }) {
  return (
    <li className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
      {log.side === "buy" ? (
        <ArrowUpCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
      ) : (
        <ArrowDownCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {log.symbol}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {log.qty} @ ${log.price.toFixed(2)}
          </span>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            {new Date(log.timestamp).toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] px-1.5 py-px rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
            {log.botName}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {log.reason}
          </span>
        </div>
      </div>
    </li>
  );
}

// ───────────────────────────────────────────── helpers

function fmtMoney(v: number): string {
  return v.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function fmtShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return v.toFixed(0);
}

