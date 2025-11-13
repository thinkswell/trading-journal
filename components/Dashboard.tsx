import React, { useMemo, useState } from 'react';
import { Strategy, Trade, TradeStatus } from '../types';
import TradeList from './TradeList';
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

interface DashboardProps {
  allTrades: Trade[];
  strategies: Strategy[];
  navigateTo: (view: string) => void;
  onOpenTradeForm: (trade: Trade | null) => void;
  onDeleteTrade: (tradeId: string, strategyId: string) => void;
}

type StatKey = 'totalCapital' | 'totalPL' | 'gainOnCapital' | 'amountInvested' | 'riskOnCapital' | 'winRate' | 'profitFactor' | 'totalTrades';
type SortOption = 'date' | 'asset' | 'percentInvested';

const DEFAULT_PINNED_STATS: StatKey[] = ['totalCapital', 'gainOnCapital'];

const Dashboard: React.FC<DashboardProps> = ({ allTrades, strategies, navigateTo, onOpenTradeForm, onDeleteTrade }) => {
  const [assetFilter, setAssetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'all'>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [pinnedStats, setPinnedStats] = useLocalStorage<StatKey[]>('dashboard-pinned-stats', DEFAULT_PINNED_STATS);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const { currency } = useSettings();

  const filteredTrades = useMemo(() => {
    return allTrades.filter(trade => {
      const assetMatch = assetFilter ? trade.asset.toLowerCase().includes(assetFilter.toLowerCase()) : true;
      const statusMatch = statusFilter !== 'all' ? trade.status === statusFilter : true;
      const strategyMatch = strategyFilter !== 'all' ? trade.strategyId === strategyFilter : true;
      return assetMatch && statusMatch && strategyMatch;
    });
  }, [allTrades, assetFilter, statusFilter, strategyFilter]);
  
  const stats = useMemo(() => {
    let totalPL = 0;
    let amountInvested = 0;
    let totalRisk = 0;
    
    const closedTrades: Trade[] = [];
    
    filteredTrades.forEach(trade => {
        const tradeStats = getTradeStats(trade);
        if (tradeStats.isClosed) {
            closedTrades.push(trade);
            totalPL += tradeStats.realizedPL;
        } else {
            amountInvested += tradeStats.currentValue;
            totalRisk += tradeStats.totalRiskValue;
        }
    });

    const totalTrades = filteredTrades.length;
    const winningTrades = closedTrades.filter(t => getTradeStats(t).realizedPL > 0);
    const losingTrades = closedTrades.filter(t => getTradeStats(t).realizedPL < 0);

    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    
    const totalWinsValue = winningTrades.reduce((sum, trade) => sum + getTradeStats(trade).realizedPL, 0);
    const totalLossesValue = losingTrades.reduce((sum, trade) => sum + Math.abs(getTradeStats(trade).realizedPL), 0);
    const profitFactor = totalLossesValue > 0 ? totalWinsValue / totalLossesValue : 0;

    const totalCapital = strategies.reduce((acc, s) => acc + s.initialCapital, 0);
    const riskOnCapital = totalCapital > 0 ? (totalRisk / totalCapital) * 100 : 0;
    const gainOnCapital = totalCapital > 0 ? (totalPL / totalCapital) * 100 : 0;

    return {
      totalPL,
      winRate,
      totalTrades,
      profitFactor,
      amountInvested,
      riskOnCapital,
      gainOnCapital,
      totalCapital
    };
  }, [filteredTrades, strategies]);
  
  const strategyMap = useMemo(() => 
    strategies.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
    }, {} as Record<string, string>), [strategies]);

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
          const strategyA = strategies.find(s => s.id === a.strategyId);
          const strategyB = strategies.find(s => s.id === b.strategyId);
          const capitalA = strategyA?.initialCapital || 0;
          const capitalB = strategyB?.initialCapital || 0;
          const percentA = capitalA > 0 ? (statsA.totalInvested / capitalA) * 100 : 0;
          const percentB = capitalB > 0 ? (statsB.totalInvested / capitalB) * 100 : 0;
          return percentB - percentA;
        default:
          return 0;
      }
    });
  }, [filteredTrades, sortOption, strategies]);

  const handleDeleteFromDashboard = (tradeId: string) => {
    const tradeToDelete = allTrades.find(t => t.id === tradeId);
    if (tradeToDelete) {
      onDeleteTrade(tradeToDelete.id, tradeToDelete.strategyId);
    } else {
      console.error("Could not find trade to delete from dashboard.");
    }
  }

  // Define all stats with their keys
  const allStats = useMemo(() => {
    return [
      { key: 'totalCapital' as StatKey, title: 'Total Capital', value: formatCurrency(stats.totalCapital, currency), icon: <MoneyIcon />, isPositive: undefined },
      { key: 'totalPL' as StatKey, title: 'Total P/L', value: formatCurrency(stats.totalPL, currency), icon: <BagOfMoneyIcon />, isPositive: stats.totalPL >= 0 },
      { key: 'gainOnCapital' as StatKey, title: '% Gain on Capital', value: `${stats.gainOnCapital.toFixed(2)}%`, icon: <TrendingUpIcon />, isPositive: stats.gainOnCapital >= 0 },
      { key: 'amountInvested' as StatKey, title: 'Amount Invested', value: formatCurrency(stats.amountInvested, currency), icon: <ScaleIcon />, isPositive: undefined },
      { key: 'riskOnCapital' as StatKey, title: '% Risk on Capital', value: `${stats.riskOnCapital.toFixed(2)}%`, icon: <ReceiptPercentIcon />, isPositive: stats.riskOnCapital < 5 },
      { key: 'winRate' as StatKey, title: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: <TrendingUpIcon />, isPositive: stats.winRate >= 50 },
      { key: 'profitFactor' as StatKey, title: 'Profit Factor', value: stats.profitFactor.toFixed(2), icon: <ScaleIcon />, isPositive: stats.profitFactor >= 1 },
      { key: 'totalTrades' as StatKey, title: 'Total Trades', value: stats.totalTrades.toString(), icon: <CalculatorIcon />, isPositive: undefined },
    ];
  }, [stats, currency]);

  // Separate stats into pinned and unpinned
  const pinnedStatsList = useMemo(() => {
    return allStats.filter(stat => pinnedStats.includes(stat.key));
  }, [allStats, pinnedStats]);

  const unpinnedStatsList = useMemo(() => {
    return allStats.filter(stat => !pinnedStats.includes(stat.key));
  }, [allStats, pinnedStats]);

  const handlePinStat = (statKey: StatKey) => {
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

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
          Dashboard
        </h1>
      </div>
      
      {/* Desktop: Show all stats in grid */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {allStats.map(stat => (
          <StatCard key={stat.key} icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} />
        ))}
      </div>

      {/* Mobile: Show pinned stats at top, rest in accordion */}
      <div className="md:hidden space-y-4">
        {/* Pinned Stats */}
        <div className="flex flex-col gap-4">
          {pinnedStatsList.map(stat => (
            <div key={stat.key} className="relative">
              <StatCard icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} />
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
                    <StatCard icon={stat.icon} title={stat.title} value={stat.value} isPositive={stat.isPositive} />
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
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">All Trades</h2>
        </div>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-4 mb-4 md:mb-6">
          <input 
            type="text" 
            placeholder="Filter by Asset (e.g. AAPL)" 
            className="border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
          />
          <select 
            className="border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] appearance-none cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as TradeStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
          <select 
            className="border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] appearance-none cursor-pointer"
            value={strategyFilter}
            onChange={e => setStrategyFilter(e.target.value)}
          >
            <option value="all">All Strategies</option>
            {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <TradeList 
            trades={sortedTrades} 
            strategyMap={strategyMap} 
            onEdit={onOpenTradeForm} 
            onDelete={handleDeleteFromDashboard}
            onViewDetails={(trade) => navigateTo(`trade/${trade.id}`)}
            strategies={strategies}
            sortOption={sortOption}
            onSortChange={setSortOption}
        />
      </div>
    </div>
  );
};

export default Dashboard;