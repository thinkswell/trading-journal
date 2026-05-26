import { Trade, Strategy, TradeStatus } from '../types';
import { getTradeStats, calculateCurrentWinStreak, calculateCurrentLossStreak } from './tradeCalculations';

export interface PortfolioStatsOptions {
  strategies?: Strategy[];
  initialCapital?: number;
  includeStreaks?: boolean;
  includeHoldingPeriods?: boolean;
  includePortfolioImpacts?: boolean;
}

export interface PortfolioStats {
  totalPL: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  amountInvested: number;
  riskOnCapital: number;
  gainOnCapital: number;
  totalCapital: number;
  totalRisk: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakevenTradesCount: number;
  currentCapital?: number;
  openTradesCount?: number;
  closedTradesCount?: number;
  avgHoldingPeriodWinning?: number;
  avgHoldingPeriodLosing?: number;
  avgPortfolioImpactWinning?: number;
  avgPortfolioImpactLosing?: number;
  winStreak?: number;
  lossStreak?: number;
  percentCapitalInvested?: number;
}

const getEffectiveInitialCapital = (strategies: Strategy[] | undefined, directCapital: number | undefined): number => {
  if (directCapital !== undefined) {
    return directCapital;
  }
  if (strategies) {
    return strategies.reduce((acc, s) => acc + s.initialCapital, 0);
  }
  return 0;
};

export const calculatePortfolioStats = (
  trades: Trade[],
  options: PortfolioStatsOptions = {}
): PortfolioStats => {
  const { strategies, initialCapital, includeStreaks = false, includeHoldingPeriods = false, includePortfolioImpacts = false } = options;
  
  let totalPL = 0;
  let amountInvested = 0;
  let totalRisk = 0;
  const closedTrades: Trade[] = [];
  
  trades.forEach(trade => {
    const tradeStats = getTradeStats(trade);
    if (tradeStats.isClosed) {
      closedTrades.push(trade);
      totalPL += tradeStats.realizedPL;
    } else {
      amountInvested += tradeStats.currentValue;
      totalRisk += Math.max(0, tradeStats.totalRiskValue);
    }
  });

  const totalTrades = trades.length;
  const winningTrades = closedTrades.filter(t => t.status === 'win');
  const losingTrades = closedTrades.filter(t => t.status === 'loss');
  const breakevenTrades = closedTrades.filter(t => t.status === 'breakeven');

  const winRate = closedTrades.length > 0 
    ? ((winningTrades.length + breakevenTrades.length) / closedTrades.length) * 100 
    : 0;
  
  const totalWinsValue = winningTrades.reduce((sum, trade) => sum + getTradeStats(trade).realizedPL, 0);
  const totalLossesValue = losingTrades.reduce((sum, trade) => sum + Math.abs(getTradeStats(trade).realizedPL), 0);
  const profitFactor = totalLossesValue > 0 ? totalWinsValue / totalLossesValue : 0;

  const capital = getEffectiveInitialCapital(strategies, initialCapital);
  const riskOnCapital = capital > 0 ? (totalRisk / capital) * 100 : 0;
  const gainOnCapital = capital > 0 ? (totalPL / capital) * 100 : 0;

  const result: PortfolioStats = {
    totalPL,
    winRate,
    totalTrades,
    profitFactor,
    amountInvested,
    riskOnCapital,
    gainOnCapital,
    totalCapital: capital,
    totalRisk,
    winningTradesCount: winningTrades.length,
    losingTradesCount: losingTrades.length,
    breakevenTradesCount: breakevenTrades.length,
  };

  if (strategies && strategies.length === 1) {
    const strategy = strategies[0];
    const currentCapital = strategy.initialCapital + totalPL;
    result.currentCapital = currentCapital;
    result.openTradesCount = totalTrades - closedTrades.length;
    result.closedTradesCount = closedTrades.length;
    result.percentCapitalInvested = capital > 0 ? (amountInvested / capital) * 100 : 0;

    if (includeStreaks) {
      result.winStreak = calculateCurrentWinStreak(trades);
      result.lossStreak = calculateCurrentLossStreak(trades);
    }

    if (includeHoldingPeriods) {
      const winningTradesWithCloseDate = winningTrades.filter(t => t.closeDate);
      const losingTradesWithCloseDate = losingTrades.filter(t => t.closeDate);
      
      if (winningTradesWithCloseDate.length > 0) {
        const totalDaysWinning = winningTradesWithCloseDate.reduce((sum, trade) => {
          const entryDate = new Date(trade.date).getTime();
          const closeDate = new Date(trade.closeDate!).getTime();
          const days = Math.floor((closeDate - entryDate) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        result.avgHoldingPeriodWinning = totalDaysWinning / winningTradesWithCloseDate.length;
      }
      
      if (losingTradesWithCloseDate.length > 0) {
        const totalDaysLosing = losingTradesWithCloseDate.reduce((sum, trade) => {
          const entryDate = new Date(trade.date).getTime();
          const closeDate = new Date(trade.closeDate!).getTime();
          const days = Math.floor((closeDate - entryDate) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        result.avgHoldingPeriodLosing = totalDaysLosing / losingTradesWithCloseDate.length;
      }
    }

    if (includePortfolioImpacts) {
      if (winningTrades.length > 0 && strategy.initialCapital > 0) {
        const totalImpactWinning = winningTrades.reduce((sum, trade) => {
          const tradeStats = getTradeStats(trade);
          const impact = (tradeStats.realizedPL / strategy.initialCapital) * 100;
          return sum + impact;
        }, 0);
        result.avgPortfolioImpactWinning = totalImpactWinning / winningTrades.length;
      }
      
      if (losingTrades.length > 0 && strategy.initialCapital > 0) {
        const totalImpactLosing = losingTrades.reduce((sum, trade) => {
          const tradeStats = getTradeStats(trade);
          const impact = (tradeStats.realizedPL / strategy.initialCapital) * 100;
          return sum + impact;
        }, 0);
        result.avgPortfolioImpactLosing = totalImpactLosing / losingTrades.length;
      }
    }
  }

  return result;
};

export const calculateFilteredTrades = (
  trades: Trade[],
  filters: {
    assetFilter?: string;
    statusFilter?: TradeStatus | 'all' | 'closed';
    strategyId?: string;
  }
): Trade[] => {
  return trades.filter(trade => {
    const assetMatch = filters.assetFilter 
      ? trade.asset.toLowerCase().includes(filters.assetFilter.toLowerCase()) 
      : true;
    
    let statusMatch = true;
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'closed') {
        statusMatch = trade.status !== 'open';
      } else {
        statusMatch = trade.status === filters.statusFilter;
      }
    }
    
    const strategyMatch = filters.strategyId 
      ? trade.strategyId === filters.strategyId 
      : true;
    
    return assetMatch && statusMatch && strategyMatch;
  });
};

export const sortTrades = (
  trades: Trade[],
  sortOption: 'date' | 'date-desc' | 'asset' | 'asset-desc' | 'percentInvested' | 'percentInvested-desc',
  capital?: number
): Trade[] => {
  const tradesCopy = [...trades];
  
  return tradesCopy.sort((a, b) => {
    switch (sortOption) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-desc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'asset':
        return a.asset.localeCompare(b.asset);
      case 'asset-desc':
        return b.asset.localeCompare(a.asset);
      case 'percentInvested':
      case 'percentInvested-desc': {
        const statsA = getTradeStats(a);
        const statsB = getTradeStats(b);
        const capitalA = capital || 1;
        const percentA = (statsA.totalInvested / capitalA) * 100;
        const percentB = (statsB.totalInvested / capitalA) * 100;
        return sortOption === 'percentInvested' ? percentB - percentA : percentA - percentB;
      }
      default:
        return 0;
    }
  });
};