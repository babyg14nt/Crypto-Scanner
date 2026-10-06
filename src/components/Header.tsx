import React from 'react';
import { Volume2, VolumeX, RefreshCw, BookOpen, Bell } from 'lucide-react';

interface HeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isScanning: boolean;
  onRefresh: () => void;
  onOpenGuide: () => void;
  onOpenAlerts: () => void;
  unreadAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isMuted,
  onToggleMute,
  isScanning,
  onRefresh,
  onOpenGuide,
  onOpenAlerts,
  unreadAlertsCount,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0b0e14] sticky top-0 z-40 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <a href="/" className="text-lg font-bold tracking-tight text-slate-100 font-sans hover:text-white transition-colors">
        CryptoBreakout
      </a>

      {/* Zone 2: Clean navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={onOpenGuide}
          className="hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Strategy Rules</span>
        </button>
        <button
          onClick={onOpenAlerts}
          className="hover:text-slate-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 relative"
        >
          <Bell className="w-4 h-4 text-sky-400" />
          <span>Alerts Log</span>
          {unreadAlertsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
        <a
          href="#scanner-grid"
          className="hover:text-slate-100 transition-colors whitespace-nowrap"
        >
          Scanner Grid
        </a>
        <a
          href="#calculator"
          className="hover:text-slate-100 transition-colors whitespace-nowrap"
        >
          Position Calculator
        </a>
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg bg-[#141b26] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute alert audio' : 'Mute alert audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={onRefresh}
          disabled={isScanning}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
        </button>
      </div>
    </header>
  );
};
