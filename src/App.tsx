/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TradeSetup, AlertNotification, ScannerFilterState } from './types/crypto';
import { WATCHED_SYMBOLS, fetchTickers24h, fetch5mKlines, generateSyntheticCandles } from './services/binanceService';
import { analyzePairCandles } from './services/strategyEngine';
import { soundService } from './services/soundService';
import { Header } from './components/Header';
import { ScannerTable } from './components/ScannerTable';
import { CandlestickChart } from './components/CandlestickChart';
import { PositionCalculator } from './components/PositionCalculator';
import { StrategyGuideModal } from './components/StrategyGuideModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { 
  Play, 
  Pause, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Sliders,
  CheckCircle,
  ExternalLink,
  Info
} from 'lucide-react';

export default function App() {
  const [setups, setSetups] = useState<TradeSetup[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SOLUSDT');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [maxRisk, setMaxRisk] = useState<number>(1.11);
  const [leverage, setLeverage] = useState<number>(2);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());
  const [activeBannerAlert, setActiveBannerAlert] = useState<AlertNotification | null>(null);

  // Scenario simulation mode for testing strategy states
  const [activeScenario, setActiveScenario] = useState<'LIVE' | 'DEMO_LONG' | 'DEMO_SHORT' | 'DEMO_LARGE' | 'DEMO_OVEREXTENDED'>('LIVE');

  const [filters, setFilters] = useState<ScannerFilterState>({
    direction: 'ALL',
    searchQuery: '',
    minVolume: 0,
    hideSkipped: false,
  });

  const notifiedSymbolsRef = useRef<Set<string>>(new Set());

  // Run scanner over symbols
  const scanMarkets = useCallback(async () => {
    setIsScanning(true);
    try {
      if (activeScenario === 'LIVE') {
        const tickers = await fetchTickers24h();
        const updatedSetups: TradeSetup[] = [];

        // Scan the top watched symbols
        for (const item of WATCHED_SYMBOLS) {
          const ticker = tickers[item.symbol];
          const candles = await fetch5mKlines(item.symbol, 36);
          const setup = analyzePairCandles(
            item.symbol,
            item.name,
            candles,
            ticker ? ticker.change24h : 0,
            ticker ? ticker.volume24h : 0
          );
          updatedSetups.push(setup);

          // Check if this pair triggered a confirmed signal
          if (setup.phase === 'SIGNAL_TRIGGERED' && !notifiedSymbolsRef.current.has(setup.symbol)) {
            notifiedSymbolsRef.current.add(setup.symbol);

            const notional = maxRisk / (setup.stopLossDistancePercent / 100);
            const newAlert: AlertNotification = {
              id: `${setup.symbol}-${Date.now()}`,
              symbol: setup.symbol,
              direction: setup.direction,
              entryPrice: setup.entryPrice,
              stopLossPrice: setup.stopLossPrice,
              takeProfitPrice: setup.takeProfitPrice,
              timestamp: Date.now(),
              notionalUSDT: notional,
              read: false,
            };

            setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
            setActiveBannerAlert(newAlert);

            // Play sound
            if (setup.direction === 'LONG') {
              soundService.playLongAlert();
            } else if (setup.direction === 'SHORT') {
              soundService.playShortAlert();
            }

            // Browser notification
            soundService.showBrowserNotification(
              `🔔 ${setup.direction} Signal: ${setup.symbol}`,
              {
                body: `Retest confirmed at ${setup.entryPrice.toFixed(4)}. Stop: ${setup.stopLossPrice.toFixed(4)}, TP (2:1): ${setup.takeProfitPrice.toFixed(4)}`,
              }
            );
          }
        }

        setSetups(updatedSetups);
      } else {
        // Load scenario simulation
        const scenarioSetups: TradeSetup[] = [];
        for (const item of WATCHED_SYMBOLS.slice(0, 10)) {
          let forced: 'LONG' | 'SHORT' | 'LARGE_BREAKOUT' | 'OVEREXTENDED' | undefined;
          if (activeScenario === 'DEMO_LONG' && item.symbol === 'SOLUSDT') forced = 'LONG';
          else if (activeScenario === 'DEMO_SHORT' && item.symbol === 'ETHUSDT') forced = 'SHORT';
          else if (activeScenario === 'DEMO_LARGE' && item.symbol === 'NEARUSDT') forced = 'LARGE_BREAKOUT';
          else if (activeScenario === 'DEMO_OVEREXTENDED' && item.symbol === 'AVAXUSDT') forced = 'OVEREXTENDED';

          const candles = generateSyntheticCandles(item.symbol, 36, forced);
          const setup = analyzePairCandles(item.symbol, item.name, candles, 2.4, 25000000);
          scenarioSetups.push(setup);
        }
        setSetups(scenarioSetups);
      }

      setLastScanTime(Date.now());
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [activeScenario, maxRisk]);

  // Initial scan and auto-scan interval (15s)
  useEffect(() => {
    scanMarkets();
    if (!isAutoScanActive) return;

    const interval = setInterval(() => {
      scanMarkets();
    }, 15000);

    return () => clearInterval(interval);
  }, [scanMarkets, isAutoScanActive]);

  // Request browser notification permission once on user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundService.requestNotificationPermission();
      window.removeEventListener('click', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundService.setMuted(nextMuted);
  };

  const handleSelectPair = (setup: TradeSetup) => {
    setSelectedSymbol(setup.symbol);
  };

  const activeSetup = setups.find(s => s.symbol === selectedSymbol) || setups[0] || null;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Clean Header */}
      <Header
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isScanning={isScanning}
        onRefresh={scanMarkets}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        unreadAlertsCount={alerts.filter(a => !a.read).length}
      />

      {/* Real-time Alert Banner (Toast when a new signal fires) */}
      {activeBannerAlert && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 flex items-center justify-between text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-white">
              NEW SIGNAL TRIGGERED: {activeBannerAlert.direction} {activeBannerAlert.symbol}
            </span>
            <span className="text-emerald-300">
              Entry: ${activeBannerAlert.entryPrice.toFixed(4)} · SL (-0.75%): ${activeBannerAlert.stopLossPrice.toFixed(4)} · TP (+1.5% 2:1): ${activeBannerAlert.takeProfitPrice.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSymbol(activeBannerAlert.symbol);
                setActiveBannerAlert(null);
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-[11px] transition-colors"
            >
              Inspect Trade Plan
            </button>
            <button
              onClick={() => setActiveBannerAlert(null)}
              className="text-slate-400 hover:text-white px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Market Status & Mode Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0f141c] border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span className="text-xs font-mono font-semibold text-slate-200">
                {isScanning ? 'SCANNING 5M CANDLESTICKS...' : 'REAL-TIME 5M SCANNER ACTIVE'}
              </span>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-xs font-mono text-slate-400">
              Last cycle: {new Date(lastScanTime).toLocaleTimeString()}
            </span>
          </div>

          {/* Scenario & Live Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-[#141b26] rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => {
                  setActiveScenario('LIVE');
                  scanMarkets();
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeScenario === 'LIVE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Market
              </button>
              <button
                onClick={() => {
                  setActiveScenario('DEMO_LONG');
                  setSelectedSymbol('SOLUSDT');
                  scanMarkets();
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeScenario === 'DEMO_LONG' ? 'bg-slate-700 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate valid Long breakout and retest"
              >
                Test Long
              </button>
              <button
                onClick={() => {
                  setActiveScenario('DEMO_SHORT');
                  setSelectedSymbol('ETHUSDT');
                  scanMarkets();
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeScenario === 'DEMO_SHORT' ? 'bg-slate-700 text-rose-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate valid Short breakdown and retest"
              >
                Test Short
              </button>
              <button
                onClick={() => {
                  setActiveScenario('DEMO_LARGE');
                  setSelectedSymbol('NEARUSDT');
                  scanMarkets();
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeScenario === 'DEMO_LARGE' ? 'bg-slate-700 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate Skip: Breakout candle unusually large"
              >
                Test Skip Large
              </button>
              <button
                onClick={() => {
                  setActiveScenario('DEMO_OVEREXTENDED');
                  setSelectedSymbol('AVAXUSDT');
                  scanMarkets();
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeScenario === 'DEMO_OVEREXTENDED' ? 'bg-slate-700 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate Skip: Price moved > 1% before entry"
              >
                Test Skip &gt;1%
              </button>
            </div>

            <button
              onClick={() => setIsAutoScanActive(!isAutoScanActive)}
              className="p-1.5 rounded-lg bg-[#141b26] border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title={isAutoScanActive ? 'Pause Auto-Scan' : 'Resume Auto-Scan'}
            >
              {isAutoScanActive ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Selected Pair Chart & Position Sizing Workspace */}
        {activeSetup && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="calculator">
            {/* Candlestick Chart Area (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100 font-sans tracking-tight">
                    {activeSetup.symbol} <span className="text-slate-500 font-normal text-xs font-mono">({activeSetup.name})</span>
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    24h: {activeSetup.change24h >= 0 ? `+${activeSetup.change24h.toFixed(2)}%` : `${activeSetup.change24h.toFixed(2)}%`}
                  </span>
                </div>

                {/* Quick pair switcher */}
                <div className="hidden sm:flex items-center gap-1 font-mono text-xs">
                  {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT', 'DOGEUSDT'].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setSelectedSymbol(sym)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectedSymbol === sym
                          ? 'bg-slate-700 text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sym.replace('USDT', '')}
                    </button>
                  ))}
                </div>
              </div>

              <CandlestickChart setup={activeSetup} />
            </div>

            {/* Position Sizing & Discipline Execution Panel (4 cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <PositionCalculator
                setup={activeSetup}
                maxRisk={maxRisk}
                onMaxRiskChange={setMaxRisk}
                leverage={leverage}
                onLeverageChange={setLeverage}
              />
            </div>
          </div>
        )}

        {/* Scanner Table Section */}
        <section className="space-y-3" id="scanner-grid">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 font-sans tracking-tight">
              Cryptocurrency Scanner Matrix
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Scanning 15-30m Highs & Lows</span>
            </div>
          </div>

          <ScannerTable
            setups={setups}
            selectedSymbol={selectedSymbol}
            onSelectPair={handleSelectPair}
            filters={filters}
            onFilterChange={setFilters}
            isScanning={isScanning}
          />
        </section>
      </main>

      {/* Modals & Drawers */}
      <StrategyGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onClearAlerts={() => setAlerts([])}
        onSelectAlert={(sym) => setSelectedSymbol(sym)}
      />
    </div>
  );
}
