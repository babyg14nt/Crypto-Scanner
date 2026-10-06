import { Candle, TradeSetup, SetupPhase, SignalDirection, QualityFilterStatus, PositionCalculation } from '../types/crypto';

/**
 * Evaluates 5-minute candlestick data according to the Breakout & Retest trading system.
 * 
 * Rules:
 * Long:
 * 1. 5m candle closes above recent 15-30m range high (3-6 candles).
 * 2. Price retests that breakout level.
 * 3. Retest holds and a new 5m candle closes upward.
 * Entry on successful retest, NOT during initial spike.
 * 
 * Short:
 * 1. 5m candle closes below recent range low (3-6 candles).
 * 2. Price retests that level from below.
 * 3. Retest fails and a new 5m candle closes downward.
 * 
 * Exit:
 * SL: ~0.75% beyond invalidation level
 * TP: ~1.5% (2:1 reward to risk)
 */
export function analyzePairCandles(
  symbol: string,
  name: string,
  candles: Candle[],
  change24h: number = 0,
  volume24h: number = 0
): TradeSetup {
  const defaultSetup: TradeSetup = {
    symbol,
    name,
    direction: 'NONE',
    phase: 'NEUTRAL',
    currentPrice: candles.length > 0 ? candles[candles.length - 1].close : 0,
    rangeHigh: 0,
    rangeLow: 0,
    breakoutPrice: 0,
    breakoutTime: 0,
    retestPrice: 0,
    entryPrice: 0,
    invalidationLevel: 0,
    stopLossPrice: 0,
    stopLossDistancePercent: 0.75,
    takeProfitPrice: 0,
    takeProfitDistancePercent: 1.5,
    rewardRiskRatio: 2.0,
    quality: {
      passedAll: true,
      breakoutSizeOk: true,
      breakoutCandlePercent: 0,
      priceNotOverextended: true,
      moveFromEntryPercent: 0,
      spreadAndFeesOk: true,
      notes: []
    },
    detectedAt: Date.now(),
    candles,
    change24h,
    volume24h,
  };

  if (!candles || candles.length < 12) {
    return defaultSetup;
  }

  const currentPrice = candles[candles.length - 1].close;
  defaultSetup.currentPrice = currentPrice;

  // Compute average 5-minute candle size (% of price) for volatility benchmarking
  let totalCandleSize = 0;
  const recentCount = Math.min(20, candles.length);
  for (let i = candles.length - recentCount; i < candles.length; i++) {
    totalCandleSize += Math.abs(candles[i].high - candles[i].low) / candles[i].close;
  }
  const avgCandleRangePct = (totalCandleSize / recentCount) * 100;

  // Let's inspect the last 1-4 candles for a retest sequence
  // Index n-1 is current/latest candle.
  // A breakout happened within the last 2 to 5 candles.
  // 15-30m range lookback is 3 to 6 candles (5m * 3 = 15m, 5m * 6 = 30m).
  const n = candles.length;

  // We search for a breakout candle between index n-5 and n-2
  for (let breakoutIdx = n - 5; breakoutIdx <= n - 2; breakoutIdx++) {
    if (breakoutIdx < 6) continue;

    // Prior 15-30m range: 3 to 6 candles prior to the breakout candle
    const rangeLookback = 5; // ~25 minutes
    const rangeCandles = candles.slice(breakoutIdx - rangeLookback, breakoutIdx);
    const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
    const rangeLow = Math.min(...rangeCandles.map(c => c.low));
    const rangeSpread = ((rangeHigh - rangeLow) / rangeLow) * 100;

    // Ignore tiny flat ranges (< 0.15%)
    if (rangeSpread < 0.15) continue;

    const bCandle = candles[breakoutIdx];
    const breakoutBodyPct = (Math.abs(bCandle.close - bCandle.open) / bCandle.open) * 100;
    const breakoutRangePct = ((bCandle.high - bCandle.low) / bCandle.low) * 100;

    // Check if breakout candle is unusually large
    // Skip rule: Breakout candle is unusually large (>1.2% or >2.4x avg 5m range)
    const isUnusuallyLarge = breakoutRangePct > 1.25 || (avgCandleRangePct > 0 && breakoutRangePct > avgCandleRangePct * 2.5);

    // --- CHECK FOR LONG SETUP ---
    // 1. 5m candle closes above the 15-30m range high
    if (bCandle.close > rangeHigh && bCandle.close > bCandle.open) {
      // Breakout occurred! Now check subsequent candles up to latest for retest
      const postBreakoutCandles = candles.slice(breakoutIdx + 1);
      
      let touchedRetest = false;
      let retestCandleIdx = -1;
      let retestPrice = 0;

      for (let i = 0; i < postBreakoutCandles.length; i++) {
        const c = postBreakoutCandles[i];
        // Retest: price dips back to test the breakout level (rangeHigh)
        // low is near or slightly penetrates rangeHigh, but does not close way back deep into range
        const retestBufferHigh = rangeHigh * 1.0035;
        const retestBufferLow = rangeHigh * 0.9975;

        if (c.low <= retestBufferHigh && c.high >= retestBufferLow) {
          touchedRetest = true;
          retestCandleIdx = breakoutIdx + 1 + i;
          retestPrice = c.low;
          break;
        }
      }

      if (touchedRetest && retestCandleIdx >= 0) {
        // Step 3: Did retest hold and a new 5-minute candle closes upward?
        // Check latest candle or the candle right after/at retest
        const latestCandle = candles[n - 1];
        const isUpwardConfirmation = latestCandle.close > latestCandle.open && latestCandle.close >= rangeHigh;
        const retestHeld = latestCandle.close >= rangeHigh * 0.998;

        // Skip rule: Price already moved > ~1.0% before entry
        const entryPrice = latestCandle.close;
        const moveFromBreakout = ((entryPrice - rangeHigh) / rangeHigh) * 100;
        const isOverextended = moveFromBreakout > 1.05;

        const qualityNotes: string[] = [];
        if (isUnusuallyLarge) qualityNotes.push('Breakout candle unusually large (>1.25%)');
        if (isOverextended) qualityNotes.push(`Price overextended (+${moveFromBreakout.toFixed(2)}% above range high)`);
        if (volume24h > 0 && volume24h < 1000000) qualityNotes.push('Lower liquidity: check order book spread');

        let phase: SetupPhase = 'RETESTING';
        if (isUnusuallyLarge) {
          phase = 'SKIPPED_LARGE_BREAKOUT';
        } else if (isOverextended) {
          phase = 'SKIPPED_OVEREXTENDED';
        } else if (!retestHeld) {
          phase = 'INVALIDATED';
        } else if (isUpwardConfirmation) {
          phase = 'SIGNAL_TRIGGERED';
        }

        // Stop-loss: ~0.75% beyond invalidation level (range high / breakout level)
        const invalidationLevel = rangeHigh;
        const stopLossPrice = invalidationLevel * (1 - 0.0075);
        const stopDistPct = ((entryPrice - stopLossPrice) / entryPrice) * 100;

        // Take-profit: ~1.5%, giving 2:1 reward-to-risk ratio
        const takeProfitPrice = entryPrice * 1.015;
        const tpDistPct = 1.5;

        return {
          symbol,
          name,
          direction: 'LONG',
          phase,
          currentPrice,
          rangeHigh,
          rangeLow,
          breakoutPrice: bCandle.close,
          breakoutTime: bCandle.time,
          retestPrice: retestPrice || rangeHigh,
          entryPrice,
          invalidationLevel,
          stopLossPrice,
          stopLossDistancePercent: Number(stopDistPct.toFixed(2)),
          takeProfitPrice,
          takeProfitDistancePercent: tpDistPct,
          rewardRiskRatio: 2.0,
          target2Price: entryPrice * 1.03, // 3.0% (4:1 R:R)
          quality: {
            passedAll: !isUnusuallyLarge && !isOverextended && retestHeld,
            breakoutSizeOk: !isUnusuallyLarge,
            breakoutCandlePercent: Number(breakoutRangePct.toFixed(2)),
            priceNotOverextended: !isOverextended,
            moveFromEntryPercent: Number(moveFromBreakout.toFixed(2)),
            spreadAndFeesOk: volume24h > 1000000 || volume24h === 0,
            notes: qualityNotes,
          },
          detectedAt: bCandle.time,
          candles,
          change24h,
          volume24h,
        };
      } else if (postBreakoutCandles.length <= 2) {
        // Breakout happened, price currently hovering right above, waiting for retest
        return {
          ...defaultSetup,
          direction: 'LONG',
          phase: isUnusuallyLarge ? 'SKIPPED_LARGE_BREAKOUT' : 'BREAKOUT_PENDING',
          rangeHigh,
          rangeLow,
          breakoutPrice: bCandle.close,
          breakoutTime: bCandle.time,
          entryPrice: currentPrice,
          invalidationLevel: rangeHigh,
          stopLossPrice: rangeHigh * (1 - 0.0075),
          stopLossDistancePercent: 0.75,
          takeProfitPrice: currentPrice * 1.015,
          takeProfitDistancePercent: 1.5,
          quality: {
            passedAll: !isUnusuallyLarge,
            breakoutSizeOk: !isUnusuallyLarge,
            breakoutCandlePercent: Number(breakoutRangePct.toFixed(2)),
            priceNotOverextended: true,
            moveFromEntryPercent: 0,
            spreadAndFeesOk: true,
            notes: isUnusuallyLarge ? ['Breakout candle unusually large'] : ['Waiting for retest of ' + rangeHigh.toFixed(4)],
          }
        };
      }
    }

    // --- CHECK FOR SHORT SETUP ---
    // 1. 5m candle closes below the 15-30m range low
    if (bCandle.close < rangeLow && bCandle.close < bCandle.open) {
      const postBreakoutCandles = candles.slice(breakoutIdx + 1);

      let touchedRetest = false;
      let retestCandleIdx = -1;
      let retestPrice = 0;

      for (let i = 0; i < postBreakoutCandles.length; i++) {
        const c = postBreakoutCandles[i];
        // Retest: price bounces from below back to test rangeLow
        const retestBufferLow = rangeLow * 0.9965;
        const retestBufferHigh = rangeLow * 1.0025;

        if (c.high >= retestBufferLow && c.low <= retestBufferHigh) {
          touchedRetest = true;
          retestCandleIdx = breakoutIdx + 1 + i;
          retestPrice = c.high;
          break;
        }
      }

      if (touchedRetest && retestCandleIdx >= 0) {
        // Step 3: Retest fails and a new candle closes downward
        const latestCandle = candles[n - 1];
        const isDownwardConfirmation = latestCandle.close < latestCandle.open && latestCandle.close <= rangeLow;
        const retestHeldAsResistance = latestCandle.close <= rangeLow * 1.002;

        const entryPrice = latestCandle.close;
        const moveFromBreakdown = ((rangeLow - entryPrice) / rangeLow) * 100;
        const isOverextended = moveFromBreakdown > 1.05;

        const qualityNotes: string[] = [];
        if (isUnusuallyLarge) qualityNotes.push('Breakdown candle unusually large (>1.25%)');
        if (isOverextended) qualityNotes.push(`Price overextended (-${moveFromBreakdown.toFixed(2)}% below range low)`);
        if (volume24h > 0 && volume24h < 1000000) qualityNotes.push('Lower liquidity: check order book spread');

        let phase: SetupPhase = 'RETESTING';
        if (isUnusuallyLarge) {
          phase = 'SKIPPED_LARGE_BREAKOUT';
        } else if (isOverextended) {
          phase = 'SKIPPED_OVEREXTENDED';
        } else if (!retestHeldAsResistance) {
          phase = 'INVALIDATED';
        } else if (isDownwardConfirmation) {
          phase = 'SIGNAL_TRIGGERED';
        }

        // Stop-loss: ~0.75% beyond invalidation level (range low)
        const invalidationLevel = rangeLow;
        const stopLossPrice = invalidationLevel * (1 + 0.0075);
        const stopDistPct = ((stopLossPrice - entryPrice) / entryPrice) * 100;

        // Take-profit: ~1.5%, giving 2:1 reward-to-risk ratio
        const takeProfitPrice = entryPrice * (1 - 0.015);
        const tpDistPct = 1.5;

        return {
          symbol,
          name,
          direction: 'SHORT',
          phase,
          currentPrice,
          rangeHigh,
          rangeLow,
          breakoutPrice: bCandle.close,
          breakoutTime: bCandle.time,
          retestPrice: retestPrice || rangeLow,
          entryPrice,
          invalidationLevel,
          stopLossPrice,
          stopLossDistancePercent: Number(stopDistPct.toFixed(2)),
          takeProfitPrice,
          takeProfitDistancePercent: tpDistPct,
          rewardRiskRatio: 2.0,
          target2Price: entryPrice * (1 - 0.03), // 3.0% (4:1 R:R)
          quality: {
            passedAll: !isUnusuallyLarge && !isOverextended && retestHeldAsResistance,
            breakoutSizeOk: !isUnusuallyLarge,
            breakoutCandlePercent: Number(breakoutRangePct.toFixed(2)),
            priceNotOverextended: !isOverextended,
            moveFromEntryPercent: Number(moveFromBreakdown.toFixed(2)),
            spreadAndFeesOk: volume24h > 1000000 || volume24h === 0,
            notes: qualityNotes,
          },
          detectedAt: bCandle.time,
          candles,
          change24h,
          volume24h,
        };
      } else if (postBreakoutCandles.length <= 2) {
        return {
          ...defaultSetup,
          direction: 'SHORT',
          phase: isUnusuallyLarge ? 'SKIPPED_LARGE_BREAKOUT' : 'BREAKOUT_PENDING',
          rangeHigh,
          rangeLow,
          breakoutPrice: bCandle.close,
          breakoutTime: bCandle.time,
          entryPrice: currentPrice,
          invalidationLevel: rangeLow,
          stopLossPrice: rangeLow * (1 + 0.0075),
          stopLossDistancePercent: 0.75,
          takeProfitPrice: currentPrice * (1 - 0.015),
          takeProfitDistancePercent: 1.5,
          quality: {
            passedAll: !isUnusuallyLarge,
            breakoutSizeOk: !isUnusuallyLarge,
            breakoutCandlePercent: Number(breakoutRangePct.toFixed(2)),
            priceNotOverextended: true,
            moveFromEntryPercent: 0,
            spreadAndFeesOk: true,
            notes: isUnusuallyLarge ? ['Breakdown candle unusually large'] : ['Waiting for retest of ' + rangeLow.toFixed(4)],
          }
        };
      }
    }
  }

  // If no setup occurred, calculate the recent 15-30m range for reference
  const lookback = Math.min(6, candles.length);
  const recentSubset = candles.slice(candles.length - lookback);
  defaultSetup.rangeHigh = Math.max(...recentSubset.map(c => c.high));
  defaultSetup.rangeLow = Math.min(...recentSubset.map(c => c.low));
  defaultSetup.invalidationLevel = defaultSetup.rangeHigh;
  defaultSetup.stopLossPrice = defaultSetup.rangeHigh * 0.9925;
  defaultSetup.takeProfitPrice = currentPrice * 1.015;

  return defaultSetup;
}

/**
 * Calculates Position Sizing based on the exact user formula:
 * 
 * Position notional = Maximum dollar risk ÷ Stop-loss distance
 * Example from user prompt:
 * Maximum risk: 1.11 USDT
 * Stop distance: 0.75% (0.0075)
 * Position size: 1.11 ÷ 0.0075 = approximately 148 USDT notional
 * At 2x leverage, required margin = 74 USDT
 */
export function calculatePositionSizing(
  maxDollarRisk: number,
  stopDistancePercent: number, // e.g. 0.75 for 0.75%
  entryPrice: number,
  leverage: number = 2
): PositionCalculation {
  const safeRisk = Math.max(0.1, maxDollarRisk);
  const safeStopPct = Math.max(0.01, stopDistancePercent);
  const decimalStopDistance = safeStopPct / 100; // e.g. 0.0075

  // Formula: Position notional = Maximum dollar risk ÷ Stop-loss distance
  const positionNotionalUSDT = safeRisk / decimalStopDistance;

  // Margin required at chosen leverage: notional / leverage
  const safeLeverage = Math.max(1, leverage);
  const requiredMarginUSDT = positionNotionalUSDT / safeLeverage;

  // Token quantity
  const safeEntryPrice = Math.max(0.0000001, entryPrice);
  const tokenQuantity = positionNotionalUSDT / safeEntryPrice;

  // Potential loss at stop loss = exactly the max dollar risk
  const potentialLossUSDT = safeRisk;

  // Potential profit at 2:1 take profit (1.5% distance) = 2x the dollar risk
  const potentialProfitUSDT = safeRisk * 2.0;

  return {
    maxDollarRisk: safeRisk,
    stopDistancePercent: safeStopPct,
    positionNotionalUSDT: Math.round(positionNotionalUSDT * 100) / 100,
    leverage: safeLeverage,
    requiredMarginUSDT: Math.round(requiredMarginUSDT * 100) / 100,
    tokenQuantity: tokenQuantity,
    potentialLossUSDT: Math.round(potentialLossUSDT * 100) / 100,
    potentialProfitUSDT: Math.round(potentialProfitUSDT * 100) / 100,
    rewardRiskRatio: 2.0,
  };
}
