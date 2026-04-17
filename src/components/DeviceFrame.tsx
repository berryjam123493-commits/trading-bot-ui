import type { ReactNode } from "react";
import type { DeviceView } from "../types";

interface Props {
  view: DeviceView;
  children: ReactNode;
}

/**
 * PC / 모바일 프레임 래퍼.
 *
 * - view === "desktop": 전체 화면 레이아웃
 * - view === "mobile" + 실제 좁은 뷰포트(폰 브라우저): 프레임 없이 전체 화면 (실제 폰이 곧 프레임)
 * - view === "mobile" + 넓은 뷰포트(PC에서 시뮬레이션): 폰 모양 테두리로 감싸서 보여줌
 */
export function DeviceFrame({ view, children }: Props) {
  // 실제 모바일 기기 여부 (브라우저 뷰포트 너비 기준)
  const isRealMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;

  if (view === "mobile" && !isRealMobile) {
    // PC에서 모바일 시뮬레이션 → 폰 테두리 프레임
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-slate-950 py-6">
        <div className="device-mobile">{children}</div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          📱 Mobile Preview — 430 × 860
        </p>
      </div>
    );
  }

  // 실제 폰이거나 데스크톱 뷰 → 전체 화면
  return <div className="device-desktop">{children}</div>;
}
