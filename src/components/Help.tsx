import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useIsMobile } from "../device/context";
import type { Language } from "../types";
import type { TranslationKey } from "../i18n/translations";
import {
  helpTopics,
  helpTopicById,
  sortedTopicsByLabel,
  scoreTopic,
  type HelpTopic,
  type HelpTopicId,
  type HelpCategory,
} from "../data/helpTopics";

/**
 * 도움말 탭.
 *
 * - 구글 첫 화면처럼 검색창이 중앙에 항상 뜬다.
 * - 아래 "키워드 목록 열기" 토글로 전체 키워드(가나다/알파벳 정렬) 펼침.
 * - 검색창에 입력하면 토글 상태와 무관하게 매칭 결과가 우선 표시됨.
 * - 항목 클릭 → 상세 뷰(요약 + 왜 필요한가).
 *
 * 검색은 src/data/helpTopics.ts 의 `scoreTopic` 을 사용한다. 본문(summary/why) 은
 * 검색 대상에서 제외해, "rsi" 같은 짧은 쿼리가 r/s/i 포함 임의 단어에 걸리지 않는다.
 */
export function Help() {
  const { t, lang } = useI18n();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const [selectedId, setSelectedId] = useState<HelpTopicId | null>(null);

  const q = query.trim();
  const hasQuery = q.length > 0;

  const results = useMemo(() => {
    if (!hasQuery) return [];
    return helpTopics
      .map((topic) => ({ topic, score: scoreTopic(topic, q, lang) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.topic);
  }, [q, lang, hasQuery]);

  const sorted = useMemo(() => sortedTopicsByLabel(lang), [lang]);

  if (selectedId) {
    const topic = helpTopicById[selectedId];
    return (
      <HelpDetail
        topic={topic}
        onBack={() => setSelectedId(null)}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div
      className={`overflow-y-auto ${isMobile ? "p-4" : "p-8"} bg-slate-50 dark:bg-slate-900 min-h-full flex-1`}
    >
      <div className={`mx-auto ${isMobile ? "max-w-full" : "max-w-3xl"}`}>
        <div className={`text-center ${isMobile ? "pt-4 pb-6" : "pt-8 pb-10"}`}>
          <h1
            className={`font-bold text-slate-800 dark:text-slate-100 mb-1 ${isMobile ? "text-xl" : "text-3xl"}`}
          >
            {t("tabHelp")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("helpHint")}
          </p>
        </div>

        <SearchBar value={query} onChange={setQuery} isMobile={isMobile} />

        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowList((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showList ? t("hideKeywords") : t("showKeywords")}
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              ({helpTopics.length})
            </span>
          </button>
        </div>

        {hasQuery ? (
          <div className="mt-6">
            {results.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-6">
                {t("noHelpResults")}
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    lang={lang}
                    onSelect={setSelectedId}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : showList ? (
          <div className="mt-6">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 px-1">
              {t("allKeywords")}
            </p>
            <ul className="space-y-1.5">
              {sorted.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  lang={lang}
                  onSelect={setSelectedId}
                  compact
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  isMobile,
}: {
  value: string;
  onChange: (v: string) => void;
  isMobile: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <Search
        size={isMobile ? 16 : 18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("helpSearchPlaceholder")}
        className={`w-full pl-10 pr-10 ${isMobile ? "py-2.5 text-sm" : "py-3.5 text-base"} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
        aria-label={t("helpSearchPlaceholder")}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
          aria-label="clear"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  lang,
  onSelect,
  compact,
}: {
  topic: HelpTopic;
  lang: Language;
  onSelect: (id: HelpTopicId) => void;
  compact?: boolean;
}) {
  return (
    <li>
      <button
        onClick={() => onSelect(topic.id)}
        className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-950/30 transition"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {topic.labels[lang]}
          </span>
          <CategoryBadge category={topic.category} />
        </div>
        {!compact && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {topic.summary[lang]}
          </p>
        )}
      </button>
    </li>
  );
}

function CategoryBadge({ category }: { category: HelpCategory }) {
  const { t } = useI18n();
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryClasses(
        category
      )}`}
    >
      {t(categoryLabelKey(category))}
    </span>
  );
}

function categoryLabelKey(category: HelpCategory): TranslationKey {
  switch (category) {
    case "bot":
      return "catBot";
    case "indicator":
      return "catIndicator";
    case "strategy":
      return "catStrategy";
    case "backtest":
      return "catBacktest";
    case "market":
      return "catMarket";
    case "data":
      return "catData";
  }
}

function categoryClasses(category: HelpCategory): string {
  switch (category) {
    case "bot":
      return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
    case "indicator":
      return "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300";
    case "strategy":
      return "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300";
    case "backtest":
      return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300";
    case "market":
      return "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300";
    case "data":
      return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200";
  }
}

function HelpDetail({
  topic,
  onBack,
  isMobile,
}: {
  topic: HelpTopic;
  onBack: () => void;
  isMobile: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <div
      className={`overflow-y-auto ${isMobile ? "p-4" : "p-8"} bg-slate-50 dark:bg-slate-900 min-h-full flex-1`}
    >
      <div className={`mx-auto ${isMobile ? "max-w-full" : "max-w-3xl"}`}>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          {t("backToHelpList")}
        </button>

        <div
          className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl ${isMobile ? "p-4" : "p-6"}`}
        >
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h2
              className={`font-bold text-slate-900 dark:text-slate-100 ${isMobile ? "text-lg" : "text-2xl"}`}
            >
              {topic.labels[lang]}
            </h2>
            <CategoryBadge category={topic.category} />
          </div>

          <Section label={t("summaryLabel")}>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {topic.summary[lang]}
            </p>
          </Section>

          <Section label={t("whyLabel")}>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {topic.why[lang]}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-1.5">
        {label}
      </h3>
      {children}
    </section>
  );
}
