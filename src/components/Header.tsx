import { useEffect, useState } from "react";
import {
  Monitor,
  Smartphone,
  Globe,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import type { DeviceView, Language } from "../types";

interface Props {
  userName: string;
  deviceView: DeviceView;
  onDeviceChange: (v: DeviceView) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  userName,
  deviceView,
  onDeviceChange,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const { lang, setLang, t } = useI18n();
  const [now, setNow] = useState(new Date());
  const isMobile = deviceView === "mobile";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  const timeStr = now.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header
      className={`${
        isMobile ? "h-12 px-2 gap-1.5" : "h-14 px-4 gap-4"
      } bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center sticky top-0 z-20`}
    >
      {/* 사이드바 토글 */}
      <button
        onClick={onToggleSidebar}
        className={`${
          isMobile ? "w-8 h-8" : "w-9 h-9"
        } rounded-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0`}
        title={sidebarOpen ? t("collapseSidebar") : t("expandSidebar")}
      >
        {isMobile ? (
          <Menu size={18} />
        ) : sidebarOpen ? (
          <PanelLeftClose size={18} />
        ) : (
          <PanelLeftOpen size={18} />
        )}
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`${
            isMobile ? "w-6 h-6" : "w-7 h-7"
          } rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0`}
        >
          T
        </div>
        <h1
          className={`font-semibold text-slate-800 dark:text-slate-100 truncate ${
            isMobile ? "text-sm" : ""
          }`}
        >
          {isMobile ? "Auto" : t("appTitle")}
        </h1>
      </div>

      <div className="flex-1" />

      {/* 시각 + 날짜 — 모바일에서는 숨김 */}
      {!isMobile && (
        <div className="hidden sm:flex flex-col items-end text-xs leading-tight text-slate-500 dark:text-slate-400">
          <span>{dateStr}</span>
          <span className="font-mono text-slate-700 dark:text-slate-200 font-medium">{timeStr}</span>
        </div>
      )}

      {/* 사용자 인사 — 모바일에서는 아바타만 */}
      {isMobile ? (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {userName[0]}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
            {userName[0]}
          </div>
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {t("greeting")}, <strong>{userName}</strong>
          </span>
        </div>
      )}

      <LangToggle lang={lang} onChange={setLang} compact={isMobile} />
      <DeviceToggle value={deviceView} onChange={onDeviceChange} compact={isMobile} />
    </header>
  );
}

function LangToggle({
  lang,
  onChange,
  compact,
}: {
  lang: Language;
  onChange: (l: Language) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 shrink-0">
      {!compact && <Globe size={14} className="text-slate-500 dark:text-slate-400 ml-1.5" />}
      <button
        onClick={() => onChange("ko")}
        className={`px-1.5 py-1 text-[11px] rounded-md font-medium transition ${
          lang === "ko"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {compact ? "한" : "한국어"}
      </button>
      <button
        onClick={() => onChange("en")}
        className={`px-1.5 py-1 text-[11px] rounded-md font-medium transition ${
          lang === "en"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function DeviceToggle({
  value,
  onChange,
  compact,
}: {
  value: DeviceView;
  onChange: (v: DeviceView) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => onChange("desktop")}
        className={`flex items-center gap-1 px-1.5 py-1 text-[11px] rounded-md font-medium transition ${
          value === "desktop"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400"
        }`}
        title={t("desktop")}
      >
        <Monitor size={14} />
        {!compact && <span className="hidden md:inline">{t("desktop")}</span>}
      </button>
      <button
        onClick={() => onChange("mobile")}
        className={`flex items-center gap-1 px-1.5 py-1 text-[11px] rounded-md font-medium transition ${
          value === "mobile"
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-500 dark:text-slate-400"
        }`}
        title={t("mobile")}
      >
        <Smartphone size={14} />
        {!compact && <span className="hidden md:inline">{t("mobile")}</span>}
      </button>
    </div>
  );
}
