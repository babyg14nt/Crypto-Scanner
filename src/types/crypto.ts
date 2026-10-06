export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalDirection = 'LONG' | 'SHORT' | 'NONE';

export type SetupPhase = 
  | 'NEUTRAL'
  | 'BREAKOUT_PENDING'
  | 'RETESTING'
  | 'SIGNAL_TRIGGERED'
  | 'SKIPPED_LARGE_BREAKOUT'
  | 'SKIPPED_OVEREXTENDED'
  | 'INVALIDATED';

export interface QualityFilterStatus {
  passedAll: boolean;
  breakoutSizeOk: boolean;
  breakoutCandlePercent: number;
  priceNotOverextended: boolean;
  moveFromEntryPercent: number;
  spreadAndFeesOk: boolean;
  notes: string[];
}

export interface TradeSetup {
  symbol: string;
  name: string;
  direction: SignalDirection;
  phase: SetupPhase;
  currentPrice: number;
  rangeHigh: number;
  rangeLow: number;
  breakoutPrice: number;
  breakoutTime: number;
  retestPrice: number;
  entryPrice: number;
  invalidationLevel: number;
  stopLossPrice: number;
  stopLossDistancePercent: number; // e.g. 0.75
  takeProfitPrice: number;
  takeProfitDistancePercent: number; // e.g. 1.50
  rewardRiskRatio: number; // 2.0 (2:1)
  target2Price?: number;
  quality: QualityFilterStatus;
  detectedAt: number;
  candles: Candle[];
  change24h: number;
  volume24h: number;
}

export interface PositionCalculation {
  maxDollarRisk: number;
  stopDistancePercent: number;
  positionNotionalUSDT: number;
  leverage: number;
  requiredMarginUSDT: number;
  tokenQuantity: number;
  potentialLossUSDT: number;
  potentialProfitUSDT: number;
  rewardRiskRatio: number;
}

export interface AlertNotification {
  id: string;
  symbol: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  timestamp: number;
  notionalUSDT: number;
  read: boolean;
}

export interface ScannerFilterState {
  direction: 'ALL' | 'LONG' | 'SHORT' | 'SIGNALS_ONLY' | 'RETESTING';
  searchQuery: string;
  minVolume: number;
  hideSkipped: boolean;
}
