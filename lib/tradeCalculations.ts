import { Trade } from '../types';

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
  const totalRiskValue = currentHoldingsQty * (avgEntryPrice - trade.initialSl);

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