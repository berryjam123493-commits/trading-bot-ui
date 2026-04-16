import { useMemo, useState } from "react";
import { Play, Pause, Save, Check } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import type { Bot, DetectedParam } from "../types";
import { parseParams, applyParamChanges } from "../utils/parseParams";

interface Props {
  bot: Bot;
  onUpdate: (patch: Partial<Bot>) => void;
}

export function BotSettings({ bot, onUpdate }: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const detected = useMemo(() => parseParams(bot.code), [bot.code]);

  // 편집 중인 값들 (line 번호로 키)
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const buyParams = detected.filter((p) => p.kind === "buy");
  const sellParams = detected.filter((p) => p.kind === "sell");

  const dirty = Object.keys(edits).length > 0;

  const handleSave = () => {
    const changes = Object.entries(edits).map(([line, newValue]) => {
      const p = detected.find((d) => d.line === Number(line))!;
      return { line: Number(line), name: p.name, newValue };
    });
    const newCode = applyParamChanges(bot.code, changes);
    onUpdate({ code: newCode });
    setEdits({});
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  return (
    <div className={`${isMobile ? "p-3 space-y-4" : "p-6 space-y-6"} overflow-y-auto`}>
      {/* 모드 + 일시정지 제어 */}
      <div className={`flex ${isMobile ? "flex-col gap-3 p-3" : "flex-col sm:flex-row gap-4 p-4"} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl`}>
        <ModeToggle
          value={bot.mode}
          onChange={(mode) => onUpdate({ mode })}
        />
        <PauseButton
          status={bot.status}
          onToggle={() =>
            onUpdate({ status: bot.status === "running" ? "paused" : "running" })
          }
        />
      </div>

      {/* 매수 조건 */}
      <ParamSection
        title={t("buyConditions")}
        params={buyParams}
        edits={edits}
        setEdits={setEdits}
        accent="emerald"
      />

      {/* 매도 조건 */}
      <ParamSection
        title={t("sellConditions")}
        params={sellParams}
        edits={edits}
        setEdits={setEdits}
        accent="rose"
      />

      {detected.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
          {t("noParamsDetected")}
        </div>
      )}

      {/* 저장 버튼 */}
      {detected.length > 0 && (
        <div className="sticky bottom-0 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition ${
              dirty
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            {savedAt ? <Check size={16} /> : <Save size={16} />}
            {savedAt ? t("paramsSaved") : t("saveParams")}
          </button>
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: "paper" | "live";
  onChange: (v: "paper" | "live") => void;
}) {
  const { t } = useI18n();
  const isLive = value === "live";
  return (
    <div className="flex-1">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t("mode")}</p>
      <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => onChange("paper")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${
            !isLive
              ? "bg-sky-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {t("paperMode")}
        </button>
        <button
          onClick={() => onChange("live")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${
            isLive
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {t("liveMode")}
        </button>
      </div>
    </div>
  );
}

function PauseButton({
  status,
  onToggle,
}: {
  status: "running" | "paused";
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const isRunning = status === "running";
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Status</p>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition ${
          isRunning
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-emerald-500 text-white hover:bg-emerald-600"
        }`}
      >
        {isRunning ? <Pause size={16} /> : <Play size={16} />}
        {isRunning ? t("pauseBot") : t("resumeBot")}
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
        {isRunning ? t("running") : t("paused")}
      </p>
    </div>
  );
}

function ParamSection({
  title,
  params,
  edits,
  setEdits,
  accent,
}: {
  title: string;
  params: DetectedParam[];
  edits: Record<number, number>;
  setEdits: (fn: (prev: Record<number, number>) => Record<number, number>) => void;
  accent: "emerald" | "rose";
}) {
  if (params.length === 0) return null;
  const bar = accent === "emerald" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <span className={`w-1 h-4 rounded-full ${bar}`} />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ({params.length})
        </span>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-700">
        {params.map((p) => {
          const current = edits[p.line] ?? p.value;
          const modified = edits[p.line] !== undefined;
          return (
            <div
              key={p.line}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              <code className="text-xs font-mono text-slate-700 dark:text-slate-200 flex-1 truncate">
                {p.name}
              </code>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                line {p.line}
              </span>
              <input
                type="number"
                step="any"
                value={current}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [p.line]: Number(e.target.value),
                  }))
                }
                className={`w-28 px-2 py-1 text-sm font-mono text-right border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  modified
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-500 text-slate-900 dark:text-slate-100"
                    : "border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
