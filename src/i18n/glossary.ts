import type { Language } from "../types";
import { helpTopicById, type HelpTopicId } from "../data/helpTopics";

/**
 * `<Abbr term="MDD">` / `<HelpIcon term="TOL">` 등에서 사용하는 용어 키.
 *
 * 실제 데이터는 `src/data/helpTopics.ts` 에 있고 이 파일은 툴팁 크기에 맞춘
 * (짧은) label + summary 를 돌려주는 어댑터다.
 */
export type GlossaryTerm = HelpTopicId;

export function glossaryEntry(term: GlossaryTerm, lang: Language) {
  const t = helpTopicById[term];
  return {
    label: t.labels[lang],
    desc: t.summary[lang],
  };
}
