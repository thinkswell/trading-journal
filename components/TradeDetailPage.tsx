import React, { useEffect, useState } from 'react';
import { Trade, Strategy } from '../types';
import { getTradeStats, calculateTradeStatus } from '../lib/tradeCalculations';
import { statusColorMap } from './TradeList';
import RichTextEditor from './RichTextEditor';
import { EditIcon } from './icons/EditIcon';
import { MoveIcon } from './icons/MoveIcon';
import { CopyIcon } from './icons/CopyIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { openTradingView } from '../lib/tradingViewUtils';
import MoveTradeModal from './MoveTradeModal';
import CopyTradeModal from './CopyTradeModal';

interface TradeDetailPageProps {
  trade: Trade;
  strategy: Strategy;
  onSaveTrade: (trade: Trade) => void;
  onBack: () => void;
  onOpenTradeForm: (trade: Trade) => void;
  onMoveTrade?: (trade: Trade, targetStrategyId: string) => void;
  onCopyTrade?: (trade: Trade, targetStrategyId: string) => void;
  strategies?: Strategy[];
  backButtonText: string;
}

const DetailStatCard: React.FC<{ title: string; value: string; valueColor?: string; helpText?: string | React.ReactNode }> = ({ title, value, valueColor = 'text-white', helpText }) => (
    <div className="glass-card p-3 md:p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
        <h4 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider mb-2">{title}</h4>
        <p className={`text-2xl md:text-3xl font-extrabold ${valueColor} mb-1`}>{value}</p>
        {helpText && <p className="text-xs text-[#A0A0A0] mt-2">{helpText}</p>}
    </div>
);

const TradeDetailPage: React.FC<TradeDetailPageProps> = ({ trade, strategy, onSaveTrade, onBack, onOpenTradeForm, onMoveTrade, onCopyTrade, strategies, backButtonText }) => {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const stats = getTradeStats(trade);
  const { currency } = useSettings();

  const handleMove = (targetStrategyId: string) => {
    if (onMoveTrade) {
      onMoveTrade(trade, targetStrategyId);
    }
  };

  const handleCopy = (targetStrategyId: string) => {
    if (onCopyTrade) {
      onCopyTrade(trade, targetStrategyId);
    }
  };

  const gainLossPercent = stats.totalInvested > 0 ? (stats.realizedPL / stats.totalInvested) * 100 : 0;
  const effectOnCapital = strategy.initialCapital > 0 ? (stats.totalRiskValue / strategy.initialCapital) * 100 : 0;
  const initialRiskOnCapital = strategy.initialCapital > 0 ? (stats.initialTotalRisk / strategy.initialCapital) * 100 : 0;
  const gainOnCapital = strategy.initialCapital > 0 ? (stats.realizedPL / strategy.initialCapital) * 100 : 0;
  const percentCapitalUsed = strategy.initialCapital > 0 ? (stats.totalInvested / strategy.initialCapital) * 100 : 0;

  const plColor = stats.realizedPL > 0 ? 'text-[#28A745]' : stats.realizedPL < 0 ? 'text-[#DC3545]' : 'text-gray-300';
  
  const entries = [{ id: 'initial', price: trade.entryPrice, quantity: trade.quantity, type: 'Initial Entry' }, ...trade.pyramids.map(p => ({...p, type: 'Pyramid'}))];

  // Calculate days held
  const calculateDaysHeld = (): { value: string; days: number | null } => {
    if (trade.status === 'open' || !trade.closeDate) {
      // For open trades, calculate days from entry to now
      const entryDate = new Date(trade.date);
      const now = new Date();
      const diffTime = now.getTime() - entryDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return { value: '1 day', days: 1 };
      }
      return { value: `${diffDays} days`, days: diffDays };
    }
    
    const entryDate = new Date(trade.date);
    const closeDate = new Date(trade.closeDate);
    const diffTime = closeDate.getTime() - entryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return { value: '1 day', days: 1 };
    }
    return { value: `${diffDays} days`, days: diffDays };
  };

  const daysHeld = calculateDaysHeld();
  
  // Format dates
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Dynamic status recalculation - only update if status wasn't manually set
  useEffect(() => {
    // Only recalculate if status wasn't manually set
    if (trade.statusManuallySet !== true) {
      // Recalculate stats to get latest values
      const currentStats = getTradeStats(trade);
      const initialInvestment = trade.entryPrice * trade.quantity;
      const calculatedStatus = calculateTradeStatus(currentStats, initialInvestment);
      
      // Check if trade status needs to be updated
      const needsStatusUpdate = calculatedStatus !== trade.status;
      // Check if trade is closed and closeDate needs to be set
      const needsCloseDateUpdate = currentStats.isClosed && !trade.closeDate;
      
      if (needsStatusUpdate || needsCloseDateUpdate) {
        const updatedTrade = { 
          ...trade, 
          status: calculatedStatus,
          statusManuallySet: false, // Mark as auto-calculated
        };
        
        // Set closeDate if trade is closed and closeDate is not set
        if (currentStats.isClosed && !trade.closeDate) {
          updatedTrade.closeDate = new Date().toISOString();
        }
        
        // Clear closeDate if trade is reopened
        if (calculatedStatus === 'open' && trade.closeDate) {
          updatedTrade.closeDate = undefined;
        }
        
        onSaveTrade(updatedTrade);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.entryPrice, trade.quantity, trade.exitPrice, trade.partialExits, trade.status, trade.statusManuallySet, trade.pyramids, trade.closeDate]);

  const handleNotesSave = (newNotes: string) => {
    onSaveTrade({ ...trade, notes: newNotes });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                 <button onClick={onBack} className="text-sm text-[#6A5ACD] hover:text-[#8b5cf6] hover:underline mb-4 font-semibold transition-colors duration-200">
                    &larr; {backButtonText}
                </button>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
                        {trade.asset}
                      </h1>
                      <button
                        onClick={(e) => openTradingView(trade.asset, e)}
                        className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
                        aria-label={`Open ${trade.asset} on TradingView`}
                      >
                        <ExternalLinkIcon className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                     <button 
                        onClick={() => onOpenTradeForm(trade)}
                        className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
                        aria-label="Edit Trade"
                    >
                        <EditIcon />
                    </button>
                    {onMoveTrade && strategies && (
                      <button 
                        onClick={() => setIsMoveModalOpen(true)}
                        className="text-[#A0A0A0] hover:text-[#06b6d4] hover:bg-[#06b6d4]/10 p-2 rounded-lg transition-all duration-200"
                        aria-label="Move Trade"
                      >
                        <MoveIcon />
                      </button>
                    )}
                    {onCopyTrade && strategies && (
                      <button 
                        onClick={() => setIsCopyModalOpen(true)}
                        className="text-[#A0A0A0] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 p-2 rounded-lg transition-all duration-200"
                        aria-label="Copy Trade"
                      >
                        <CopyIcon />
                      </button>
                    )}
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-full ${statusColorMap[trade.status]} transition-all duration-200 hover:scale-105`}>
                        {trade.status.toUpperCase()}
                    </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4 flex items-center gap-3 flex-wrap">
              <TrendingUpIcon />
              Trade Analytics
              <span className="text-[#A0A0A0] font-normal text-base md:text-lg">
                | {formatDate(trade.date)} - {trade.closeDate ? formatDate(trade.closeDate) : 'Open'} | {daysHeld.value}
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <DetailStatCard 
                    title="R-Multiple" 
                    value={stats.isClosed ? `${stats.rMultiple.toFixed(2)}R` : 'N/A'}
                    valueColor={stats.rMultiple > 0 ? 'text-[#28A745]' : stats.rMultiple < 0 ? 'text-[#DC3545]' : 'text-gray-300'}
                    helpText={stats.isClosed ? 'Realized P/L vs Initial Risk' : 'Calculated on trade close'}
                />
                 <DetailStatCard 
                    title="Gain / Loss" 
                    value={formatCurrency(stats.realizedPL, currency)}
                    valueColor={plColor}
                    helpText={stats.isClosed ? `${gainLossPercent.toFixed(2)}% of investment` : 'Realized so far'}
                />
                 <DetailStatCard 
                    title="% Gain on Capital" 
                    value={stats.isClosed ? `${gainOnCapital.toFixed(2)}%` : 'N/A'}
                    valueColor={gainOnCapital > 0 ? 'text-[#28A745]' : gainOnCapital < 0 ? 'text-[#DC3545]' : 'text-gray-300'}
                    helpText="P/L vs. strategy capital"
                />
                <DetailStatCard 
                    title="% Risk on Capital" 
                    value={!stats.isClosed ? `${effectOnCapital.toFixed(2)}%` : '0.00%'}
                    valueColor={effectOnCapital > 5 ? 'text-[#DC3545]' : effectOnCapital > 2 ? 'text-yellow-400' : 'text-[#28A745]'}
                    helpText={!stats.isClosed ? `risk vs strategy capital (initial: ${initialRiskOnCapital.toFixed(2)}%)` : 'risk vs strategy capital'}
                />
                <DetailStatCard 
                    title="Total Investment" 
                    value={formatCurrency(stats.totalInvested, currency)}
                    helpText={
                        <span>
                            <span className="relative group/percent inline-block">
                                <span className="cursor-help">{percentCapitalUsed.toFixed(2)}%</span>
                                <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/percent:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                                    % of capital used
                                </div>
                            </span>
                            {` | ${stats.totalBoughtQty} units @ ${formatCurrency(stats.avgEntryPrice, currency)} avg.`}
                        </span>
                    }
                />
                <DetailStatCard 
                    title="Avg. Exit Price" 
                    value={stats.isClosed && stats.avgExitPrice > 0 ? formatCurrency(stats.avgExitPrice, currency) : 'N/A'}
                    helpText={stats.isClosed && stats.totalSoldQty > 0 ? `${stats.totalSoldQty} units sold` : 'Trade is still open'}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4 md:space-y-5">
                 <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3"><TrendingDownIcon /> Execution Log</h2>
                {/* Entries */}
                <div className="glass-card p-4 rounded-xl">
                    <h3 className="font-bold text-[#E0E0E0] mb-3">Entries</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[#A0A0A0] uppercase border-b border-[rgba(255,255,255,0.1)]"><tr><th className="p-2 pb-3">Type</th><th className="p-2 pb-3">Qty</th><th className="p-2 pb-3">Price</th><th className="p-2 pb-3">Value</th></tr></thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.id} className="border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                                    <td className="p-2 text-[#E0E0E0]">{e.type}</td><td className="p-2 text-white font-medium">{e.quantity}</td><td className="p-2 text-[#E0E0E0]">{formatCurrency(e.price, currency)}</td><td className="p-2 text-white font-medium">{formatCurrency(e.quantity * e.price, currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Exits */}
                 {(trade.partialExits || []).length > 0 &&
                    <div className="glass-card p-4 rounded-xl">
                        <h3 className="font-bold text-[#E0E0E0] mb-3">Partial Exits</h3>
                         <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[#A0A0A0] uppercase border-b border-[rgba(255,255,255,0.1)]"><tr><th className="p-2 pb-3">Qty</th><th className="p-2 pb-3">Price</th><th className="p-2 pb-3">Value</th></tr></thead>
                            <tbody>
                                {trade.partialExits.map(pe => (
                                    <tr key={pe.id} className="border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                                        <td className="p-2 text-white font-medium">{pe.quantity}</td><td className="p-2 text-[#E0E0E0]">{formatCurrency(pe.price, currency)}</td><td className="p-2 text-white font-medium">{formatCurrency(pe.quantity * pe.price, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                }
                 {/* Risk Management */}
                 <div className="glass-card p-4 rounded-xl">
                    <h3 className="font-bold text-[#E0E0E0] mb-3">Risk Management</h3>
                    <ul className="text-sm space-y-2">
                        <li className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)]">
                          <span className="text-[#E0E0E0]">Initial Stop Loss:</span> 
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-white">{formatCurrency(trade.initialSl, currency)}</span>
                            {stats.avgEntryPrice > 0 && trade.initialSl > 0 && (
                              <span className="text-xs text-[#A0A0A0] mt-1">
                                ({(((stats.avgEntryPrice - trade.initialSl) / stats.avgEntryPrice) * 100).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        </li>
                        {trade.trailingStops.map((ts, index) => {
                          const slPercentage = stats.avgEntryPrice > 0 && ts.price > 0 
                            ? (((stats.avgEntryPrice - ts.price) / stats.avgEntryPrice) * 100).toFixed(2)
                            : null;
                          return (
                            <li key={ts.id} className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)]">
                              <span className="text-[#E0E0E0]">Trailing Stop #{index+1}:</span> 
                              <div className="flex flex-col items-end">
                                <span className="font-mono font-bold text-white">{formatCurrency(ts.price, currency)}</span>
                                {slPercentage && (
                                  <span className="text-xs text-[#A0A0A0] mt-1">
                                    ({slPercentage}%)
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                </div>
            </div>
            <div className="space-y-4 md:space-y-5">
                 <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3"><DocumentTextIcon /> Trade Analysis & Notes</h2>
                 <RichTextEditor content={trade.notes || ''} onSave={handleNotesSave} />
            </div>
        </div>
        {onMoveTrade && strategies && (
          <MoveTradeModal
            isOpen={isMoveModalOpen}
            onClose={() => setIsMoveModalOpen(false)}
            onMove={handleMove}
            strategies={strategies}
            currentStrategyId={trade.strategyId}
            tradeAsset={trade.asset}
          />
        )}
        {onCopyTrade && strategies && (
          <CopyTradeModal
            isOpen={isCopyModalOpen}
            onClose={() => setIsCopyModalOpen(false)}
            onCopy={handleCopy}
            strategies={strategies}
            currentStrategyId={trade.strategyId}
            tradeAsset={trade.asset}
          />
        )}
    </div>
  );
};

export default TradeDetailPage;