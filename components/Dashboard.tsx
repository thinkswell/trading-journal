import React, { useMemo, useState } from 'react';
import { Strategy, Trade, TradeStatus } from '../types';
import TradeList from './TradeList';
import StatCard from './StatCard';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { MoneyIcon } from './icons/MoneyIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { ReceiptPercentIcon } from './icons/ReceiptPercentIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface DashboardProps {
  allTrades: Trade[];
  strategies: Strategy[];
  navigateTo: (view: string) => void;
  onOpenTradeForm: (trade: Trade | null) => void;
  onDeleteTrade: (tradeId: string, strategyId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ allTrades, strategies, navigateTo, onOpenTradeForm, onDeleteTrade }) => {
  const [assetFilter, setAssetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'all'>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
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

  const handleDeleteFromDashboard = (tradeId: string) => {
    const tradeToDelete = allTrades.find(t => t.id === tradeId);
    if (tradeToDelete) {
      onDeleteTrade(tradeToDelete.id, tradeToDelete.strategyId);
    } else {
      console.error("Could not find trade to delete from dashboard.");
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
          Dashboard
        </h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<MoneyIcon />} title="Total Capital" value={formatCurrency(stats.totalCapital, currency)} />
        <StatCard icon={<MoneyIcon />} title="Total P/L" value={formatCurrency(stats.totalPL, currency)} isPositive={stats.totalPL >= 0} />
        <StatCard icon={<TrendingUpIcon />} title="% Gain on Capital" value={`${stats.gainOnCapital.toFixed(2)}%`} isPositive={stats.gainOnCapital >= 0} />
        <StatCard icon={<ScaleIcon />} title="Amount Invested" value={formatCurrency(stats.amountInvested, currency)} />
        <StatCard icon={<ReceiptPercentIcon />} title="% Risk on Capital" value={`${stats.riskOnCapital.toFixed(2)}%`} isPositive={stats.riskOnCapital < 5} />
        <StatCard icon={<TrendingUpIcon />} title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} isPositive={stats.winRate >= 50}/>
        <StatCard icon={<ScaleIcon />} title="Profit Factor" value={stats.profitFactor.toFixed(2)} isPositive={stats.profitFactor >= 1} />
        <StatCard icon={<CalculatorIcon />} title="Total Trades" value={stats.totalTrades.toString()} />
      </div>

      <div className="glass-card p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">All Trades</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            trades={filteredTrades} 
            strategyMap={strategyMap} 
            onEdit={onOpenTradeForm} 
            onDelete={handleDeleteFromDashboard}
            onViewDetails={(trade) => navigateTo(`trade/${trade.id}`)}
            strategies={strategies}
        />
      </div>
    </div>
  );
};

export default Dashboard;