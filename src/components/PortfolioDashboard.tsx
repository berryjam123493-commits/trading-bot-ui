import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  BarChart,
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
  LineChart as LineIcon,
  Minus,
  TrendingUp,
  Sigma,
  BarChart3,
  PieChart as PieIcon,
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
import {
  useAssetColors,
  CASH_KEY,
  CASH_COLOR,
} from "../data/assetColors";
import { ColorPickerPopover } from "./ColorPickerPopover";

interface Props {
  bots: Bot[];
  userName: string;
}

/**
 * 메인 시계열 차트에 겹쳐 표시할 오버레이들. 전부 다 껏다 켰다 토글 가능 & 중복 선택 가능.
 * (바 그래프도 다른 옵션과 동일하게 토글)
 */
type Overlay = "bar" | "line" | "dashed" | "area" | "regression";
type AssetSelection = "all" | string;
type TimeUnit = "day" | "week" | "month" | "year";

const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#64748b",
];

export function PortfolioDashboard({ bots, userName }: Props) {
  const { t, lang } = useI18n();
  const isMobile = useIsMobile();

  const [asset, setAsset] = useState<AssetSelection>("all");
  // 기본값: 라인만 켜짐 → 바가 가리지 않아 기준선/편차 같은 새 기능이 잘 보임
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(["line"]));
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("day");

  const portfolio = useMemo(() => computePortfolio(bots), [bots]);
  const assetDetail = useMemo(
    () => (asset === "all" ? null : computeAssetDetail(bots, asset)),
    [bots, asset]
  );

  // 현재 보유 종목 기반으로 종목별 색상 배정 (포트폴리오에서 사라지기 전까지 고정)
  const currentSymbols = useMemo(
    () => portfolio.holdings.map((h) => h.symbol),
    [portfolio.holdings]
  );
  const { getColor, setColor } = useAssetColors(currentSymbols);

  const toggleOverlay = (o: Overlay) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  };

  // 메인 차트 데이터 — 시간 x, 자산의 양 y (최초 ~ 현재 전체 기간, 시간 단위만 조정)
  const rawTimeSeries = useMemo(
    () =>
      asset === "all"
        ? portfolio.combinedEquityCurve
        : assetDetail?.valueOverTime ?? [],
    [asset, portfolio.combinedEquityCurve, assetDetail]
  );
  const timeSeriesData = useMemo(
    () => aggregateByTimeUnit(rawTimeSeries, timeUnit),
    [rawTimeSeries, timeUnit]
  );

  const primaryColor = asset === "all" ? "#2563eb" : "#10b981";

  return (
    <div
      className={`${isMobile ? "p-3 space-y-4" : "p-6 space-y-5"} overflow-y-auto bg-slate-50 dark:bg-slate-900 min-h-full flex-1`}
    >
      {/* 환영 메시지 */}
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

      {/* 요약 카드 */}
      {asset === "all" ? (
        <AggregateStatCards portfolio={portfolio} isMobile={isMobile} />
      ) : assetDetail ? (
        <AssetStatCards detail={assetDetail} isMobile={isMobile} />
      ) : null}

      {/* 종목 선택 + 오버레이 토글 */}
      <div
        className={`flex gap-3 ${isMobile ? "flex-col" : "flex-row items-end flex-wrap"}`}
      >
        <AssetSelector
          value={asset}
          symbols={portfolio.allTradedSymbols}
          onChange={(v) => setAsset(v)}
        />
        <TimeUnitSelector value={timeUnit} onChange={setTimeUnit} />
        <OverlayToggles values={overlays} onToggle={toggleOverlay} />
      </div>

      {/* 메인 차트 + 오른쪽 자산 구성 패널 */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "lg:grid-cols-3"}`}>
        {/* 메인: 바 + 오버레이 */}
        <div
          className={`lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ${
            isMobile ? "p-3" : "p-4"
          }`}
        >
          <MainTimeSeriesChart
            title={
              asset === "all"
                ? t("portfolioValueChart")
                : `${t("valueOverTimeChart")} — ${asset}`
            }
            data={timeSeriesData}
            overlays={overlays}
            isMobile={isMobile}
            color={primaryColor}
          />
        </div>

        {/* 오른쪽: 자산 구성 (바 + 파이) */}
        <div className="lg:col-span-1 space-y-3">
          <AssetBreakdownPanel
            asset={asset}
            portfolio={portfolio}
            assetDetail={assetDetail}
            isMobile={isMobile}
            getColor={getColor}
            setColor={setColor}
          />
        </div>
      </div>

      {/* 매매 로그 */}
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
        className={`text-slate-500 dark:text-slate-400 mb-1 truncate ${compact ? "text-[10px]" : "text-xs"}`}
      >
        {label}
      </p>
      <p
        className={`font-semibold text-slate-900 dark:text-slate-100 truncate ${
          compact ? "text-sm" : "text-xl"
        } ${valueClass || ""}`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-slate-400 dark:text-slate-500 mt-0.5 truncate ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── selectors & overlay toggles

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

function TimeUnitSelector({
  value,
  onChange,
}: {
  value: TimeUnit;
  onChange: (v: TimeUnit) => void;
}) {
  const { t } = useI18n();
  const items: { key: TimeUnit; label: string }[] = [
    { key: "day", label: t("timeUnitDay") },
    { key: "week", label: t("timeUnitWeek") },
    { key: "month", label: t("timeUnitMonth") },
    { key: "year", label: t("timeUnitYear") },
  ];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
        {t("timeUnitLabel")}
      </label>
      <div className="inline-flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${
              value === it.key
                ? "bg-brand-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OverlayToggles({
  values,
  onToggle,
}: {
  values: Set<Overlay>;
  onToggle: (o: Overlay) => void;
}) {
  const { t } = useI18n();
  const items: { key: Overlay; label: string; icon: React.ReactNode; title: string }[] = [
    { key: "bar", label: t("chartBar"), icon: <BarChart3 size={12} />, title: t("chartBar") },
    { key: "line", label: t("chartLine"), icon: <LineIcon size={12} />, title: t("chartLine") },
    { key: "dashed", label: t("chartDashed"), icon: <Minus size={12} />, title: t("chartDashed") },
    { key: "area", label: t("chartArea"), icon: <TrendingUp size={12} />, title: t("chartArea") },
    { key: "regression", label: t("overlayRegression"), icon: <Sigma size={12} />, title: t("overlayRegressionFull") },
  ];
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500"
        title={t("overlayHint")}
      >
        {t("overlayLabel")}
      </label>
      <div className="inline-flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 flex-wrap gap-0.5">
        {items.map((it) => {
          const active = values.has(it.key);
          return (
            <button
              key={it.key}
              type="button"
              title={it.title}
              onClick={() => onToggle(it.key)}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── main time-series chart

type TimePoint = { date: string; equity: number };

interface TooltipPayloadItem {
  dataKey?: string;
  color?: string;
  payload?: TimeRow;
}

type TimeRow = TimePoint & { regression: number };

function MainTimeSeriesChart({
  title,
  data,
  overlays,
  isMobile,
  color,
}: {
  title: string;
  data: TimePoint[];
  overlays: Set<Overlay>;
  isMobile: boolean;
  color: string;
}) {
  const { t } = useI18n();
  const height = isMobile ? 260 : 340;

  // 각 포인트에 최소제곱 선형회귀 예측값을 덧붙임
  const enriched: TimeRow[] = useMemo(() => {
    if (data.length === 0) return [];
    const { slope, intercept } = linearRegression(data.map((p) => p.equity));
    return data.map((p, i) => ({
      ...p,
      regression: slope * i + intercept,
    }));
  }, [data]);

  if (enriched.length === 0) {
    return (
      <>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 text-sm">
          {title}
        </h3>
        <div
          className="flex items-center justify-center text-sm text-slate-400 dark:text-slate-500"
          style={{ height }}
        >
          {t("noTrades")}
        </div>
      </>
    );
  }

  return (
    <>
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 text-sm">
        {title}
      </h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={enriched} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              {overlays.has("area") && (
                <linearGradient id="gOverlayArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              )}
              {/* 데이터 점용 방사형 그라데이션 — 중심은 진한 빨강, 바깥쪽은 투명 */}
              <radialGradient id="gRedDot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff0000" stopOpacity="1" />
                <stop offset="45%" stopColor="#ff0000" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
              </radialGradient>
            </defs>
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
              tickFormatter={(v) => `$${fmtShort(v as number)}`}
              width={isMobile ? 48 : 60}
            />
            <RTooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              content={<OverlayTooltip overlays={overlays} />}
            />

            {/* y축/툴팁 앵커용 (투명). 어떤 오버레이가 꺼져있어도 축/호버는 작동 */}
            <Line
              dataKey="equity"
              stroke="transparent"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />

            {/* 오버레이: 바 */}
            {overlays.has("bar") && (
              <Bar
                dataKey="equity"
                fill={color}
                fillOpacity={0.45}
                radius={[3, 3, 0, 0]}
                maxBarSize={isMobile ? 18 : 26}
                isAnimationActive={false}
              />
            )}

            {/* 오버레이: area */}
            {overlays.has("area") && (
              <Area
                type="monotone"
                dataKey="equity"
                stroke={color}
                strokeWidth={1.5}
                fill="url(#gOverlayArea)"
                isAnimationActive={false}
                activeDot={false}
              />
            )}

            {/* 오버레이: 라인 */}
            {overlays.has("line") && (
              <Line
                type="monotone"
                dataKey="equity"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )}

            {/* 오버레이: 점선 */}
            {overlays.has("dashed") && (
              <Line
                type="monotone"
                dataKey="equity"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}

            {/* 오버레이: 선형 회귀 — 검정 선 + 빨강 데이터 점 */}
            {overlays.has("regression") && (
              <>
                {/* 회귀선 (검정, 실선) */}
                <Line
                  type="linear"
                  dataKey="regression"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {/* 실제 데이터 점 (순빨강, 중심→바깥 방사형 페이드) */}
                <Line
                  type="linear"
                  dataKey="equity"
                  stroke="transparent"
                  dot={{ r: 4, fill: "url(#gRedDot)", stroke: "none" }}
                  activeDot={{ r: 5, fill: "url(#gRedDot)", stroke: "#ffffff", strokeWidth: 1 }}
                  isAnimationActive={false}
                  legendType="none"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 (활성화된 오버레이만) */}
      {overlays.size > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          {overlays.has("bar") && (
            <LegendChip colorStyle={{ backgroundColor: color, opacity: 0.45 }} label={t("chartBar")} />
          )}
          {overlays.has("line") && (
            <LegendChip colorStyle={{ backgroundColor: color }} label={t("chartLine")} />
          )}
          {overlays.has("dashed") && (
            <LegendChip
              colorStyle={{
                backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`,
              }}
              label={t("chartDashed")}
            />
          )}
          {overlays.has("area") && (
            <LegendChip colorStyle={{ backgroundColor: color, opacity: 0.35 }} label={t("chartArea")} />
          )}
          {overlays.has("regression") && (
            <>
              <LegendChip colorStyle={{ backgroundColor: "#000000" }} label={t("regressionLabel")} />
              <LegendChip
                colorStyle={{
                  backgroundImage:
                    "radial-gradient(circle, #ff0000 0%, rgba(255,0,0,0.85) 45%, rgba(255,0,0,0) 100%)",
                }}
                label="Data points"
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function LegendChip({
  label,
  colorClass,
  colorStyle,
}: {
  label: string;
  colorClass?: string;
  colorStyle?: React.CSSProperties;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block w-3 h-1.5 rounded-sm ${colorClass ?? ""}`}
        style={colorStyle}
      />
      {label}
    </span>
  );
}

function OverlayTooltip({
  active,
  payload,
  label,
  overlays,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  overlays: Set<Overlay>;
}) {
  const { t } = useI18n();
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;

  const value = row.equity;
  const regression = row.regression;
  const delta = value - regression;

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-md px-2.5 py-1.5 text-xs shadow-lg">
      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">
        {label}
      </div>
      <div className="text-slate-800 dark:text-slate-100">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ff0000 0%, rgba(255,0,0,0.85) 45%, rgba(255,0,0,0) 100%)",
          }}
        />
        ${fmtMoney(value)}
      </div>
      {overlays.has("regression") && (
        <>
          <div className="text-slate-600 dark:text-slate-300">
            <span className="inline-block w-2 h-0.5 bg-black dark:bg-slate-100 mr-1 align-middle" />
            {t("regressionLabel")}: ${fmtMoney(regression)}
          </div>
          <div
            className={`font-medium ${
              delta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {t("deltaLabel")}: {delta >= 0 ? "+" : "-"}${fmtMoney(Math.abs(delta))}
          </div>
        </>
      )}
    </div>
  );
}

/** 최소제곱 선형회귀. x = 인덱스(0..n-1), y = 입력값. */
function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0] };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += ys[i];
    sumXY += i * ys[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ───────────────────────────────────────────── right-side asset breakdown

function AssetBreakdownPanel({
  asset,
  portfolio,
  assetDetail,
  isMobile,
  getColor,
  setColor,
}: {
  asset: AssetSelection;
  portfolio: PortfolioSnapshot;
  assetDetail: AssetDetail | null;
  isMobile: boolean;
  getColor: (symbol: string) => string;
  setColor: (symbol: string, color: string) => void;
}) {
  const { t } = useI18n();
  const barHeight = isMobile ? 180 : 210;
  const pieHeight = isMobile ? 180 : 220;

  // 색상 피커 상태 (종목 티커 클릭 시 표시)
  const [pickerFor, setPickerFor] = useState<
    { symbol: string; anchor: HTMLElement } | null
  >(null);
  const openPicker = (symbol: string, anchor: HTMLElement) => {
    if (symbol === CASH_KEY) return; // 현금은 고정색
    setPickerFor({ symbol, anchor });
  };

  if (asset === "all") {
    // 종합 뷰: 종목별 평가액 바 + 자산 비중 파이
    const barData = [
      ...portfolio.holdings.map((h) => ({
        name: h.symbol,
        key: h.symbol,
        value: h.currentValue,
      })),
      { name: t("cashLabel"), key: CASH_KEY, value: portfolio.cash },
    ];
    const pieData = barData.filter((d) => d.value > 0);

    const fillFor = (key: string) => (key === CASH_KEY ? CASH_COLOR : getColor(key));

    const barChart = (
      <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700"
        />
        <XAxis
          dataKey="name"
          tick={(props) => (
            <ClickableAxisTick
              {...props}
              payload={props.payload}
              items={barData}
              onClick={openPicker}
            />
          )}
          stroke="#94a3b8"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 9 }}
          stroke="#94a3b8"
          tickFormatter={(v) => `$${fmtShort(v as number)}`}
          width={42}
        />
        <RTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(v: number) => `$${fmtMoney(v)}`}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {barData.map((d) => (
            <Cell key={d.key} fill={fillFor(d.key)} />
          ))}
        </Bar>
      </BarChart>
    );

    const pieChart = (
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={isMobile ? 60 : 75}
          label={(entry) => entry.name}
          labelLine={false}
        >
          {pieData.map((d) => (
            <Cell
              key={d.key}
              fill={fillFor(d.key)}
              stroke="rgba(255,255,255,0.4)"
            />
          ))}
        </Pie>
        <RTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(v: number) => `$${fmtMoney(v)}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 10 }}
          content={(props) => (
            <ClickableLegend
              {...props}
              items={pieData}
              fillFor={fillFor}
              onClick={openPicker}
            />
          )}
        />
      </PieChart>
    );

    const pickerEl = pickerFor ? (
      <ColorPickerPopover
        anchor={pickerFor.anchor}
        current={getColor(pickerFor.symbol)}
        title={pickerFor.symbol}
        onPick={(c) => setColor(pickerFor.symbol, c)}
        onClose={() => setPickerFor(null)}
      />
    ) : null;

    // 모바일: 한 카드 안에서 바/파이 토글
    if (isMobile) {
      return (
        <>
          <AllocationMergedCard
            barChart={barChart}
            pieChart={pieChart}
            barHeight={barHeight}
            pieHeight={pieHeight}
          />
          {pickerEl}
        </>
      );
    }

    // 데스크톱: 기존처럼 두 카드로 분리
    return (
      <>
        <BreakdownCard title={t("perAssetValueChart")} height={barHeight}>
          {barChart}
        </BreakdownCard>
        <BreakdownCard title={t("assetAllocationChart")} height={pieHeight}>
          {pieChart}
        </BreakdownCard>
        {pickerEl}
      </>
    );
  }

  if (!assetDetail) return null;

  // 단일 자산 뷰: 포트폴리오 내 비중 파이 + 월별 매수/매도 바
  const thisValue = assetDetail.holding?.currentValue ?? 0;
  const otherValue = Math.max(0, portfolio.totalEquity - thisValue);
  const portionData = [
    { name: assetDetail.symbol, value: thisValue },
    { name: t("allAssets"), value: otherValue },
  ].filter((d) => d.value > 0);

  const activityData = assetDetail.buysByMonth.map((row, i) => ({
    month: row.month,
    [t("buysLabel")]: row.amount,
    [t("sellsLabel")]: assetDetail.sellsByMonth[i]?.amount ?? 0,
  }));

  return (
    <>
      <BreakdownCard title={t("portionInPortfolio")} height={pieHeight}>
        <PieChart>
          <Pie
            data={portionData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 60 : 75}
            label={(entry) =>
              `${entry.name} (${(((entry.percent ?? 0) as number) * 100).toFixed(1)}%)`
            }
            labelLine={false}
          >
            <Cell fill={COLORS[0]} />
            <Cell fill="#94a3b8" />
          </Pie>
          <RTooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </BreakdownCard>

      <BreakdownCard
        title={`${t("tradeActivityChart")} — ${assetDetail.symbol}`}
        height={barHeight}
      >
        <BarChart data={activityData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
          />
          <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: 9 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `$${fmtShort(v as number)}`}
            width={42}
          />
          <RTooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(v: number) => `$${fmtMoney(v)}`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey={t("buysLabel")} fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey={t("sellsLabel")} fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </BreakdownCard>
    </>
  );
}

/**
 * 바 차트 X축의 종목 라벨. 클릭하면 색상 피커가 열린다 (현금 제외).
 */
function ClickableAxisTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  items: { name: string; key: string }[];
  onClick: (symbol: string, anchor: HTMLElement) => void;
}) {
  const { x = 0, y = 0, payload, items, onClick } = props;
  const name = payload?.value ?? "";
  const matched = items.find((it) => it.name === name);
  const key = matched?.key ?? name;
  const isCash = key === CASH_KEY;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fontSize={9}
        className={
          isCash
            ? "fill-slate-500 dark:fill-slate-400"
            : "fill-slate-600 dark:fill-slate-300 cursor-pointer hover:fill-brand-600 dark:hover:fill-brand-400"
        }
        style={{
          textDecoration: isCash ? "none" : "underline",
          textDecorationStyle: "dotted",
          textUnderlineOffset: 2,
        }}
        onClick={(e) => {
          if (isCash) return;
          onClick(key, e.currentTarget as unknown as HTMLElement);
        }}
      >
        {name}
      </text>
    </g>
  );
}

/**
 * 파이 차트의 커스텀 범례. 색상 스와치 + 라벨. 라벨 클릭 시 색상 피커.
 */
function ClickableLegend(props: {
  items: { name: string; key: string }[];
  fillFor: (key: string) => string;
  onClick: (symbol: string, anchor: HTMLElement) => void;
}) {
  const { items, fillFor, onClick } = props;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] mt-1">
      {items.map((it) => {
        const isCash = it.key === CASH_KEY;
        return (
          <li key={it.key} className="inline-flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: fillFor(it.key) }}
            />
            <button
              type="button"
              onClick={(e) =>
                !isCash && onClick(it.key, e.currentTarget as HTMLElement)
              }
              disabled={isCash}
              className={
                isCash
                  ? "text-slate-500 dark:text-slate-400 cursor-default"
                  : "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer underline decoration-dotted underline-offset-2"
              }
            >
              {it.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 모바일 전용: 종목별 평가액(바) + 자산 비중(파이)를 하나의 카드로 합치고
 * 그 안에서 바/파이 보기를 토글한다. 제목은 "자산 비중".
 */
function AllocationMergedCard({
  barChart,
  pieChart,
  barHeight,
  pieHeight,
}: {
  barChart: React.ReactElement;
  pieChart: React.ReactElement;
  barHeight: number;
  pieHeight: number;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"bar" | "pie">("bar");
  const height = view === "bar" ? barHeight : pieHeight;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
          {t("assetAllocationChart")}
        </h4>
        <div className="inline-flex bg-slate-100 dark:bg-slate-700 rounded-md p-0.5 shrink-0">
          {(["bar", "pie"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition ${
                view === v
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {v === "bar" ? <BarChart3 size={11} /> : <PieIcon size={11} />}
              <span>{v === "bar" ? t("chartBar") : t("chartPie")}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>{view === "bar" ? barChart : pieChart}</ResponsiveContainer>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: React.ReactElement;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
        {title}
      </h4>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
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

function SideBadge({ side }: { side: "buy" | "sell" }) {
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

function DesktopRow({ log, lang }: { log: TaggedTradeLog; lang: "ko" | "en" }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">
      <SideBadge side={log.side} />
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
      <SideBadge side={log.side} />
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

/**
 * 시간 단위로 시계열을 요약.
 * - day: 그대로
 * - week/month/year: 같은 기간에 속하는 포인트 중 **마지막 값**을 대표값으로 사용 (기간 말 equity).
 * 기간 키는 x축 라벨로 그대로 사용:
 *   week  → "YYYY-Wnn" (ISO week)
 *   month → "YYYY-MM"
 *   year  → "YYYY"
 */
function aggregateByTimeUnit(
  data: { date: string; equity: number }[],
  unit: TimeUnit
): { date: string; equity: number }[] {
  if (unit === "day" || data.length === 0) return data;

  const map = new Map<string, { date: string; equity: number }>();
  for (const p of data) {
    const key = bucketKey(p.date, unit);
    // 같은 버킷이면 마지막 값으로 덮어쓰기 (data가 시간순이라고 가정)
    map.set(key, { date: key, equity: p.equity });
  }
  return Array.from(map.values());
}

function bucketKey(dateStr: string, unit: TimeUnit): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  if (unit === "year") return `${y}`;
  if (unit === "month") {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  // week: ISO week
  const { isoYear, isoWeek } = isoWeekParts(d);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

function isoWeekParts(date: Date): { isoYear: number; isoWeek: number } {
  // ISO 8601: 목요일을 기준으로 그 해에 속한 주로 판별
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, isoWeek };
}
