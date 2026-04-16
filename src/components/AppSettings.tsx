import { useState } from "react";
import { Settings as SettingsIcon, Sun, Moon, Globe, Database } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import { useTheme } from "../theme/context";
import { ValidationDataManager } from "./ValidationDataManager";
import type { Bot, Language, SettingsSubTab } from "../types";

interface Props {
  bots: Bot[];
}

export function AppSettings({ bots }: Props) {
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
        {sub === "general" && <GeneralSettings />}
        {sub === "validation" && <ValidationDataManager bots={bots} />}
      </div>
    </div>
  );
}

function GeneralSettings() {
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
