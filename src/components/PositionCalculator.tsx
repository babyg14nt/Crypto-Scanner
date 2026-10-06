import React, { useState } from 'react';
import { TradeSetup } from '../types/crypto';
import { calculatePositionSizing } from '../services/strategyEngine';
import { ShieldAlert, CheckCircle2, AlertTriangle, Copy, Check, Calculator, Info } from 'lucide-react';

interface PositionCalculatorProps {
  setup: TradeSetup;
  maxRisk: number;
  onMaxRiskChange: (val: number) => void;
  leverage: number;
  onLeverageChange: (val: number) => void;
}

export const PositionCalculator: React.FC<PositionCalculatorProps> = ({
  setup,
  maxRisk,
  onMaxRiskChange,
  leverage,
  onLeverageChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    hardStopReady: false,
    noAveragingDown: false,
    noRevengeTrading: false,
  });

  const stopDistance = setup.stopLossDistancePercent || 0.75;
  const entryPrice = setup.entryPrice || setup.currentPrice || 1;
  const calc = calculatePositionSizing(maxRisk, stopDistance, entryPrice, leverage);

  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyOrderPlan = () => {
    const text = `--- BREAKOUT & RETEST TRADE PLAN ---
Symbol: ${setup.symbol}
Direction: ${setup.direction}
Entry Price: ${setup.entryPrice.toFixed(4)}
Stop Loss (0.75% beyond inv.): ${setup.stopLossPrice.toFixed(4)} (-${calc.potentialLossUSDT} USDT risk)
Take Profit 1 (1.50% - 2:1 R:R): ${setup.takeProfitPrice.toFixed(4)} (+${calc.potentialProfitUSDT} USDT gain)
${setup.target2Price ? `Take Profit 2 (3.00% - 4:1 R:R): ${setup.target2Price.toFixed(4)}\n` : ''}Position Notional: ${calc.positionNotionalUSDT} USDT
Leverage: ${calc.leverage}x
Required Margin: ${calc.requiredMarginUSDT} USDT
Token Quantity: ${calc.tokenQuantity.toFixed(4)} ${setup.symbol.replace('USDT', '')}
Orders: Place hard stop immediately. Reduce-Only Take Profit. Never average down.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    return p.toFixed(8);
  };

  return (
    <div className="bg-[#0f141c] rounded-xl border border-slate-800/80 p-5 shadow-2xl flex flex-col gap-5">
      {/* Title & Core Formula Citation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Risk-First Position Sizing
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
          Formula: Notional = Max Risk ÷ Stop Distance
        </span>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Maximum Dollar Risk */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-400">Maximum Dollar Risk</label>
            <span className="font-mono text-emerald-400 font-semibold">{maxRisk} USDT</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={maxRisk}
              onChange={(e) => onMaxRiskChange(parseFloat(e.target.value) || 0.1)}
              className="w-full bg-[#161d28] border border-slate-700/80 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 tabular-nums"
              placeholder="e.g. 1.11"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">USDT</span>
          </div>
          <div className="flex gap-1.5 pt-1">
            {[1.11, 2.5, 5, 10, 25].map(v => (
              <button
                key={v}
                onClick={() => onMaxRiskChange(v)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  maxRisk === v
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-400">Leverage Level</label>
            <span className="font-mono text-sky-400 font-semibold">{leverage}x</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={leverage}
              onChange={(e) => onLeverageChange(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-xs w-8 text-right text-slate-300 tabular-nums">{leverage}x</span>
          </div>
          <div className="flex gap-1.5 pt-1">
            {[1, 2, 3, 5, 10].map(l => (
              <button
                key={l}
                onClick={() => onLeverageChange(l)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  leverage === l
                    ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calculated Results Table */}
      <div className="bg-[#131923] rounded-lg border border-slate-800 p-4 space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs border-b border-slate-800/70 pb-2">
          <span className="text-slate-400">Position Notional</span>
          <span className="text-base font-bold text-slate-100 tabular-nums">
            {calc.positionNotionalUSDT.toLocaleString()} <span className="text-xs font-normal text-slate-500">USDT</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">REQUIRED MARGIN ({leverage}x)</span>
            <span className="text-sky-400 font-semibold tabular-nums text-sm">
              {calc.requiredMarginUSDT.toFixed(2)} USDT
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">TOKEN QUANTITY</span>
            <span className="text-slate-200 font-semibold tabular-nums text-sm truncate block" title={calc.tokenQuantity.toFixed(4)}>
              {calc.tokenQuantity >= 100 ? calc.tokenQuantity.toFixed(2) : calc.tokenQuantity.toFixed(4)} {setup.symbol.replace('USDT', '')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/70">
          <div>
            <span className="text-slate-500 block text-[11px]">MAX DOLLAR LOSS (0.75% SL)</span>
            <span className="text-rose-400 font-semibold tabular-nums text-sm">
              -${calc.potentialLossUSDT.toFixed(2)} USDT
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">POTENTIAL PROFIT (1.5% TP - 2:1)</span>
            <span className="text-emerald-400 font-semibold tabular-nums text-sm">
              +${calc.potentialProfitUSDT.toFixed(2)} USDT
            </span>
          </div>
        </div>
      </div>

      {/* Exact Strategy Order Levels */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 block">Real-Time Execution Levels</span>
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="bg-[#141b26] p-2.5 rounded border border-sky-500/20">
            <span className="text-sky-400 text-[10px] block font-sans uppercase">Entry</span>
            <span className="text-slate-100 font-semibold tabular-nums">{formatPrice(setup.entryPrice || setup.currentPrice)}</span>
          </div>
          <div className="bg-[#141b26] p-2.5 rounded border border-rose-500/20">
            <span className="text-rose-400 text-[10px] block font-sans uppercase">Hard Stop (0.75%)</span>
            <span className="text-rose-300 font-semibold tabular-nums">{formatPrice(setup.stopLossPrice)}</span>
          </div>
          <div className="bg-[#141b26] p-2.5 rounded border border-emerald-500/20">
            <span className="text-emerald-400 text-[10px] block font-sans uppercase">Take-Profit (1.5%)</span>
            <span className="text-emerald-300 font-semibold tabular-nums">{formatPrice(setup.takeProfitPrice)}</span>
          </div>
        </div>
      </div>

      {/* Strategy Skip Rules & Execution Quality Checklist */}
      <div className="border border-slate-800/80 rounded-lg p-3 bg-[#111721] space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Execution Protocol & Discipline Checklist</span>
        </div>

        {/* Automated System Quality Checks */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Breakout Candle Normal Size (&lt;1.25%)</span>
            {setup.quality.breakoutSizeOk ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Valid ({setup.quality.breakoutCandlePercent}%)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Exceeded ({setup.quality.breakoutCandlePercent}%) — SKIP
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
            <span className="text-slate-400">Price Not Overextended (&lt;1% from breakout)</span>
            {setup.quality.priceNotOverextended ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Valid ({setup.quality.moveFromEntryPercent}%)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Overextended ({setup.quality.moveFromEntryPercent}%) — SKIP
              </span>
            )}
          </div>
        </div>

        {/* Mandatory Trader Affirmations */}
        <div className="space-y-2 pt-1 text-[11px] text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.hardStopReady}
              onChange={() => toggleChecklist('hardStopReady')}
              className="accent-emerald-500 rounded"
            />
            <span>Hard stop loss is placed immediately upon entry</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.noAveragingDown}
              onChange={() => toggleChecklist('noAveragingDown')}
              className="accent-emerald-500 rounded"
            />
            <span>Never move stop farther away & never average down</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.noRevengeTrading}
              onChange={() => toggleChecklist('noRevengeTrading')}
              className="accent-emerald-500 rounded"
            />
            <span>Zero emotional pressure to "make back" previous losses</span>
          </label>
        </div>
      </div>

      {/* Copy Plan Button */}
      <button
        onClick={handleCopyOrderPlan}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors shadow-lg shadow-emerald-950/40"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-200" />
            <span>Order Parameters Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy Order Parameters & Plan</span>
          </>
        )}
      </button>
    </div>
  );
};
