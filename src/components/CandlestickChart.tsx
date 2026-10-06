import React, { useState, useRef } from 'react';
import { Candle, TradeSetup } from '../types/crypto';

interface CandlestickChartProps {
  setup: TradeSetup;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ setup }) => {
  const { candles, rangeHigh, rangeLow, direction, entryPrice, stopLossPrice, takeProfitPrice, currentPrice, phase } = setup;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-500 font-mono text-sm">
        No candlestick data available
      </div>
    );
  }

  // Determine chart dimensions
  const chartHeight = 360;
  const chartWidth = 720;
  const padding = { top: 30, right: 90, bottom: 40, left: 16 };

  // Calculate price bounds including candles, range high/low, SL, TP
  const allPrices: number[] = [];
  candles.forEach(c => {
    allPrices.push(c.high, c.low);
  });
  if (rangeHigh > 0) allPrices.push(rangeHigh);
  if (rangeLow > 0) allPrices.push(rangeLow);
  if (stopLossPrice > 0) allPrices.push(stopLossPrice);
  if (takeProfitPrice > 0) allPrices.push(takeProfitPrice);
  if (currentPrice > 0) allPrices.push(currentPrice);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceMargin = (maxPrice - minPrice) * 0.08 || minPrice * 0.005;
  const domainMin = minPrice - priceMargin;
  const domainMax = maxPrice + priceMargin;
  const domainRange = domainMax - domainMin || 1;

  const drawableHeight = chartHeight - padding.top - padding.bottom;
  const drawableWidth = chartWidth - padding.left - padding.right;

  // Price to Y coordinate
  const getY = (price: number): number => {
    return padding.top + (1 - (price - domainMin) / domainRange) * drawableHeight;
  };

  const candleSpacing = drawableWidth / candles.length;
  const candleWidth = Math.max(3, candleSpacing * 0.65);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const relX = mouseX - padding.left;
    const index = Math.floor(relX / candleSpacing);

    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
      setCrosshairPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredCandle(null);
      setCrosshairPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setCrosshairPos(null);
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    return p.toFixed(8);
  };

  const formatTime = (t: number) => {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div className="w-full flex flex-col bg-[#0f141c] rounded-xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Chart Top Metrics Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#131923] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-100 text-sm tracking-tight">{setup.symbol}</span>
          <span className="font-mono text-slate-400">5M Candlesticks</span>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-3 font-mono tabular-nums text-slate-300">
            <span>O: <span className="text-slate-100">{formatPrice(activeCandle.open)}</span></span>
            <span>H: <span className="text-slate-100">{formatPrice(activeCandle.high)}</span></span>
            <span>L: <span className="text-slate-100">{formatPrice(activeCandle.low)}</span></span>
            <span>C: <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{formatPrice(activeCandle.close)}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          {direction === 'LONG' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LONG BREAKOUT-RETEST
            </span>
          )}
          {direction === 'SHORT' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              SHORT BREAKDOWN-RETEST
            </span>
          )}
          {direction === 'NONE' && (
            <span className="text-slate-400 text-[11px] font-mono">15-30M Range Scan</span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto block min-w-[620px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="rangeBoxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
            <pattern id="gridPattern" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.6" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect x={padding.left} y={padding.top} width={drawableWidth} height={drawableHeight} fill="url(#gridPattern)" />

          {/* 15-30m Range High/Low Band */}
          {rangeHigh > 0 && rangeLow > 0 && (
            <g>
              <rect
                x={padding.left}
                y={getY(rangeHigh)}
                width={drawableWidth}
                height={Math.max(2, getY(rangeLow) - getY(rangeHigh))}
                fill="url(#rangeBoxGradient)"
                stroke="#0284c7"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              {/* Range High Label */}
              <text
                x={chartWidth - padding.right + 6}
                y={getY(rangeHigh) + 3}
                fill="#38bdf8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                className="tabular-nums"
              >
                Range H: {formatPrice(rangeHigh)}
              </text>
              {/* Range Low Label */}
              <text
                x={chartWidth - padding.right + 6}
                y={getY(rangeLow) + 3}
                fill="#38bdf8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                className="tabular-nums"
              >
                Range L: {formatPrice(rangeLow)}
              </text>
            </g>
          )}

          {/* Candlesticks */}
          {candles.map((candle, idx) => {
            const xCenter = padding.left + (idx + 0.5) * candleSpacing;
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const isGreen = candle.close >= candle.open;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            const color = isGreen ? '#10b981' : '#f43f5e';

            return (
              <g key={candle.time}>
                {/* Wick */}
                <line
                  x1={xCenter}
                  y1={highY}
                  x2={xCenter}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                  opacity="0.85"
                />
                {/* Body */}
                <rect
                  x={xCenter - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isGreen ? '#10b981' : '#f43f5e'}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Strategy Overlays when Signal Exists */}
          {entryPrice > 0 && direction !== 'NONE' && (
            <g>
              {/* Entry Level Line */}
              <line
                x1={padding.left}
                y1={getY(entryPrice)}
                x2={chartWidth - padding.right}
                y2={getY(entryPrice)}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x={chartWidth - padding.right}
                y={getY(entryPrice) - 9}
                width="84"
                height="18"
                fill="#0284c7"
                rx="3"
              />
              <text
                x={chartWidth - padding.right + 4}
                y={getY(entryPrice) + 3}
                fill="#ffffff"
                fontSize="10"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                ENTRY {formatPrice(entryPrice)}
              </text>
            </g>
          )}

          {/* Stop Loss Level (0.75% beyond invalidation) */}
          {stopLossPrice > 0 && direction !== 'NONE' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(stopLossPrice)}
                x2={chartWidth - padding.right}
                y2={getY(stopLossPrice)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect
                x={chartWidth - padding.right}
                y={getY(stopLossPrice) - 9}
                width="84"
                height="18"
                fill="#e11d48"
                rx="3"
              />
              <text
                x={chartWidth - padding.right + 4}
                y={getY(stopLossPrice) + 3}
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                SL (0.75%) {formatPrice(stopLossPrice)}
              </text>
            </g>
          )}

          {/* Take Profit Level (1.50% - 2:1 R:R) */}
          {takeProfitPrice > 0 && direction !== 'NONE' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(takeProfitPrice)}
                x2={chartWidth - padding.right}
                y2={getY(takeProfitPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect
                x={chartWidth - padding.right}
                y={getY(takeProfitPrice) - 9}
                width="84"
                height="18"
                fill="#059669"
                rx="3"
              />
              <text
                x={chartWidth - padding.right + 4}
                y={getY(takeProfitPrice) + 3}
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                TP (2:1) {formatPrice(takeProfitPrice)}
              </text>
            </g>
          )}

          {/* Target 2 Level (Optional 3.0% / 4:1) */}
          {setup.target2Price && setup.target2Price > 0 && direction !== 'NONE' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(setup.target2Price)}
                x2={chartWidth - padding.right}
                y2={getY(setup.target2Price)}
                stroke="#059669"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.6"
              />
            </g>
          )}

          {/* Interactive Crosshair */}
          {crosshairPos && (
            <g>
              {/* Vertical line */}
              <line
                x1={crosshairPos.x}
                y1={padding.top}
                x2={crosshairPos.x}
                y2={chartHeight - padding.bottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Horizontal line */}
              <line
                x1={padding.left}
                y1={crosshairPos.y}
                x2={chartWidth - padding.right}
                y2={crosshairPos.y}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Timeline Axis Labels */}
          {candles.filter((_, i) => i % 6 === 0).map((c) => {
            const idx = candles.indexOf(c);
            const x = padding.left + (idx + 0.5) * candleSpacing;
            return (
              <text
                key={c.time}
                x={x}
                y={chartHeight - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatTime(c.time)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Chart Footer Strategy Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-2.5 bg-[#111721] border-t border-slate-800 text-[11px] font-mono">
        <div>
          <span className="text-slate-500 block">15-30M RANGE</span>
          <span className="text-slate-200 tabular-nums">
            {formatPrice(rangeLow)} — {formatPrice(rangeHigh)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">INVALIDATION LEVEL</span>
          <span className="text-slate-200 tabular-nums">
            {formatPrice(setup.invalidationLevel || rangeHigh)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">HARD STOP (-0.75%)</span>
          <span className="text-rose-400 font-semibold tabular-nums">
            {stopLossPrice > 0 ? formatPrice(stopLossPrice) : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">TAKE PROFIT (+1.50% / 2:1)</span>
          <span className="text-emerald-400 font-semibold tabular-nums">
            {takeProfitPrice > 0 ? formatPrice(takeProfitPrice) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
