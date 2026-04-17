import {
  Bot as BotIcon,
  LineChart,
  Plus,
  ChevronRight,
  ChevronDown,
  Pause,
  X,
  Settings as SettingsIcon,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n/context";
import type { Bot, MainTab } from "../types";
import { useIsMobile } from "../device/context";

interface Props {
  mainTab: MainTab;
  onMainTabChange: (tab: MainTab) => void;
  bots: Bot[];
  selectedBotId: string | null;
  onSelectBot: (id: string) => void;
  onAddBot: () => void;
  /** 사이드바 열림 여부 (desktop=rail toggle, mobile=drawer toggle) */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  mainTab,
  onMainTabChange,
  bots,
  selectedBotId,
  onSelectBot,
  onAddBot,
  open,
  onClose,
}: Props) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [botsOpen, setBotsOpen] = useState(true);

  // ─── 데스크톱: 접힘 모드 = 아이콘만 있는 좁은 레일 ───
  if (!isMobile && !open) {
    return (
      <aside className="w-12 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center py-2 gap-1 z-10">
        <button
          onClick={() => onMainTabChange("portfolio")}
          title={t("tabPortfolio")}
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            mainTab === "portfolio"
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <LayoutDashboard size={18} />
        </button>
        <button
          onClick={() => onMainTabChange("bots")}
          title={t("tabBots")}
          className={`w-9 h-9 rounded-md flex items-center justify-center relative ${
            mainTab === "bots"
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <BotIcon size={18} />
          <span className="absolute -right-1 -top-0.5 text-[9px] bg-slate-500 dark:bg-slate-600 text-white rounded-full px-1 min-w-[14px] text-center leading-tight">
            {bots.length}
          </span>
        </button>
        <button
          onClick={() => onMainTabChange("backtest")}
          title={t("tabBacktest")}
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            mainTab === "backtest"
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <LineChart size={18} />
        </button>
        <button
          onClick={() => onMainTabChange("settings")}
          title={t("appSettings")}
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            mainTab === "settings"
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <SettingsIcon size={18} />
        </button>
        <button
          onClick={() => onMainTabChange("help")}
          title={t("tabHelp")}
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            mainTab === "help"
              ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <HelpCircle size={18} />
        </button>
      </aside>
    );
  }

  // ─── 닫힘 상태 = 렌더하지 않음 (데스크톱/모바일 모두) ───
  if (!open) return null;

  // ─── 열린 상태: 항상 오버레이 드로어 (콘텐츠를 밀지 않음) ───
  const wrapperClass = "absolute inset-y-0 left-0 w-[78%] max-w-[280px] z-30 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-2xl animate-slide-in";

  return (
    <aside className={wrapperClass}>
      {/* 드로어 헤더 — 항상 닫기 버튼 표시 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
          MENU
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X size={16} />
        </button>
      </div>

      {/* 포트폴리오 탭 (앱 초기 화면) */}
      <button
        onClick={() => onMainTabChange("portfolio")}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left border-b border-slate-100 dark:border-slate-700 ${
          mainTab === "portfolio"
            ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <span className="w-[14px]" />
        <LayoutDashboard size={16} />
        <span>{t("tabPortfolio")}</span>
      </button>

      {/* 봇 탭 */}
      <button
        onClick={() => {
          if (mainTab === "bots") {
            // 이미 봇 탭이면 접기/펴기 토글
            setBotsOpen((o) => !o);
          } else {
            onMainTabChange("bots");
            setBotsOpen(true);
          }
        }}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left border-b border-slate-100 dark:border-slate-700 ${
          mainTab === "bots"
            ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        {mainTab === "bots" && botsOpen ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
        <BotIcon size={16} />
        <span className="flex-1">{t("tabBots")}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{bots.length}</span>
      </button>

      {/* 봇 목록 */}
      {botsOpen && mainTab === "bots" && (
        <div className="py-1 border-b border-slate-100 dark:border-slate-700 overflow-y-auto">
          {bots.map((bot) => (
            <BotRow
              key={bot.id}
              bot={bot}
              selected={bot.id === selectedBotId}
              onClick={() => onSelectBot(bot.id)}
            />
          ))}
          <button
            onClick={onAddBot}
            className="flex items-center gap-2 w-full pl-10 pr-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <Plus size={12} />
            <span>{t("addBot")}</span>
          </button>
        </div>
      )}

      {/* 백테스팅 탭 */}
      <button
        onClick={() => onMainTabChange("backtest")}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left border-b border-slate-100 dark:border-slate-700 ${
          mainTab === "backtest"
            ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <span className="w-[14px]" />
        <LineChart size={16} />
        <span>{t("tabBacktest")}</span>
      </button>

      {/* 앱 설정 탭 */}
      <button
        onClick={() => onMainTabChange("settings")}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left border-b border-slate-100 dark:border-slate-700 ${
          mainTab === "settings"
            ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <span className="w-[14px]" />
        <SettingsIcon size={16} />
        <span>{t("appSettings")}</span>
      </button>

      {/* 도움말 탭 */}
      <button
        onClick={() => onMainTabChange("help")}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left ${
          mainTab === "help"
            ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <span className="w-[14px]" />
        <HelpCircle size={16} />
        <span>{t("tabHelp")}</span>
      </button>
    </aside>
  );
}

function BotRow({
  bot,
  selected,
  onClick,
}: {
  bot: Bot;
  selected: boolean;
  onClick: () => void;
}) {
  const isLive = bot.mode === "live";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full pl-10 pr-3 py-1.5 text-sm text-left relative ${
        selected
          ? "bg-brand-50 dark:bg-brand-950/40"
          : "hover:bg-slate-50 dark:hover:bg-slate-700"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isLive ? "bg-emerald-500" : "bg-sky-400"
        } ${bot.status === "running" ? "animate-pulse" : "opacity-40"}`}
      />
      <span
        className={`truncate ${
          isLive
            ? "text-emerald-700 dark:text-emerald-400 font-medium"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {bot.name}
      </span>
      {!isLive && (
        <span className="text-[10px] px-1.5 py-px rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-medium">
          paper
        </span>
      )}
      {isLive && (
        <span className="text-[10px] px-1.5 py-px rounded bg-emerald-600 text-white font-bold tracking-wider">
          LIVE
        </span>
      )}
      {bot.status === "paused" && (
        <Pause size={10} className="text-slate-400 dark:text-slate-500" />
      )}
    </button>
  );
}
