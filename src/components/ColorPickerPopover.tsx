import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { COLOR_PALETTE } from "../data/assetColors";

interface Props {
  /** 앵커 DOM 요소 — 피커는 이 요소 근처에 띄워짐 */
  anchor: HTMLElement | null;
  /** 현재 선택되어 있는 색상 (하이라이트용) */
  current: string;
  /** 제목 (종목 티커 등) */
  title: string;
  onPick: (color: string) => void;
  onClose: () => void;
}

/**
 * 색상 선택 팝오버. 앵커 요소 기준 아래쪽에 떠서 팔레트 그리드를 보여준다.
 * - ESC / 바깥 클릭으로 닫힘
 * - 모바일에서도 동일하게 작동 (터치 시 viewport 밖으로 잘리면 위쪽으로 자동 배치)
 */
export function ColorPickerPopover({
  anchor,
  current,
  title,
  onPick,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // ESC / 바깥 클릭 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node;
      if (el.contains(target)) return;
      if (anchor && anchor.contains(target)) return; // 앵커 클릭은 토글이므로 외부 클릭으로 안 침
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [anchor, onClose]);

  // 앵커 기준 위치 계산
  const rect = anchor?.getBoundingClientRect();
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 800;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 600;
  const popoverW = 240;
  const popoverH = 260;

  let top = 0;
  let left = 0;
  if (rect) {
    // 가로: 앵커 중심을 기준으로, 화면 안에 들어가게 clamp
    left = Math.max(
      8,
      Math.min(viewportW - popoverW - 8, rect.left + rect.width / 2 - popoverW / 2)
    );
    // 세로: 기본 아래. 아래 공간이 부족하면 위로.
    const belowTop = rect.bottom + 6;
    const aboveTop = rect.top - popoverH - 6;
    top = belowTop + popoverH > viewportH - 8 && aboveTop > 8 ? aboveTop : belowTop;
  } else {
    // 앵커 없음 → 화면 중앙
    top = Math.max(16, (viewportH - popoverH) / 2);
    left = Math.max(16, (viewportW - popoverW) / 2);
  }

  const content = (
    <>
      {/* 배경 (모바일에서 탭 감지용). 데스크톱에서도 해롭지 않음. */}
      <div
        className="fixed inset-0 z-[80]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={`Pick color for ${title}`}
        className="fixed z-[81] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl p-3"
        style={{ top, left, width: popoverW }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
        >
          {COLOR_PALETTE.map((c) => {
            const selected = c.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  onClose();
                }}
                title={c}
                className={`w-6 h-6 rounded border transition ${
                  selected
                    ? "ring-2 ring-brand-500 border-white dark:border-slate-800"
                    : "border-slate-200 dark:border-slate-600 hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          클릭해서 색상 선택
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
