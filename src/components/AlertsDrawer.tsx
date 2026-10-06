import React from 'react';
import { AlertNotification, TradeSetup } from '../types/crypto';
import { X, Bell, Trash2, ArrowUpRight, ArrowDownRight, Volume2 } from 'lucide-react';
import { soundService } from '../services/soundService';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertNotification[];
  onClearAlerts: () => void;
  onSelectAlert: (symbol: string) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onClearAlerts,
  onSelectAlert,
}) => {
  if (!isOpen) return null;

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    return p.toFixed(8);
  };

  const formatTime = (t: number) => {
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-[#0f141c] border-l border-slate-800 p-5 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Real-Time Alerts Log</h3>
            <span className="text-xs font-mono text-slate-500">({alerts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => soundService.playTestSound()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Test audio chime"
            >
              <Volume2 className="w-4 h-4 text-slate-400" />
            </button>
            {alerts.length > 0 && (
              <button
                onClick={onClearAlerts}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Clear all alerts"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <Bell className="w-8 h-8 stroke-1 text-slate-700 mb-2" />
              <p>No active alerts yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                The scanner continuously monitors 5-minute candles across pairs. When a retest holds and closes in direction, you'll be alerted immediately with sound.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  onSelectAlert(alert.symbol);
                  onClose();
                }}
                className="p-3 bg-[#131923] hover:bg-[#18212e] border border-slate-800/80 rounded-xl cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-100 text-xs">{alert.symbol}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      alert.direction === 'LONG'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {alert.direction === 'LONG' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {alert.direction} SIGNAL
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{formatTime(alert.timestamp)}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono bg-[#0b0e14] p-2 rounded border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 text-[9px] block">ENTRY</span>
                    <span className="text-slate-200">{formatPrice(alert.entryPrice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">SL (-0.75%)</span>
                    <span className="text-rose-400">{formatPrice(alert.stopLossPrice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">TP (+1.5%)</span>
                    <span className="text-emerald-400">{formatPrice(alert.takeProfitPrice)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-slate-400 font-mono">Notional: {alert.notionalUSDT.toFixed(0)} USDT</span>
                  <span className="text-emerald-400 text-xs hover:underline flex items-center gap-0.5">
                    Inspect Chart & Plan →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
