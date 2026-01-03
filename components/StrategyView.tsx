import React, { useState, useMemo, useEffect } from 'react';
import { Strategy, Trade, TradeStatus } from '../types';
import TradeList from './TradeList';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon } from './icons/PlusIcon';
import { EditIcon } from './icons/EditIcon';
import StatCard from './StatCard';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { MoneyIcon } from './icons/MoneyIcon';
import { BagOfMoneyIcon } from './icons/BagOfMoneyIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { ReceiptPercentIcon } from './icons/ReceiptPercentIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { PinIcon } from './icons/PinIcon';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface StrategyViewProps {
  strategy: Strategy;
  onDeleteTrade: (tradeId: string, strategyId: string) => void;
  onUpdateStrategy: (strategyId: string, name: string, initialCapital: number) => void;
  onDeleteStrategy: (strategyId: string) => void;
  navigateTo: (view: string) => void;
  onOpenTradeForm: (trade: Trade | null) => void;
  onMoveTrade?: (trade: Trade, targetStrategyId: string) => void;
  onCopyTrade?: (trade: Trade, targetStrategyId: string) => void;
  strategies?: Strategy[];
}

type StrategyStatKey = 'currentCapital' | 'totalPL' | 'gainOnCapital' | 'amountInvested' | 'riskPercent' | 'winRate' | 'totalTrades';
type SortOption = 'date' | 'asset' | 'percentInvested';
type StatusFilter = 'all' | 'open' | 'closed' | 'win' | 'loss' | 'breakeven';

const DEFAULT_PINNED_STATS: StrategyStatKey[] = ['currentCapital', 'gainOnCapital'];

const StrategyView: React.FC<StrategyViewProps> = ({ strategy, onDeleteTrade, onUpdateStrategy, onDeleteStrategy, navigateTo, onOpenTradeForm, onMoveTrade, onCopyTrade, strategies }) => {
  const [isEditStrategyModalOpen, setIsEditStrategyModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(strategy.name);
  const [editedCapital, setEditedCapital] = useState(strategy.initialCapital.toString());
  const [pinnedStats, setPinnedStats] = useLocalStorage<StrategyStatKey[]>('strategy-view-pinned-stats', DEFAULT_PINNED_STATS);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [sortOption, setSortOption] = useLocalStorage<SortOption>('strategy-view-sort-option', 'date');
  const [statusFilter, setStatusFilter] = useLocalStorage<StatusFilter>('strategy-view-status-filter', 'all');
  const { currency } = useSettings();
  
  useEffect(() => {
    setEditedName(strategy.name);
    setEditedCapital(strategy.initialCapital.toString());
  }, [strategy]);


  const handleNewTrade = () => {
    onOpenTradeForm(null);
  };
  
  const handleEditTrade = (trade: Trade) => {
    onOpenTradeForm(trade);
  }

  const handleUpdateStrategy = () => {
    if (editedName.trim() && parseFloat(editedCapital) >= 0) {
      onUpdateStrategy(strategy.id, editedName.trim(), parseFloat(editedCapital));
      setIsEditStrategyModalOpen(false);
    }
  };

  const handleDeleteStrategy = () => {
    onDeleteStrategy(strategy.id);
    setIsConfirmDeleteOpen(false);
    setIsEditStrategyModalOpen(false);
  };
  
  const stats = useMemo(() => {
    let totalPL = 0;
    let amountInvested = 0;
    let totalRisk = 0;
    const closedTrades: Trade[] = [];

    strategy.trades.forEach(trade => {
        const tradeStats = getTradeStats(trade);
        if (tradeStats.isClosed) {
            closedTrades.push(trade);
            totalPL += tradeStats.realizedPL;
        } else {
            amountInvested += tradeStats.currentValue;
            // Only add risk if it's actual risk (positive value)
            // If trade is profitable (negative risk), treat as 0 risk
            totalRisk += Math.max(0, tradeStats.totalRiskValue);
        }
    });

    const currentCapital = strategy.initialCapital + totalPL;
    const totalTrades = strategy.trades.length;
    const openTradesCount = totalTrades - closedTrades.length;
    const closedTradesCount = closedTrades.length;
    const winningTrades = closedTrades.filter(t => t.status === 'win');
    const losingTrades = closedTrades.filter(t => t.status === 'loss');
    const breakevenTrades = closedTrades.filter(t => t.status === 'breakeven');
    // Treat breakevens as wins when calculating win rate
    const winRate = closedTrades.length > 0 ? ((winningTrades.length + breakevenTrades.length) / closedTrades.length) * 100 : 0;
    
    const riskPercent = strategy.initialCapital > 0 ? (totalRisk / strategy.initialCapital) * 100 : 0;
    const gainOnCapital = strategy.initialCapital > 0 ? (totalPL / strategy.initialCapital) * 100 : 0;
    const percentCapitalInvested = strategy.initialCapital > 0 ? (amountInvested / strategy.initialCapital) * 100 : 0;

    // Calculate average holding period for winning and losing trades
    const winningTradesWithCloseDate = winningTrades.filter(t => t.closeDate);
    const losingTradesWithCloseDate = losingTrades.filter(t => t.closeDate);
    
    let avgHoldingPeriodWinning = 0;
    if (winningTradesWithCloseDate.length > 0) {
      const totalDaysWinning = winningTradesWithCloseDate.reduce((sum, trade) => {
        const entryDate = new Date(trade.date).getTime();
        const closeDate = new Date(trade.closeDate!).getTime();
        const days = Math.floor((closeDate - entryDate) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgHoldingPeriodWinning = totalDaysWinning / winningTradesWithCloseDate.length;
    }
    
    let avgHoldingPeriodLosing = 0;
    if (losingTradesWithCloseDate.length > 0) {
      const totalDaysLosing = losingTradesWithCloseDate.reduce((sum, trade) => {
        const entryDate = new Date(trade.date).getTime();
        const closeDate = new Date(trade.closeDate!).getTime();
        const days = Math.floor((closeDate - entryDate) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgHoldingPeriodLosing = totalDaysLosing / losingTradesWithCloseDate.length;
    }

    // Calculate average portfolio impact for winning and losing trades
    let avgPortfolioImpactWinning = 0;
    if (winningTrades.length > 0 && strategy.initialCapital > 0) {
      const totalImpactWinning = winningTrades.reduce((sum, trade) => {
        const tradeStats = getTradeStats(trade);
        const impact = (tradeStats.realizedPL / strategy.initialCapital) * 100;
        return sum + impact;
      }, 0);
      avgPortfolioImpactWinning = totalImpactWinning / winningTrades.length;
    }
    
    let avgPortfolioImpactLosing = 0;
    if (losingTrades.length > 0 && strategy.initialCapital > 0) {
      const totalImpactLosing = losingTrades.reduce((sum, trade) => {
        const tradeStats = getTradeStats(trade);
        const impact = (tradeStats.realizedPL / strategy.initialCapital) * 100;
        return sum + impact;
      }, 0);
      avgPortfolioImpactLosing = totalImpactLosing / losingTrades.length;
    }

    return { 
      totalPL, 
      currentCapital, 
      winRate, 
      totalTrades, 
      amountInvested, 
      riskPercent, 
      gainOnCapital, 
      totalRisk,
      openTradesCount,
      closedTradesCount,
      avgHoldingPeriodWinning,
      avgHoldingPeriodLosing,
      avgPortfolioImpactWinning,
      avgPortfolioImpactLosing,
      winningTradesCount: winningTrades.length,
      losingTradesCount: losingTrades.length,
      breakevenTradesCount: breakevenTrades.length,
      percentCapitalInvested
    };
  }, [strategy]);

  // Define all stats with their keys
  const allStats = useMemo(() => {
    // Format average holding period sublabel with tooltips
    let holdingPeriodSublabel: string | React.ReactNode = '';
    const hasWinningHoldingData = stats.winningTradesCount > 0 && stats.avgHoldingPeriodWinning > 0;
    const hasLosingHoldingData = stats.losingTradesCount > 0 && stats.avgHoldingPeriodLosing > 0;
    
    if (hasWinningHoldingData || hasLosingHoldingData) {
      const parts: React.ReactNode[] = [];
      
      if (hasWinningHoldingData) {
        parts.push(
          <span key="winning" className="relative group/w-tooltip inline-block">
            <span className="cursor-help">W:</span>
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/w-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
              Average holding period for winning trades
            </div>
          </span>
        );
        parts.push(` ${stats.avgHoldingPeriodWinning.toFixed(1)} days`);
      }
      
      if (hasWinningHoldingData && hasLosingHoldingData) {
        parts.push(', ');
      }
      
      if (hasLosingHoldingData) {
        parts.push(
          <span key="losing" className="relative group/l-tooltip inline-block">
            <span className="cursor-help">L:</span>
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/l-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
              Average holding period for losing trades
            </div>
          </span>
        );
        parts.push(` ${stats.avgHoldingPeriodLosing.toFixed(1)} days`);
      }
      
      holdingPeriodSublabel = (
        <span className="text-sm text-[#A0A0A0]">
          {parts}
        </span>
      );
    }

    // Format average portfolio impact sublabel with tooltips
    let portfolioImpactSublabel: string | React.ReactNode = '';
    const hasWinningImpactData = stats.winningTradesCount > 0;
    const hasLosingImpactData = stats.losingTradesCount > 0;
    
    if (hasWinningImpactData || hasLosingImpactData) {
      const parts: React.ReactNode[] = [];
      
      if (hasWinningImpactData) {
        parts.push(
          <span key="winning" className="relative group/w-tooltip inline-block">
            <span className="cursor-help">W:</span>
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/w-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
              Average portfolio impact of winning trades
            </div>
          </span>
        );
        parts.push(` ${stats.avgPortfolioImpactWinning.toFixed(2)}%`);
      }
      
      if (hasWinningImpactData && hasLosingImpactData) {
        parts.push(', ');
      }
      
      if (hasLosingImpactData) {
        parts.push(
          <span key="losing" className="relative group/l-tooltip inline-block">
            <span className="cursor-help">L:</span>
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/l-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
              Average portfolio impact of losing trades
            </div>
          </span>
        );
        parts.push(` ${stats.avgPortfolioImpactLosing.toFixed(2)}%`);
      }
      
      portfolioImpactSublabel = (
        <span className="text-sm text-[#A0A0A0]">
          {parts}
        </span>
      );
    }

    // Format win rate sublabel with tooltips
    const winRateSublabel = (
      <span className="text-sm text-[#A0A0A0]">
        <span className="relative group/w-tooltip inline-block">
          <span className="cursor-help">W:</span>
          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/w-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
            Number of Wins
          </div>
        </span>
        {` ${stats.winningTradesCount}, `}
        <span className="relative group/l-tooltip inline-block">
          <span className="cursor-help">L:</span>
          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/l-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
            Number of Losses
          </div>
        </span>
        {` ${stats.losingTradesCount}, `}
        <span className="relative group/b-tooltip inline-block">
          <span className="cursor-help">B:</span>
          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/b-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
            Number of Breakevens
          </div>
        </span>
        {` ${stats.breakevenTradesCount}`}
      </span>
    );

    return [
      { key: 'currentCapital' as StrategyStatKey, title: 'Current Capital', value: formatCurrency(stats.currentCapital, currency), icon: <MoneyIcon />, isPositive: undefined },
      { key: 'totalPL' as StrategyStatKey, title: 'Strategy P/L', value: formatCurrency(stats.totalPL, currency), icon: <BagOfMoneyIcon />, isPositive: stats.totalPL >= 0 },
      { key: 'gainOnCapital' as StrategyStatKey, title: '% Gain on Capital', value: `${stats.gainOnCapital.toFixed(2)}%`, icon: <TrendingUpIcon />, isPositive: stats.gainOnCapital >= 0, sublabel: portfolioImpactSublabel || undefined },
      { key: 'amountInvested' as StrategyStatKey, title: 'Amount Invested', value: formatCurrency(stats.amountInvested, currency), icon: <ScaleIcon />, isPositive: undefined, sublabel: `${stats.percentCapitalInvested.toFixed(2)}% of capital currently invested` },
      { key: 'riskPercent' as StrategyStatKey, title: '% Risk', value: `${stats.riskPercent.toFixed(2)}%`, icon: <ReceiptPercentIcon />, isPositive: stats.riskPercent < 5, sublabel: formatCurrency(stats.totalRisk, currency) },
      { key: 'winRate' as StrategyStatKey, title: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: <TrendingUpIcon />, isPositive: stats.winRate >= 50, sublabel: winRateSublabel },
      { key: 'totalTrades' as StrategyStatKey, title: 'Total Trades', value: stats.totalTrades.toString(), icon: <CalculatorIcon />, isPositive: undefined, sublabel: holdingPeriodSublabel || undefined },
    ];
  }, [stats, currency]);

  // Separate stats into pinned and unpinned
  const pinnedStatsList = useMemo(() => {
    return allStats.filter(stat => pinnedStats.includes(stat.key));
  }, [allStats, pinnedStats]);

  const unpinnedStatsList = useMemo(() => {
    return allStats.filter(stat => !pinnedStats.includes(stat.key));
  }, [allStats, pinnedStats]);

  const handlePinStat = (statKey: StrategyStatKey) => {
    if (pinnedStats.includes(statKey)) {
      // Unpin
      setPinnedStats(pinnedStats.filter(key => key !== statKey));
    } else {
      // Pin (max 2)
      if (pinnedStats.length < 2) {
        setPinnedStats([...pinnedStats, statKey]);
      } else {
        // Replace the first pinned stat
        setPinnedStats([pinnedStats[1], statKey]);
      }
    }
  };

  // Filter trades by status
  const filteredTrades = useMemo(() => {
    return strategy.trades.filter(trade => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'closed') return trade.status !== 'open';
      return trade.status === statusFilter;
    });
  }, [strategy.trades, statusFilter]);

  // Sort trades
  const sortedTrades = useMemo(() => {
    const trades = [...filteredTrades];
    
    return trades.sort((a, b) => {
      switch (sortOption) {
        case 'date':
          // Newest first (descending)
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'asset':
          // A-Z (ascending)
          return a.asset.localeCompare(b.asset);
        case 'percentInvested':
          // Highest first (descending)
          const statsA = getTradeStats(a);
          const statsB = getTradeStats(b);
          const percentA = strategy.initialCapital > 0 ? (statsA.totalInvested / strategy.initialCapital) * 100 : 0;
          const percentB = strategy.initialCapital > 0 ? (statsB.totalInvested / strategy.initialCapital) * 100 : 0;
          return percentB - percentA;
        default:
          return 0;
      }
    });
  }, [filteredTrades, sortOption, strategy.initialCapital]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
              {strategy.name}
            </h1>
            <button 
                onClick={() => setIsEditStrategyModalOpen(true)} 
                className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
                aria-label="Edit Strategy"
            >
                <EditIcon />
            </button>
        </div>
        <button 
          onClick={handleNewTrade}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                    shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusIcon />
          Add Trade
        </button>
      </div>

      {/* Desktop: Show all stats in grid */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {allStats.map(stat => (
          <StatCard key={stat.key} icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} sublabel={stat.sublabel} />
        ))}
      </div>

      {/* Mobile: Show pinned stats at top, rest in accordion */}
      <div className="md:hidden space-y-4">
        {/* Pinned Stats */}
        <div className="flex flex-col gap-4">
          {pinnedStatsList.map(stat => (
            <div key={stat.key} className="relative">
              <StatCard icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} sublabel={stat.sublabel} />
              <button
                onClick={() => handlePinStat(stat.key)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#6A5ACD]/20 hover:bg-[#6A5ACD]/30 text-[#6A5ACD] transition-all duration-200"
                aria-label="Unpin stat"
              >
                <PinIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Accordion for unpinned stats */}
        {unpinnedStatsList.length > 0 && (
          <div className="glass-card rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <span className="text-white font-semibold">
                Other Stats ({unpinnedStatsList.length})
              </span>
              <span className={`text-[#A0A0A0] transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isAccordionOpen && (
              <div className="grid grid-cols-2 gap-4 p-4 border-t border-[rgba(255,255,255,0.1)]">
                {unpinnedStatsList.map(stat => (
                  <div key={stat.key} className="relative">
                    <StatCard icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} sublabel={stat.sublabel} />
                    <button
                      onClick={() => handlePinStat(stat.key)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[rgba(255,255,255,0.1)] hover:bg-[#6A5ACD]/30 text-[#A0A0A0] hover:text-[#6A5ACD] transition-all duration-200"
                      aria-label="Pin stat"
                    >
                      <PinIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-4 md:p-6 rounded-xl shadow-sm">
         <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white">Trades</h2>
         <div className="mb-4 flex flex-col sm:flex-row gap-3">
           <select 
             className="border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white bg-[rgba(0,0,0,0.2)]
                       focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                       transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] appearance-none cursor-pointer"
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value as StatusFilter)}
           >
             <option value="all">All Trades</option>
             <option value="open">Open</option>
             <option value="closed">Closed</option>
             <option value="win">Win</option>
             <option value="loss">Loss</option>
             <option value="breakeven">Breakeven</option>
           </select>
         </div>
        <TradeList 
          trades={sortedTrades} 
          onEdit={handleEditTrade} 
          onDelete={(tradeId) => onDeleteTrade(tradeId, strategy.id)}
          onViewDetails={(trade) => navigateTo(`trade/${trade.id}`)}
          onMoveTrade={onMoveTrade}
          onCopyTrade={onCopyTrade}
          strategies={strategies}
          strategyCapital={strategy.initialCapital}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />
      </div>
      
      <Modal isOpen={isEditStrategyModalOpen} onClose={() => setIsEditStrategyModalOpen(false)}>
          <div className="p-2">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-6">Edit Strategy</h2>
              <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Strategy Name</label>
                    <input
                        type="text"
                        placeholder="Strategy Name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                                  focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                                  transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Initial Capital</label>
                    <input
                        type="number"
                        placeholder="Initial Capital"
                        value={editedCapital}
                        onChange={(e) => setEditedCapital(e.target.value)}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                                  focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                                  transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                    />
                  </div>
              </div>
              <div className="mt-8 flex justify-between items-center pt-6 border-t border-[rgba(255,255,255,0.1)]">
                  <button
                      onClick={() => setIsConfirmDeleteOpen(true)}
                      className="bg-[#DC3545] hover:bg-[#e85d75] text-white font-bold py-3 px-6 rounded-lg 
                                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-[#DC3545]/10"
                  >
                      Delete Strategy
                  </button>
                  <div className="flex gap-4">
                       <button
                          onClick={() => setIsEditStrategyModalOpen(false)}
                          className="bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleUpdateStrategy}
                          className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                                    shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteStrategy}
        title="Delete Strategy"
        message={`Are you sure you want to delete the "${strategy.name}" strategy? All associated trades will also be removed.`}
        openTradesCount={stats.openTradesCount}
        closedTradesCount={stats.closedTradesCount}
        amountInvested={stats.amountInvested}
        currency={currency}
      />
    </div>
  );
};

export default StrategyView;