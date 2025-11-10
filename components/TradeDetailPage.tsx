import React from 'react';
import { Trade, Strategy } from '../types';
import { getTradeStats } from '../lib/tradeCalculations';
import { statusColorMap } from './TradeList';
import RichTextEditor from './RichTextEditor';
import { EditIcon } from './icons/EditIcon';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface TradeDetailPageProps {
  trade: Trade;
  strategy: Strategy;
  onSaveTrade: (trade: Trade) => void;
  onBack: () => void;
  onOpenTradeForm: (trade: Trade) => void;
  backButtonText: string;
}

const DetailStatCard: React.FC<{ title: string; value: string; valueColor?: string; helpText?: string }> = ({ title, value, valueColor = 'text-white', helpText }) => (
    <div className="glass-card p-3 md:p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
        <h4 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider mb-2">{title}</h4>
        <p className={`text-2xl md:text-3xl font-extrabold ${valueColor} mb-1`}>{value}</p>
        {helpText && <p className="text-xs text-[#A0A0A0] mt-2">{helpText}</p>}
    </div>
);

const TradeDetailPage: React.FC<TradeDetailPageProps> = ({ trade, strategy, onSaveTrade, onBack, onOpenTradeForm, backButtonText }) => {
  const stats = getTradeStats(trade);
  const { currency } = useSettings();

  const gainLossPercent = stats.totalInvested > 0 ? (stats.realizedPL / stats.totalInvested) * 100 : 0;
  const effectOnCapital = strategy.initialCapital > 0 ? (stats.initialTotalRisk / strategy.initialCapital) * 100 : 0;
  const gainOnCapital = strategy.initialCapital > 0 ? (stats.realizedPL / strategy.initialCapital) * 100 : 0;

  const plColor = stats.realizedPL > 0 ? 'text-[#28A745]' : stats.realizedPL < 0 ? 'text-[#DC3545]' : 'text-gray-300';
  
  const entries = [{ id: 'initial', price: trade.entryPrice, quantity: trade.quantity, type: 'Initial Entry' }, ...trade.pyramids.map(p => ({...p, type: 'Pyramid'}))];

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
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-[#E0E0E0] to-[#E0E0E0] bg-clip-text text-transparent">
                      {trade.asset}
                    </h1>
                    <div className="flex items-center gap-3">
                     <button 
                        onClick={() => onOpenTradeForm(trade)}
                        className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
                        aria-label="Edit Trade"
                    >
                        <EditIcon />
                    </button>
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-full ${statusColorMap[trade.status]} transition-all duration-200 hover:scale-105`}>
                        {trade.status.toUpperCase()}
                    </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4 flex items-center gap-3">
              <TrendingUpIcon />
              Trade Analytics
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
                    title="% Effect on Capital" 
                    value={!stats.isClosed ? `${effectOnCapital.toFixed(2)}%` : '0.00%'}
                    valueColor={effectOnCapital > 5 ? 'text-[#DC3545]' : effectOnCapital > 2 ? 'text-yellow-400' : 'text-[#28A745]'}
                    helpText="Initial risk vs. strategy capital"
                />
                <DetailStatCard 
                    title="Total Investment" 
                    value={formatCurrency(stats.totalInvested, currency)}
                    helpText={`${stats.totalBoughtQty} units @ ${formatCurrency(stats.avgEntryPrice, currency)} avg.`}
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
                        <li className="flex justify-between p-3 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)]">
                          <span className="text-[#E0E0E0]">Initial Stop Loss:</span> 
                          <span className="font-mono font-bold text-white">{formatCurrency(trade.initialSl, currency)}</span>
                        </li>
                        {trade.trailingStops.map((ts, index) => (
                            <li key={ts.id} className="flex justify-between p-3 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)]">
                              <span className="text-[#E0E0E0]">Trailing Stop #{index+1}:</span> 
                              <span className="font-mono font-bold text-white">{formatCurrency(ts.price, currency)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="space-y-4 md:space-y-5">
                 <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3"><DocumentTextIcon /> Trade Analysis & Notes</h2>
                 <RichTextEditor content={trade.notes} onSave={handleNotesSave} />
            </div>
        </div>
    </div>
  );
};

export default TradeDetailPage;