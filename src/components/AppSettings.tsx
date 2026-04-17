import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Globe,
  Database,
  Pause,
  Play,
  ChevronDown,
  Power,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import { useTheme } from "../theme/context";
import { ValidationDataManager } from "./ValidationDataManager";
import type { Bot, Language, SettingsSubTab } from "../types";

interface Props {
  bots: Bot[];
  onUpdateBotById: (id: string, patch: Partial<Bot>) => void;
  onUpdateAllBots: (patch: Partial<Bot>) => void;
}

export function AppSettings({ bots, onUpdateBotById, onUpdateAllBots }: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [sub, setSub] = useState<SettingsSubTab>("general");

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
      {/* 헤더 */}
      <div
        className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 ${
          isMobile ? "px-3 py-2" : "px-6 py-3 gap-3"
        }`}
      >
        <SettingsIcon size={isMobile ? 16 : 18} className="text-brand-600 dark:text-brand-500" />
        <h2
          className={`font-semibold text-slate-900 dark:text-slate-100 ${
            isMobile ? "text-base" : "text-lg"
          }`}
        >
          {t("appSettings")}
        </h2>
      </div>

      {/* 세부 탭 */}
      <div
        className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex ${
          isMobile ? "px-2 gap-0.5" : "px-6 gap-1"
        }`}
      >
        <SubTab
          label={t("generalSettings")}
          icon={<SettingsIcon size={14} />}
          active={sub === "general"}
          onClick={() => setSub("general")}
          compact={isMobile}
        />
        <SubTab
          label={t("validationDataTab")}
          icon={<Database size={14} />}
          active={sub === "validation"}
          onClick={() => setSub("validation")}
          compact={isMobile}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {sub === "general" && (
          <GeneralSettings
            bots={bots}
            onUpdateBotById={onUpdateBotById}
            onUpdateAllBots={onUpdateAllBots}
          />
        )}
        {sub === "validation" && <ValidationDataManager bots={bots} />}
      </div>
    </div>
  );
}

function GeneralSettings({
  bots,
  onUpdateBotById,
  onUpdateAllBots,
}: {
  bots: Bot[];
  onUpdateBotById: (id: string, patch: Partial<Bot>) => void;
  onUpdateAllBots: (patch: Partial<Bot>) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? "p-3 space-y-3" : "p-6 space-y-5"} overflow-y-auto max-w-2xl`}>
      {/* 언어 */}
      <SettingSection
        icon={<Globe size={16} />}
        title={t("language")}
        description={t("languageHelp")}
      >
        <ToggleGroup
          value={lang}
          options={[
            { value: "ko", label: "한국어" },
            { value: "en", label: "English" },
          ]}
          onChange={(v) => setLang(v as Language)}
        />
      </SettingSection>

      {/* 테마 */}
      <SettingSection
        icon={theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        title={t("theme")}
        description={t("themeHelp")}
      >
        <ToggleGroup
          value={theme}
          options={[
            {
              value: "light",
              label: (
                <span className="flex items-center gap-1.5">
                  <Sun size={14} /> {t("lightMode")}
                </span>
              ) as unknown as string,
            },
            {
              value: "dark",
              label: (
                <span className="flex items-center gap-1.5">
                  <Moon size={14} /> {t("darkMode")}
                </span>
              ) as unknown as string,
            },
          ]}
          onChange={(v) => setTheme(v as "light" | "dark")}
        />
      </SettingSection>

      {/* 봇 실행 제어 */}
      <SettingSection
        icon={<Power size={16} />}
        title={t("botControl")}
        description={t("botControlDesc")}
      >
        <BotControl
          bots={bots}
          onUpdateBotById={onUpdateBotById}
          onUpdateAllBots={onUpdateAllBots}
        />
      </SettingSection>
    </div>
  );
}

/**
 * 봇 실행 제어:
 *  - 타깃 드롭다운: "전체 봇 총 종합" + 각 봇
 *  - 선택한 타깃의 현재 상태 표시
 *  - 일시정지 / 재개 버튼
 */
function BotControl({
  bots,
  onUpdateBotById,
  onUpdateAllBots,
}: {
  bots: Bot[];
  onUpdateBotById: (id: string, patch: Partial<Bot>) => void;
  onUpdateAllBots: (patch: Partial<Bot>) => void;
}) {
  const { t } = useI18n();
  // "all" = 전체 종합, 그 외에는 bot.id
  const [targetId, setTargetId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 봇이 삭제되거나 하면 타깃이 유효한지 확인
  useEffect(() => {
    if (targetId !== "all" && !bots.some((b) => b.id === targetId)) {
      setTargetId("all");
    }
  }, [bots, targetId]);

  const runningCount = useMemo(
    () => bots.filter((b) => b.status === "running").length,
    [bots]
  );
  const pausedCount = bots.length - runningCount;

  const selectedBot =
    targetId === "all" ? null : bots.find((b) => b.id === targetId) ?? null;

  // 선택한 타깃이 "모두 실행 중" 인지 "모두 일시정지" 인지
  const aggregateAllRunning = bots.length > 0 && pausedCount === 0;
  const aggregateAllPaused = bots.length > 0 && runningCount === 0;

  const canPause =
    targetId === "all"
      ? bots.length > 0 && !aggregateAllPaused
      : selectedBot?.status === "running";
  const canResume =
    targetId === "all"
      ? bots.length > 0 && !aggregateAllRunning
      : selectedBot?.status === "paused";

  const handlePause = () => {
    if (targetId === "all") onUpdateAllBots({ status: "paused" });
    else if (selectedBot) onUpdateBotById(selectedBot.id, { status: "paused" });
  };
  const handleResume = () => {
    if (targetId === "all") onUpdateAllBots({ status: "running" });
    else if (selectedBot) onUpdateBotById(selectedBot.id, { status: "running" });
  };

  if (bots.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("noBotsToControl")}
      </p>
    );
  }

  const targetLabel =
    targetId === "all" ? t("allBotsAggregate") : selectedBot?.name ?? "";

  return (
    <div className="space-y-3">
      {/* 타깃 선택 드롭다운 */}
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          {t("controlTarget")}
        </label>
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition ${
              open
                ? "border-brand-500 bg-slate-50 dark:bg-slate-700"
                : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              {targetId === "all" ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold tracking-wider shrink-0">
                  ALL
                </span>
              ) : selectedBot ? (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    selectedBot.mode === "live"
                      ? "bg-emerald-500"
                      : "bg-sky-400"
                  } ${selectedBot.status === "running" ? "animate-pulse" : "opacity-40"}`}
                />
              ) : null}
              <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                {targetLabel}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto">
              {/* 전체 종합 옵션 */}
              <button
                type="button"
                onClick={() => {
                  setTargetId("all");
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                  targetId === "all"
                    ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold tracking-wider shrink-0">
                  ALL
                </span>
                <span className="flex-1 truncate font-medium">
                  {t("allBotsAggregate")}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                  {runningCount}/{bots.length}
                </span>
              </button>

              {/* 구분선 */}
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              {/* 개별 봇 */}
              {bots.map((b) => {
                const isSelected = b.id === targetId;
                const live = b.mode === "live";
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => {
                      setTargetId(b.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                      isSelected
                        ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        live ? "bg-emerald-500" : "bg-sky-400"
                      } ${b.status === "running" ? "animate-pulse" : "opacity-40"}`}
                    />
                    <span className="flex-1 truncate font-medium">{b.name}</span>
                    {live ? (
                      <span className="text-[9px] px-1.5 py-px rounded bg-emerald-600 text-white font-bold tracking-wider shrink-0">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-px rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-medium shrink-0">
                        paper
                      </span>
                    )}
                    <span
                      className={`text-[10px] shrink-0 ${
                        b.status === "running"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {b.status === "running"
                        ? t("statusRunning")
                        : t("statusPaused")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 상태 요약 */}
      <div className="flex items-center gap-2 text-xs">
        {targetId === "all" ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t("runningCount")} {runningCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {t("pausedCount")} {pausedCount}
            </span>
          </>
        ) : selectedBot ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${
              selectedBot.status === "running"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedBot.status === "running"
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />
            {selectedBot.status === "running"
              ? t("statusRunning")
              : t("statusPaused")}
          </span>
        ) : null}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handlePause}
          disabled={!canPause}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition"
        >
          <Pause size={14} />
          {t("pauseAction")}
        </button>
        <button
          type="button"
          onClick={handleResume}
          disabled={!canResume}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition"
        >
          <Play size={14} />
          {t("resumeAction")}
        </button>
      </div>

      {/* 이미 전부 같은 상태일 때 힌트 */}
      {targetId === "all" && aggregateAllPaused && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("allBotsAlreadyPaused")}
        </p>
      )}
      {targetId === "all" && aggregateAllRunning && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("allBotsAlreadyRunning")}
        </p>
      )}
    </div>
  );
}

function SettingSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </p>
          )}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${
            value === o.value
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {o.label as React.ReactNode}
        </button>
      ))}
    </div>
  );
}

function SubTab({
  label,
  icon,
  active,
  onClick,
  compact,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 py-2.5 font-medium border-b-2 transition ${
        compact ? "px-2 text-xs flex-1 justify-center" : "px-4 text-sm"
      } ${
        active
          ? "border-brand-600 text-brand-700 dark:text-brand-400"
          : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
