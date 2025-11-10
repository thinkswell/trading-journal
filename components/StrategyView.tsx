import React, { useState, useMemo, useEffect } from 'react';
import { Strategy, Trade } from '../types';
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
import { ScaleIcon } from './icons/ScaleIcon';
import { ReceiptPercentIcon } from './icons/ReceiptPercentIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface StrategyViewProps {
  strategy: Strategy;
  onDeleteTrade: (tradeId: string, strategyId: string) => void;
  onUpdateStrategy: (strategyId: string, name: string, initialCapital: number) => void;
  onDeleteStrategy: (strategyId: string) => void;
  navigateTo: (view: string) => void;
  onOpenTradeForm: (trade: Trade | null) => void;
}

const StrategyView: React.FC<StrategyViewProps> = ({ strategy, onDeleteTrade, onUpdateStrategy, onDeleteStrategy, navigateTo, onOpenTradeForm }) => {
  const [isEditStrategyModalOpen, setIsEditStrategyModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editedName, setEditedName] = useState(strategy.name);
  const [editedCapital, setEditedCapital] = useState(strategy.initialCapital.toString());
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
            totalRisk += tradeStats.totalRiskValue;
        }
    });

    const currentCapital = strategy.initialCapital + totalPL;
    const totalTrades = strategy.trades.length;
    const winningTrades = closedTrades.filter(t => getTradeStats(t).realizedPL > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    
    const riskPercent = strategy.initialCapital > 0 ? (totalRisk / strategy.initialCapital) * 100 : 0;
    const gainOnCapital = strategy.initialCapital > 0 ? (totalPL / strategy.initialCapital) * 100 : 0;

    return { totalPL, currentCapital, winRate, totalTrades, amountInvested, riskPercent, gainOnCapital };
  }, [strategy]);


  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
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
          className="flex items-center gap-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                    shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusIcon />
          Add Trade
        </button>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<MoneyIcon />} title="Current Capital" value={formatCurrency(stats.currentCapital, currency)} />
        <StatCard icon={<ScaleIcon />} title="Strategy P/L" value={formatCurrency(stats.totalPL, currency)} isPositive={stats.totalPL >= 0} />
        <StatCard icon={<TrendingUpIcon />} title="% Gain on Capital" value={`${stats.gainOnCapital.toFixed(2)}%`} isPositive={stats.gainOnCapital >= 0} />
        <StatCard icon={<ScaleIcon />} title="Amount Invested" value={formatCurrency(stats.amountInvested, currency)} />
        <StatCard icon={<ReceiptPercentIcon />} title="% Risk" value={`${stats.riskPercent.toFixed(2)}%`} isPositive={stats.riskPercent < 5} />
        <StatCard icon={<TrendingUpIcon />} title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} isPositive={stats.winRate >= 50}/>
        <StatCard icon={<CalculatorIcon />} title="Total Trades" value={stats.totalTrades.toString()} />
      </div>

      <div className="glass-card p-6 rounded-xl shadow-sm">
         <h2 className="text-2xl font-bold mb-6 text-white">Trades</h2>
        <TradeList 
          trades={strategy.trades} 
          onEdit={handleEditTrade} 
          onDelete={(tradeId) => onDeleteTrade(tradeId, strategy.id)}
          onViewDetails={(trade) => navigateTo(`trade/${trade.id}`)}
          strategyCapital={strategy.initialCapital}
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
        message={`Are you sure you want to delete the "${strategy.name}" strategy? All associated trades will also be removed. This action cannot be undone.`}
      />
    </div>
  );
};

export default StrategyView;