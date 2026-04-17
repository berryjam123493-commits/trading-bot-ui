import { useMemo, useState } from "react";
import { I18nProvider } from "./i18n/context";
import { DeviceProvider } from "./device/context";
import { ThemeProvider } from "./theme/context";
import { ValidationStoreProvider } from "./data/validationStore";
import type { Bot, DeviceView, MainTab } from "./types";
import { mockBots } from "./data/mockBots";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { BotDetail } from "./components/BotDetail";
import { Backtesting } from "./components/Backtesting";
import { AppSettings } from "./components/AppSettings";
import { Help } from "./components/Help";
import { PortfolioDashboard } from "./components/PortfolioDashboard";
import { DeviceFrame } from "./components/DeviceFrame";

const USER_NAME = "승재";

/** 봇의 현재 운용 총 금액 (마지막 equity 포인트). equity 기록이 없으면 0. */
function currentEquity(bot: Bot): number {
  return bot.equityCurve.at(-1)?.equity ?? 0;
}

/** 봇 리스트 정렬 규칙: LIVE 우선 → 같은 모드 내에서는 운용 총 금액 큰 순. */
function sortBots(bots: Bot[]): Bot[] {
  return [...bots].sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === "live" ? -1 : 1;
    return currentEquity(b) - currentEquity(a);
  });
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ValidationStoreProvider>
          <AppInner />
        </ValidationStoreProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

function AppInner() {
  // 실제 모바일 기기 감지: 좁은 뷰포트면 자동으로 모바일 뷰로 시작
  const [deviceView, setDeviceView] = useState<DeviceView>(() =>
    window.matchMedia?.("(max-width: 767px)").matches ? "mobile" : "desktop"
  );
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [bots, setBots] = useState<Bot[]>(mockBots);
  const sortedBots = useMemo(() => sortBots(bots), [bots]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(
    sortBots(mockBots)[0]?.id ?? null
  );

  // 사이드바: 항상 닫힘으로 시작 (열면 오버레이 드로어)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedBot = bots.find((b) => b.id === selectedBotId) ?? null;

  const handleUpdateBot = (patch: Partial<Bot>) => {
    if (!selectedBotId) return;
    setBots((prev) =>
      prev.map((b) => (b.id === selectedBotId ? { ...b, ...patch } : b))
    );
  };

  const handleUpdateBotById = (id: string, patch: Partial<Bot>) => {
    setBots((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleUpdateAllBots = (patch: Partial<Bot>) => {
    setBots((prev) => prev.map((b) => ({ ...b, ...patch })));
  };

  const handleAddBot = () => {
    const newBot: Bot = {
      id: `bot-${Date.now()}`,
      name: `New Bot ${bots.length + 1}`,
      mode: "paper",
      status: "paused",
      createdAt: new Date().toISOString(),
      code: `"""새 자동매매 봇."""
import pandas as pd

# === BUY PARAMS ===
PERIOD = 20

# === SELL PARAMS ===
STOP_LOSS_PCT = 0.05


def on_bar(symbol, history):
    return []
`,
      tradeLogs: [],
      equityCurve: [],
    };
    setBots((prev) => [...prev, newBot]);
    setSelectedBotId(newBot.id);
  };

  const handleSelectMainTab = (tab: MainTab) => {
    setMainTab(tab);
    setSidebarOpen(false); // 탭 선택 후 드로어 닫기
  };

  const handleSelectBot = (id: string) => {
    setSelectedBotId(id);
    setSidebarOpen(false);
  };

  return (
    <DeviceProvider view={deviceView}>
      <DeviceFrame view={deviceView}>
        <div className="flex flex-col h-full min-h-screen">
          <Header
            userName={USER_NAME}
            deviceView={deviceView}
            onDeviceChange={setDeviceView}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
          <div className="flex-1 flex min-h-0 relative">
            <Sidebar
              mainTab={mainTab}
              onMainTabChange={handleSelectMainTab}
              bots={sortedBots}
              selectedBotId={selectedBotId}
              onSelectBot={handleSelectBot}
              onAddBot={handleAddBot}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            {/* 드로어 배경 오버레이 — 모바일/데스크톱 모두 */}
            {sidebarOpen && (
              <div
                className="absolute inset-0 bg-black/40 z-20"
                onClick={() => setSidebarOpen(false)}
                aria-label="close drawer"
              />
            )}
            <main className="flex-1 flex flex-col min-w-0">
              {mainTab === "dashboard" && (
                <PortfolioDashboard bots={bots} userName={USER_NAME} />
              )}
              {mainTab === "bots" && selectedBot && (
                <BotDetail
                  bot={selectedBot}
                  onUpdate={handleUpdateBot}
                  bots={sortedBots}
                  onSelectBot={setSelectedBotId}
                />
              )}
              {mainTab === "bots" && !selectedBot && (
                <EmptyState message="봇을 선택하거나 추가하세요 / Select or add a bot" />
              )}
              {mainTab === "backtest" && <Backtesting bots={bots} />}
              {mainTab === "settings" && (
                <AppSettings
                  bots={bots}
                  onUpdateBotById={handleUpdateBotById}
                  onUpdateAllBots={handleUpdateAllBots}
                />
              )}
              {mainTab === "help" && <Help />}
            </main>
          </div>
        </div>
      </DeviceFrame>
    </DeviceProvider>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm p-4 text-center bg-slate-50 dark:bg-slate-900">
      {message}
    </div>
  );
}
