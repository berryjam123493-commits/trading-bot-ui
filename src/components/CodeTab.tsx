import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Play, Undo2, Redo2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "../i18n/context";
import { useTheme } from "../theme/context";

interface Props {
  code: string;
  onChange: (newCode: string) => void;
}

interface DebugResult {
  ok: boolean;
  errors: string[];
}

/**
 * Monaco 에디터 기반 코드 탭.
 * - Ctrl+Z / Ctrl+Shift+Z 는 Monaco 가 내장으로 지원.
 * - 코드 변경 시 500ms 디바운스로 간단한 Python 문법 검증을 실행.
 */
export function CodeTab({ code, onChange }: Props) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [debug, setDebug] = useState<DebugResult>({ ok: true, errors: [] });
  const debounceRef = useRef<number | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const runDebug = (source: string) => {
    const errors = quickPythonLint(source);
    setDebug({ ok: errors.length === 0, errors });
  };

  useEffect(() => {
    // 초기 진입 시 검증
    runDebug(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string | undefined) => {
    const v = value ?? "";
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runDebug(v), 500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">
          {t("codeEditor")}
        </h3>
        <button
          onClick={() => editorRef.current?.trigger("keyboard", "undo", null)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500"
          title="Ctrl+Z"
        >
          <Undo2 size={12} />
          {t("undo")}
        </button>
        <button
          onClick={() => editorRef.current?.trigger("keyboard", "redo", null)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500"
          title="Ctrl+Shift+Z"
        >
          <Redo2 size={12} />
          {t("redo")}
        </button>
        <button
          onClick={() => runDebug(code)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700"
        >
          <Play size={12} />
          {t("runDebug")}
        </button>
      </div>

      {/* 에디터 */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="python"
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={code}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 4,
            automaticLayout: true,
          }}
        />
      </div>

      {/* 디버그 패널 */}
      <div
        className={`border-t ${
          debug.ok
            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40"
            : "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2">
          {debug.ok ? (
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
          )}
          <span
            className={`text-xs font-semibold ${
              debug.ok
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {debug.ok
              ? t("debugOk")
              : `${t("debugErrors")} (${debug.errors.length})`}
          </span>
        </div>
        {!debug.ok && (
          <ul className="px-4 pb-3 space-y-1 max-h-32 overflow-y-auto">
            {debug.errors.map((err, i) => (
              <li
                key={i}
                className="text-xs font-mono text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900 rounded px-2 py-1"
              >
                {err}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * 매우 가벼운 Python 문법 체크.
 * 완벽하지 않지만 흔한 실수 (괄호 미일치, 콜론 누락, 들여쓰기) 는 잡는다.
 * 실제 서버 사이드 런타임 검증은 백엔드 연결 후 Python AST 로 대체.
 */
function quickPythonLint(src: string): string[] {
  const errors: string[] = [];
  const lines = src.split("\n");

  // 괄호 짝 확인
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: { ch: string; line: number }[] = [];
  let inString: string | null = null;

  lines.forEach((line, idx) => {
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inString) {
        if (ch === inString && line[j - 1] !== "\\") inString = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = ch;
        continue;
      }
      if (ch === "#") break; // 주석
      if ("([{".includes(ch)) stack.push({ ch, line: idx + 1 });
      else if (")]}".includes(ch)) {
        const top = stack.pop();
        if (!top || top.ch !== pairs[ch]) {
          errors.push(`Line ${idx + 1}: unmatched '${ch}'`);
          return;
        }
      }
    }
    inString = null; // 한 줄 문자열 가정 (단순 lint)
  });
  if (stack.length > 0) {
    const first = stack[0];
    errors.push(`Line ${first.line}: unclosed '${first.ch}'`);
  }

  // def / if / for / while / class 뒤 콜론 확인
  const needColon = /^\s*(def|if|elif|else|for|while|class|try|except|finally|with)\b.*$/;
  lines.forEach((line, idx) => {
    const stripped = line.replace(/#.*$/, "").trimEnd();
    if (!stripped) return;
    if (needColon.test(stripped) && !stripped.endsWith(":") && !stripped.endsWith("\\")) {
      // else/try/finally 는 콜론만 있으면 됨
      if (!/^\s*(else|try|finally)\s*$/.test(stripped)) {
        errors.push(`Line ${idx + 1}: missing ':' at end of block statement`);
      }
    }
  });

  // 들여쓰기 혼용 (탭/스페이스)
  let hasTab = false;
  let hasSpace = false;
  for (const line of lines) {
    const leading = line.match(/^(\s*)/)?.[1] ?? "";
    if (leading.includes("\t")) hasTab = true;
    if (/^ +/.test(leading)) hasSpace = true;
  }
  if (hasTab && hasSpace) {
    errors.push("Mixed tabs and spaces in indentation");
  }

  return errors.slice(0, 10); // 너무 많으면 10개까지
}
