import type { ReactNode } from "react";
import type { DeviceView } from "../types";

interface Props {
  view: DeviceView;
  children: ReactNode;
}

/** PC / 모바일 프레임으로 자식을 감싸준다. 모바일은 400x820 의 가상 기기. */
export function DeviceFrame({ view, children }: Props) {
  if (view === "mobile") {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-slate-950 py-6">
        <div className="device-mobile">{children}</div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          📱 Mobile Preview — 400 × 820
        </p>
      </div>
    );
  }
  return <div className="device-desktop">{children}</div>;
}
