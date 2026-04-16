import { createContext, useContext, type ReactNode } from "react";
import type { DeviceView } from "../types";

const DeviceContext = createContext<DeviceView>("desktop");

export function DeviceProvider({
  view,
  children,
}: {
  view: DeviceView;
  children: ReactNode;
}) {
  return (
    <DeviceContext.Provider value={view}>{children}</DeviceContext.Provider>
  );
}

export function useDevice() {
  return useContext(DeviceContext);
}

export function useIsMobile() {
  return useContext(DeviceContext) === "mobile";
}
