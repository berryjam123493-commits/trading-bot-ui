import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Settings, Code2, Pencil, ChevronDown } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import type { Bot, BotDetailTab } from "../types";
import { Dashboard } from "./Dashboard";
import { BotSettings } from "./BotSettings";
import { CodeTab } from "./CodeTab";
import { Abbr } from "./Abbr";

interface Props {
  bot: Bot;
  onUpdate: (patch: Partial<Bot>) => void;
  bots: Bot[];
  onSelectBot: (id: string) => void;
}

export function BotDetail({ bot, onUpdate, bots, onSelectBot }: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<BotDetailTab>("dashboard");
  const isLive = bot.mode === "live";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
      {/* 봇 헤더 */}
      <div
        className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 ${
          isMobile ? "px-3 py-2" : "px-6 py-3 gap-3"
        }`}
      >
        {/* 봇 전환 드롭다운 */}
        <BotSwitcher
          bots={bots}
          currentId={bot.id}
          onSelect={onSelectBot}
        />
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isLive ? "bg-emerald-500" : "bg-sky-400"
          } ${bot.status === "running" ? "animate-pulse" : "opacity-40"}`}
        />
        <EditableBotName
          name={bot.name}
          onRename={(name) => onUpdate({ name })}
          isMobile={isMobile}
        />
        {isLive ? (
          <Abbr term="LIVE" underline={false}>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold tracking-wider shrink-0">
              LIVE
            </span>
          </Abbr>
        ) : (
          <Abbr term="PAPER" underline={false}>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-medium shrink-0">
              paper
            </span>
          </Abbr>
        )}
        {bot.status === "paused" && !isMobile && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
            ⏸ {t("paused")}
          </span>
        )}
      </div>

      {/* 세부 탭 */}
      <div
        className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex ${
          isMobile ? "px-2 gap-0.5" : "px-6 gap-1"
        }`}
      >
        <SubTab
          label={t("dashboard")}
          icon={<LayoutDashboard size={14} />}
          active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
          compact={isMobile}
        />
        <SubTab
          label={t("botSettings")}
          icon={<Settings size={14} />}
          active={tab === "settings"}
          onClick={() => setTab("settings")}
          compact={isMobile}
        />
        <SubTab
          label={t("code")}
          icon={<Code2 size={14} />}
          active={tab === "code"}
          onClick={() => setTab("code")}
          compact={isMobile}
        />
      </div>

      {/* 세부 탭 컨텐츠 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "dashboard" && <Dashboard bot={bot} />}
        {tab === "settings" && <BotSettings bot={bot} onUpdate={onUpdate} />}
        {tab === "code" && (
          <CodeTab code={bot.code} onChange={(c) => onUpdate({ code: c })} />
        )}
      </div>
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

/**
 * 현재 봇 이름 왼쪽에 붙는 드롭다운.
 * 사이드바를 열지 않고도 다른 봇으로 빠르게 전환할 수 있다.
 */
function BotSwitcher({
  bots,
  currentId,
  onSelect,
}: {
  bots: Bot[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 h-6 px-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
          open ? "bg-slate-100 dark:bg-slate-700" : ""
        }`}
        title="봇 전환"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 min-w-[200px] max-h-72 overflow-y-auto">
          {bots.map((b) => {
            const isSelected = b.id === currentId;
            const live = b.mode === "live";
            return (
              <button
                key={b.id}
                onClick={() => { onSelect(b.id); setOpen(false); }}
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 봇 이름을 클릭(또는 옆의 연필 아이콘 클릭)하면 인라인 input 으로 바뀌어
 * 바로 수정할 수 있다.
 * - Enter : 저장 / Escape : 취소 / blur : 저장
 * - 공백으로만 이루어진 이름은 저장 거부 (기존 값 유지)
 */
function EditableBotName({
  name,
  onRename,
  isMobile,
}: {
  name: string;
  onRename: (newName: string) => void;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // 다른 봇으로 전환되거나 외부에서 이름이 바뀌면 draft 동기화
  useEffect(() => {
    setDraft(name);
    setEditing(false);
  }, [name]);

  useEffect(() => {
    if (editing) {
      // 다음 프레임에서 포커스 + 전체 선택
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  const sizeCls = isMobile ? "text-sm" : "text-lg";

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") cancel();
        }}
        onBlur={commit}
        maxLength={60}
        aria-label={t("renameBot")}
        className={`min-w-0 flex-1 font-semibold bg-transparent text-slate-900 dark:text-slate-100 border-b border-brand-500 focus:outline-none px-0.5 ${sizeCls}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0 group">
      <h2
        onClick={() => setEditing(true)}
        title={t("clickToEditName")}
        className={`font-semibold text-slate-900 dark:text-slate-100 truncate cursor-text rounded px-1 -mx-1 hover:bg-slate-100 dark:hover:bg-slate-700/60 ${sizeCls}`}
      >
        {name}
      </h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={t("renameBot")}
        aria-label={t("renameBot")}
        className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-brand-600 dark:hover:text-brand-400 opacity-60 group-hover:opacity-100 transition"
      >
        <Pencil size={isMobile ? 11 : 13} />
      </button>
    </div>
  );
}
