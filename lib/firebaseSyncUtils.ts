import { Strategy, Trade } from '../types';

/**
 * Compares local and remote strategies to determine if remote has new data
 * Returns true if remote has new strategies or new trades that don't exist locally
 */
export const hasNewData = (local: Strategy[], remote: Strategy[]): boolean => {
  // Check if remote has more strategies
  if (remote.length > local.length) {
    return true;
  }

  // Create maps for quick lookup
  const localStrategyMap = new Map(local.map(s => [s.id, s]));
  const localTradeIds = new Set<string>();
  local.forEach(s => s.trades.forEach(t => localTradeIds.add(t.id)));

  // Check for new strategies or new trades
  for (const remoteStrategy of remote) {
    const localStrategy = localStrategyMap.get(remoteStrategy.id);
    
    // If strategy doesn't exist locally, it's new
    if (!localStrategy) {
      return true;
    }

    // Check if remote has trades that don't exist locally
    for (const remoteTrade of remoteStrategy.trades) {
      if (!localTradeIds.has(remoteTrade.id)) {
        return true; // New trade found
      }
    }
  }

  return false; // No new data found
};

/**
 * Intelligently merges remote data with local data
 * - Adds new strategies from remote
 * - Adds new trades from remote
 * - Keeps local version for existing trades (preserves edits)
 * - Keeps local-only strategies and trades
 */
export const mergeStrategies = (local: Strategy[], remote: Strategy[]): Strategy[] => {
  // Create maps for quick lookup
  const localStrategyMap = new Map(local.map(s => [s.id, s]));
  const localTradeMap = new Map<string, { strategyId: string; trade: Trade }>();
  local.forEach(s => s.trades.forEach(t => localTradeMap.set(t.id, { strategyId: s.id, trade: t })));

  const mergedStrategies: Strategy[] = [];
  const processedStrategyIds = new Set<string>();

  // Process remote strategies
  for (const remoteStrategy of remote) {
    const localStrategy = localStrategyMap.get(remoteStrategy.id);
    processedStrategyIds.add(remoteStrategy.id);

    if (!localStrategy) {
      // New strategy from remote - add it
      mergedStrategies.push(remoteStrategy);
    } else {
      // Strategy exists locally - merge trades
      const localTradeMapForStrategy = new Map(localStrategy.trades.map(t => [t.id, t]));
      const mergedTrades: Trade[] = [...localStrategy.trades]; // Start with local trades

      // Add new trades from remote that don't exist locally
      for (const remoteTrade of remoteStrategy.trades) {
        if (!localTradeMapForStrategy.has(remoteTrade.id)) {
          mergedTrades.push(remoteTrade); // New trade from remote
        }
        // If trade exists in both, keep local version (preserves edits)
      }

      // Create merged strategy with updated trades
      mergedStrategies.push({
        ...localStrategy,
        trades: mergedTrades,
        // Keep local strategy name and capital (user may have edited)
      });
    }
  }

  // Add local strategies that don't exist in remote (local-only strategies)
  for (const localStrategy of local) {
    if (!processedStrategyIds.has(localStrategy.id)) {
      mergedStrategies.push(localStrategy);
    }
  }

  return mergedStrategies;
};

