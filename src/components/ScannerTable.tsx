import React from 'react';
import { TradeSetup, ScannerFilterState } from '../types/crypto';
import { ArrowUpRight, ArrowDownRight, Activity, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

interface ScannerTableProps {
  setups: TradeSetup[];
  selectedSymbol: string;
  onSelectPair: (setup: TradeSetup) => void;
  filters: ScannerFilterState;
  onFilterChange: (filters: ScannerFilterState) => void;
  isScanning: boolean;
}

export const ScannerTable: React.FC<ScannerTableProps> = ({
  setups,
  selectedSymbol,
  onSelectPair,
  filters,
  onFilterChange,
  isScanning,
}) => {
  // Filter logic
  const filteredSetups = setups.filter((item) => {
    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toUpperCase();
      if (!item.symbol.includes(q) && !item.name.toUpperCase().includes(q)) {
        return false;
      }
    }

    // Direction/status filter
    if (filters.direction === 'SIGNALS_ONLY') {
      if (item.phase !== 'SIGNAL_TRIGGERED') return false;
    } else if (filters.direction === 'LONG') {
      if (item.direction !== 'LONG') return false;
    } else if (filters.direction === 'SHORT') {
      if (item.direction !== 'SHORT') return false;
    } else if (filters.direction === 'RETESTING') {
      if (item.phase !== 'RETESTING' && item.phase !== 'BREAKOUT_PENDING') return false;
    }

    // Hide skipped
    if (filters.hideSkipped) {
      if (item.phase === 'SKIPPED_LARGE_BREAKOUT' || item.phase === 'SKIPPED_OVEREXTENDED' || item.phase === 'INVALIDATED') {
        return false;
      }
    }

    return true;
  });

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    return p.toFixed(8);
  };

  const getStatusText = (setup: TradeSetup) => {
    switch (setup.phase) {
      case 'SIGNAL_TRIGGERED':
        return setup.direction === 'LONG' ? (
          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            LONG RETEST HELD
          </span>
        ) : (
          <span className="text-rose-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            SHORT RETEST FAILED
          </span>
        );
      case 'RETESTING':
        return (
          <span className="text-sky-400 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-spin text-sky-400" />
            RETESTING {setup.direction}
          </span>
        );
      case 'BREAKOUT_PENDING':
        return (
          <span className="text-amber-300">
            BREAKOUT · Awaiting Retest
          </span>
        );
      case 'SKIPPED_LARGE_BREAKOUT':
        return (
          <span className="text-rose-400/80">
            SKIP · Breakout Too Large
          </span>
        );
      case 'SKIPPED_OVEREXTENDED':
        return (
          <span className="text-amber-400/80">
            SKIP · Moved &gt;1%
          </span>
        );
      case 'INVALIDATED':
        return (
          <span className="text-slate-500">
            Invalidated
          </span>
        );
      default:
        return (
          <span className="text-slate-500">
            Scanning 15-30m Range
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col bg-[#0f141c] rounded-xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Table Controls & Filter Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-[#131923] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search crypto pair (e.g. BTC, SOL)..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className="bg-[#18212e] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56 font-mono"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredSetups.length} pairs tracked
          </span>
        </div>

        {/* Filter Segmented Control (Interactive buttons per frontend-design rules) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center p-1 bg-[#18212e] rounded-lg border border-slate-800">
            <button
              onClick={() => onFilterChange({ ...filters, direction: 'ALL' })}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filters.direction === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Pairs
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, direction: 'SIGNALS_ONLY' })}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filters.direction === 'SIGNALS_ONLY'
                  ? 'bg-emerald-600/90 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Active Signals ({setups.filter(s => s.phase === 'SIGNAL_TRIGGERED').length})
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, direction: 'LONG' })}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filters.direction === 'LONG'
                  ? 'bg-slate-700 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Longs
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, direction: 'SHORT' })}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filters.direction === 'SHORT'
                  ? 'bg-slate-700 text-rose-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shorts
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, direction: 'RETESTING' })}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filters.direction === 'RETESTING'
                  ? 'bg-slate-700 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Retesting
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={filters.hideSkipped}
              onChange={(e) => onFilterChange({ ...filters, hideSkipped: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
            <span>Hide Skipped</span>
          </label>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#121822] text-slate-400 border-b border-slate-800/80 text-[11px]">
            <tr>
              <th className="py-2.5 px-4 font-medium">PAIR / ASSET</th>
              <th className="py-2.5 px-4 font-medium text-right">LAST PRICE</th>
              <th className="py-2.5 px-4 font-medium text-right">24H CHANGE</th>
              <th className="py-2.5 px-4 font-medium">STRATEGY STATE</th>
              <th className="py-2.5 px-4 font-medium text-right">15-30M RANGE</th>
              <th className="py-2.5 px-4 font-medium text-right">HARD STOP (-0.75%)</th>
              <th className="py-2.5 px-4 font-medium text-right">TARGET (+1.5% 2:1)</th>
              <th className="py-2.5 px-4 font-medium text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredSetups.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                  No pairs match the selected filter. Try switching to "All Pairs" or search another coin.
                </td>
              </tr>
            ) : (
              filteredSetups.map((setup) => {
                const isSelected = setup.symbol === selectedSymbol;
                const isSignal = setup.phase === 'SIGNAL_TRIGGERED';

                return (
                  <tr
                    key={setup.symbol}
                    onClick={() => onSelectPair(setup)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-slate-800/70 border-l-2 border-emerald-500'
                        : isSignal
                        ? 'bg-emerald-950/20 hover:bg-emerald-900/30'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Pair & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{setup.symbol}</span>
                        <span className="text-slate-500 font-sans text-[11px] truncate max-w-[90px]">{setup.name}</span>
                      </div>
                    </td>

                    {/* Last Price */}
                    <td className="py-3 px-4 text-right tabular-nums text-slate-200">
                      {formatPrice(setup.currentPrice)}
                    </td>

                    {/* 24h Change */}
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className={`inline-flex items-center justify-end gap-0.5 ${setup.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {setup.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {setup.change24h >= 0 ? `+${setup.change24h.toFixed(2)}%` : `${setup.change24h.toFixed(2)}%`}
                      </span>
                    </td>

                    {/* Setup State */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusText(setup)}
                    </td>

                    {/* 15-30m Range */}
                    <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                      {formatPrice(setup.rangeLow)} — {formatPrice(setup.rangeHigh)}
                    </td>

                    {/* Hard Stop (-0.75%) */}
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-rose-400/90">
                      {setup.stopLossPrice > 0 ? formatPrice(setup.stopLossPrice) : '—'}
                    </td>

                    {/* Take Profit (+1.50% / 2:1) */}
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-400/90">
                      {setup.takeProfitPrice > 0 ? formatPrice(setup.takeProfitPrice) : '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPair(setup);
                        }}
                        className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors ${
                          isSelected ? 'text-emerald-400' : ''
                        }`}
                        title="Inspect Chart & Calculator"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
