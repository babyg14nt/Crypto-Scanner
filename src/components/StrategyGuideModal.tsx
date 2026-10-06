import React from 'react';
import { X, CheckCircle, AlertTriangle, Shield, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface StrategyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyGuideModal: React.FC<StrategyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f141c] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Breakout & Retest Strategy Blueprint
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Long & Short Setups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Long condition */}
            <div className="bg-[#141b26] border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
                <TrendingUp className="w-4 h-4" />
                <span>Long Entry Sequence</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                <li>A <strong className="text-white">5-minute candle closes above</strong> the recent 15–30 minute range high.</li>
                <li>Price <strong className="text-white">retests</strong> that breakout level.</li>
                <li>The retest holds and a <strong className="text-white">new 5-minute candle closes upward</strong>.</li>
                <li className="text-emerald-300">Entry is taken on the successful retest, <em className="not-italic underline">never during the initial spike</em>.</li>
              </ol>
            </div>

            {/* Short condition */}
            <div className="bg-[#141b26] border border-rose-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs tracking-wider uppercase">
                <TrendingDown className="w-4 h-4" />
                <span>Short Entry Sequence</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                <li>A <strong className="text-white">5-minute candle closes below</strong> the recent range low.</li>
                <li>Price <strong className="text-white">retests</strong> that level from below.</li>
                <li>The retest fails and a <strong className="text-white">new candle closes downward</strong>.</li>
                <li className="text-rose-300">If neither condition occurs, the scanner does nothing.</li>
              </ol>
            </div>
          </div>

          {/* Position Sizing Formula */}
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-4 space-y-2 font-mono">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block font-sans">
              Position Sizing Math
            </span>
            <div className="p-3 bg-[#0a0d13] rounded border border-slate-800 text-xs text-slate-100">
              <code>Position notional = Maximum dollar risk ÷ Stop-loss distance</code>
            </div>
            <div className="text-xs text-slate-400 space-y-1 pt-1 leading-relaxed">
              <p>• Maximum risk: <span className="text-slate-200">1.11 USDT</span></p>
              <p>• Stop distance: <span className="text-slate-200">0.75% (0.0075)</span></p>
              <p>• Position size: <span className="text-emerald-400 font-bold">1.11 ÷ 0.0075 ≈ 148 USDT notional</span></p>
              <p>• At 2x leverage: <span className="text-sky-300 font-bold">Required margin ≈ 74 USDT</span></p>
              <p className="text-[11px] text-slate-500 italic pt-1">
                "The leverage does not determine how much you should risk; the stop distance and position size do."
              </p>
            </div>
          </div>

          {/* Exit Rules */}
          <div className="border border-slate-800 rounded-xl p-4 bg-[#141b26] space-y-2">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
              Exit Rules & Order Types
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Stop-loss:</strong> Approximately 0.75% beyond the invalidation level.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Take-profit:</strong> Approximately 1.5%, providing a fixed 2:1 reward-to-risk ratio.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Execution timing:</strong> Place the hard stop immediately after entry.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Zero deviation:</strong> Never move the stop farther away, and never average down.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Order execution:</strong> Use reduce-only take-profit orders.</span>
              </li>
            </ul>
          </div>

          {/* Skip The Trade Filter */}
          <div className="border border-rose-900/40 rounded-xl p-4 bg-rose-950/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs tracking-wider uppercase">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Strict "Skip The Trade" Invalidation Filters</span>
            </div>
            <ul className="space-y-1 text-xs text-rose-200/90 list-disc list-inside">
              <li>The breakout candle is unusually large (exhaustion spike).</li>
              <li>Price has already moved more than ~1% before your entry (chasing trade).</li>
              <li>The spread or fees are significant.</li>
              <li>You cannot place a hard stop.</li>
              <li>You feel pressure to "make back" previous losses (revenge trading).</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
