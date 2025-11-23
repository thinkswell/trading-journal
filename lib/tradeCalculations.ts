import { Trade, TradeStatus } from '../types';

export interface TradeStats {
  totalBoughtQty: number;
  totalSoldQty: number;
  currentHoldingsQty: number;
  totalInvested: number;
  avgEntryPrice: number;
  totalProceeds: number;
  avgExitPrice: number;
  realizedPL: number;
  isClosed: boolean;
  currentValue: number; // For open positions
  totalRiskValue: number; // For open positions
  initialTotalRisk: number;
  rMultiple: number;
}

/**
 * Gets the effective stop loss for a trade
 * Uses the highest trailing stop price if any exist, otherwise falls back to initial stop loss
 * @param trade - The trade to get effective stop loss for
 * @returns The effective stop loss price (highest trailing stop, or initialSl, or 0)
 */
const getEffectiveStopLoss = (trade: Trade): number => {
  // If trailing stops exist, use the highest one (most protective)
  if (trade.trailingStops && trade.trailingStops.length > 0) {
    const trailingStopPrices = trade.trailingStops
      .map(ts => ts.price)
      .filter(price => price > 0);
    
    if (trailingStopPrices.length > 0) {
      return Math.max(...trailingStopPrices);
    }
  }
  
  // Fall back to initial stop loss
  return trade.initialSl || 0;
};

/**
 * Calculates the trade status based on realized P/L and initial investment
 * Uses ±0.5% threshold for breakeven based on initial entry price
 * @param stats - Trade statistics from getTradeStats
 * @param initialInvestment - Initial entry investment (entryPrice * quantity)
 * @returns Calculated trade status
 */
export const calculateTradeStatus = (stats: TradeStats, initialInvestment: number): TradeStatus => {
  // If trade is not closed, status should remain 'open'
  if (!stats.isClosed) {
    return 'open';
  }

  // Calculate P/L percentage based on initial entry investment
  const plPercentage = initialInvestment > 0 ? (stats.realizedPL / initialInvestment) * 100 : 0;

  // Breakeven if within ±0.5% of initial entry
  if (plPercentage >= -0.5 && plPercentage <= 0.5) {
    return 'breakeven';
  } else if (stats.realizedPL > 0) {
    return 'win';
  } else {
    return 'loss';
  }
};

export const getTradeStats = (trade: Trade): TradeStats => {
  const initialInvestment = trade.entryPrice * trade.quantity;
  const initialBoughtQty = trade.quantity;

  const pyramidInvestments = trade.pyramids.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const pyramidBoughtQty = trade.pyramids.reduce((sum, p) => sum + p.quantity, 0);

  const totalInvested = initialInvestment + pyramidInvestments;
  const totalBoughtQty = initialBoughtQty + pyramidBoughtQty;
  const avgEntryPrice = totalBoughtQty > 0 ? totalInvested / totalBoughtQty : 0;
  
  // Base values from partials
  let totalProceeds = (trade.partialExits || []).reduce((sum, pe) => sum + (pe.price * pe.quantity), 0);
  let totalSoldQty = (trade.partialExits || []).reduce((sum, pe) => sum + pe.quantity, 0);
  
  const currentHoldingsQty = totalBoughtQty - totalSoldQty;
  let isClosed = trade.status !== 'open';

  // Case 1: Closed via single exit price (no partials)
  if (isClosed && trade.exitPrice && (trade.partialExits || []).length === 0) {
      totalSoldQty = totalBoughtQty;
      totalProceeds = trade.exitPrice * totalBoughtQty;
  }
  
  // Case 2: Closed via selling all shares through partials
  if (totalBoughtQty > 0 && currentHoldingsQty <= 0) {
      isClosed = true;
  }
  
  const avgExitPrice = totalSoldQty > 0 ? totalProceeds / totalSoldQty : 0;

  let realizedPL = 0;
  // For open trades, realized P/L is based on what has been sold so far
  const costOfGoodsSold = avgEntryPrice * totalSoldQty;
  realizedPL = totalProceeds - costOfGoodsSold;
  
  // For closed trades, realized P/L is total proceeds vs total investment
  if (isClosed) {
    realizedPL = totalProceeds - totalInvested;
  }
  
  const currentValue = currentHoldingsQty * avgEntryPrice; // Based on avg entry, not a live price
  
  // Use effective stop loss (trailing stop if available, otherwise initial SL) for current risk
  const effectiveStopLoss = getEffectiveStopLoss(trade);
  const totalRiskValue = currentHoldingsQty * (avgEntryPrice - effectiveStopLoss);

  // Initial total risk always uses initial SL (historical risk at trade entry)
  const initialTotalRisk = totalBoughtQty > 0 ? totalBoughtQty * (avgEntryPrice - trade.initialSl) : 0;
  const rMultiple = isClosed && initialTotalRisk > 0 ? realizedPL / initialTotalRisk : 0;


  return {
    totalBoughtQty,
    totalSoldQty,
    currentHoldingsQty,
    totalInvested,
    avgEntryPrice,
    totalProceeds,
    avgExitPrice,
    realizedPL,
    isClosed,
    currentValue,
    totalRiskValue,
    initialTotalRisk,
    rMultiple,
  };
};