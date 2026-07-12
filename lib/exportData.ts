import { Strategy, Trade } from '../types';
import { calculatePortfolioStats, PortfolioStats } from './portfolioStats';

export interface ExportMetadata {
  exportedAt: string;
  scope: 'dashboard' | 'strategy';
  source: string;
  version: number;
  strategyId?: string;
  strategyName?: string;
}

export interface DashboardExportPayload {
  metadata: ExportMetadata;
  strategies: Strategy[];
  stats: PortfolioStats;
}

export interface StrategyExportPayload {
  metadata: ExportMetadata;
  strategy: Strategy;
  stats: PortfolioStats;
}

const sanitizeFileName = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const cloneTrade = (trade: Trade): Trade => ({
  ...trade,
  pyramids: trade.pyramids ? [...trade.pyramids] : [],
  trailingStops: trade.trailingStops ? [...trade.trailingStops] : [],
  partialExits: trade.partialExits ? [...trade.partialExits] : [],
});

const cloneStrategy = (strategy: Strategy): Strategy => ({
  ...strategy,
  trades: strategy.trades ? strategy.trades.map(cloneTrade) : [],
});

const buildExportFilename = (prefix: string, suffix: string): string => {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safePrefix = sanitizeFileName(prefix) || 'export';
  const safeSuffix = sanitizeFileName(suffix) || 'data';
  return `${safePrefix}-${safeSuffix}-${dateStamp}.json`;
};

export const buildDashboardExportPayload = (allTrades: Trade[], strategies: Strategy[]): DashboardExportPayload => {
  const stats = calculatePortfolioStats(allTrades, { strategies });

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      scope: 'dashboard',
      source: 'trading-journal-dashboard',
      version: 1,
    },
    strategies: strategies.map(cloneStrategy),
    stats,
  };
};

export const buildStrategyExportPayload = (strategy: Strategy): StrategyExportPayload => {
  const stats = calculatePortfolioStats(strategy.trades, {
    strategies: [strategy],
    initialCapital: strategy.initialCapital,
    includeStreaks: true,
    includeHoldingPeriods: true,
    includePortfolioImpacts: true,
  });

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      scope: 'strategy',
      source: 'trading-journal-strategy',
      version: 1,
      strategyId: strategy.id,
      strategyName: strategy.name,
    },
    strategy: cloneStrategy(strategy),
    stats,
  };
};

export const downloadJsonExport = (payload: DashboardExportPayload | StrategyExportPayload, filename: string): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getDashboardExportFilename = (): string => {
  return buildExportFilename('dashboard', 'all-data');
};

export const getStrategyExportFilename = (strategyName: string): string => {
  return buildExportFilename(sanitizeFileName(strategyName) || 'strategy', 'export');
};
