import { HelpCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n/context";
import { glossaryEntry, type GlossaryTerm } from "../i18n/glossary";
import { Tooltip } from "./Tooltip";

interface AbbrProps {
  term: GlossaryTerm;
  /** 표시할 라벨. 없으면 term 자체를 그대로 노출. */
  children?: ReactNode;
  className?: string;
  underline?: boolean;
}

/**
 * 줄임말에 점선 밑줄 + hover/tap 시 툴팁으로 설명을 보여주는 인라인 컴포넌트.
 */
export function Abbr({ term, children, className, underline = true }: AbbrProps) {
  const { lang } = useI18n();
  const entry = glossaryEntry(term, lang);
  return (
    <Tooltip content={<ExplanationBlock label={entry.label} desc={entry.desc} />}>
      <span
        className={`cursor-help ${
          underline ? "underline decoration-dotted decoration-slate-400 underline-offset-2" : ""
        } ${className ?? ""}`}
      >
        {children ?? term}
      </span>
    </Tooltip>
  );
}

interface HelpIconProps {
  term: GlossaryTerm;
  size?: number;
  /** 아이콘 대신 다른 Lucide 아이콘 사용 가능. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * 작은 ? 아이콘. 레이블 옆에 붙여 "이게 뭐야" 용도로 사용.
 */
export function HelpIcon({ term, size = 12, icon: Icon = HelpCircle, className }: HelpIconProps) {
  const { lang } = useI18n();
  const entry = glossaryEntry(term, lang);
  return (
    <Tooltip content={<ExplanationBlock label={entry.label} desc={entry.desc} />}>
      <span
        className={`inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-help ${
          className ?? ""
        }`}
      >
        <Icon size={size} />
      </span>
    </Tooltip>
  );
}

function ExplanationBlock({
  label,
  desc,
}: {
  label?: string;
  desc: string;
}) {
  return (
    <span className="block">
      {label && <span className="block font-semibold mb-0.5">{label}</span>}
      <span className="block text-slate-200">{desc}</span>
    </span>
  );
}
