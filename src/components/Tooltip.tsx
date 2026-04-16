import {
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom" | "left" | "right";

interface Props {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
  /** 팝업 최대 너비 (px). 기본 260 */
  maxWidth?: number;
  className?: string;
}

interface Pos {
  top: number;
  left: number;
}

/**
 * 경량 툴팁 (hover + focus + click).
 *
 * Portal + position: fixed 로 document.body 에 렌더해서 부모의
 * `overflow: hidden` / `z-index` 영향을 받지 않는다.
 * (백테스팅 패널처럼 overflow-hidden 컨테이너 안에서도 위로 깔끔히 뜸.)
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  maxWidth = 260,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // 위치 계산: trigger 의 뷰포트 좌표 + tip 크기 기준으로 상/하/좌/우 배치.
  const compute = useCallback(() => {
    const trig = triggerRef.current;
    const tip = tipRef.current;
    if (!trig || !tip) return;
    const r = trig.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 6;
    let top = 0;
    let left = 0;
    switch (placement) {
      case "bottom":
        top = r.bottom + gap;
        left = r.left + r.width / 2 - tw / 2;
        break;
      case "left":
        top = r.top + r.height / 2 - th / 2;
        left = r.left - gap - tw;
        break;
      case "right":
        top = r.top + r.height / 2 - th / 2;
        left = r.right + gap;
        break;
      case "top":
      default:
        top = r.top - gap - th;
        left = r.left + r.width / 2 - tw / 2;
        break;
    }
    // 뷰포트 밖으로 넘치지 않게 클램프
    const pad = 4;
    left = Math.max(pad, Math.min(left, window.innerWidth - tw - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - th - pad));
    setPos({ top, left });
  }, [placement]);

  // 열릴 때 / content 바뀔 때 즉시 재계산 (paint 전)
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    compute();
  }, [open, compute, content]);

  // 열려 있는 동안 스크롤/리사이즈에 따라 재배치
  useEffect(() => {
    if (!open) return;
    const on = () => compute();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [open, compute]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center ${className ?? ""}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="fixed z-[1000] pointer-events-none px-2.5 py-1.5 rounded-md text-[11px] leading-snug font-normal bg-slate-900 dark:bg-slate-700 text-slate-50 shadow-lg whitespace-normal"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              maxWidth,
              // 위치 계산 전에는 깜빡임 없이 숨김
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
