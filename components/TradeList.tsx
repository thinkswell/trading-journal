import React from 'react';
import { Strategy, Trade, TradeStatus } from '../types';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

interface TradeListProps {
  trades: Trade[];
  strategyMap?: Record<string, string>;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewDetails?: (trade: Trade) => void;
  strategyCapital?: number;
  strategies?: Strategy[];
}

export const statusColorMap: Record<TradeStatus, string> = {
  open: 'bg-[#06b6d4] text-white border border-[#06b6d4]/30',
  win: 'bg-[#28A745] text-white border border-[#28A745]/30',
  loss: 'bg-[#DC3545] text-white border border-[#DC3545]/30',
  breakeven: 'bg-[#2C2C2C] text-[#E0E0E0] border border-[rgba(255,255,255,0.1)]',
};

const TradeRow: React.FC<{
    trade: Trade, 
    strategyName?: string, 
    onEdit: (trade: Trade) => void, 
    onDelete: (tradeId: string) => void,
    onViewDetails?: (trade: Trade) => void,
    capital?: number;
}> = ({ trade, strategyName, onEdit, onDelete, onViewDetails, capital }) => {
    
    const { currency } = useSettings();
    const stats = getTradeStats(trade);
    const percentOfCapital = capital && capital > 0 ? (stats.totalInvested / capital) * 100 : 0;

    return (
        <tr 
            className="border-b border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200 cursor-pointer group"
            onClick={() => onViewDetails?.(trade)}
        >
            <td className="p-4 text-[#E0E0E0] group-hover:text-white transition-colors">{new Date(trade.date).toLocaleDateString()}</td>
            <td className="p-4 font-mono font-bold text-white">{trade.asset}</td>
            {strategyName && <td className="p-4 text-[#A0A0A0] group-hover:text-[#E0E0E0] transition-colors">{strategyName}</td>}
            <td className="p-4 text-[#E0E0E0] group-hover:text-white transition-colors">{formatCurrency(stats.avgEntryPrice, currency)}</td>
            <td className="p-4 text-[#E0E0E0] group-hover:text-white transition-colors">{stats.totalBoughtQty}</td>
            <td className="p-4 text-[#E0E0E0] group-hover:text-white transition-colors">{stats.isClosed ? (stats.avgExitPrice > 0 ? formatCurrency(stats.avgExitPrice, currency) : 'N/A') : 'N/A'}</td>
            <td className="p-4 text-[#E0E0E0] group-hover:text-white transition-colors">{percentOfCapital > 0 ? `${percentOfCapital.toFixed(2)}%` : 'N/A'}</td>
            <td className="p-4">
                <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${statusColorMap[trade.status]} transition-all duration-200 group-hover:scale-105`}>
                    {trade.status.toUpperCase()}
                </span>
            </td>
            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(trade); }} 
                    className="text-[#6A5ACD] hover:text-[#8b5cf6] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    aria-label="Edit Trade"
                  >
                      <EditIcon />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} 
                    className="text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    aria-label="Delete Trade"
                  >
                      <TrashIcon />
                  </button>
                </div>
            </td>
        </tr>
    )
}

const TradeList: React.FC<TradeListProps> = ({ trades, strategyMap, onEdit, onDelete, onViewDetails, strategyCapital, strategies }) => {
  if (trades.length === 0) {
    return <div className="text-center py-10 text-[#A0A0A0]">No trades recorded yet.</div>;
  }
  
  const showStrategyColumn = !!strategyMap;

  return (
    <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.1)] glass-card">
      <table className="w-full text-left">
        <thead className="text-xs text-[#A0A0A0] uppercase tracking-wider border-b border-[rgba(255,255,255,0.1)]">
          <tr>
            <th className="p-4 font-bold">Date</th>
            <th className="p-4 font-bold">Asset</th>
            {showStrategyColumn && <th className="p-4 font-bold">Strategy</th>}
            <th className="p-4 font-bold">Avg. Entry</th>
            <th className="p-4 font-bold">Total Qty</th>
            <th className="p-4 font-bold">Avg. Exit</th>
            <th className="p-4 font-bold">% of Capital</th>
            <th className="p-4 font-bold">Status</th>
            <th className="p-4 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
          {trades.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((trade, index) => {
            let capitalForTrade: number | undefined;
            if (strategyCapital) {
                capitalForTrade = strategyCapital;
            } else if (strategies) {
                const tradeStrategy = strategies.find(s => s.id === trade.strategyId);
                capitalForTrade = tradeStrategy?.initialCapital;
            }

            return (
                <TradeRow 
                    key={trade.id} 
                    trade={trade} 
                    strategyName={strategyMap ? strategyMap[trade.strategyId] : undefined}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    capital={capitalForTrade}
                />
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TradeList;