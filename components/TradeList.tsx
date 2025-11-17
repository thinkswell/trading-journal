import React, { useState } from 'react';
import { Strategy, Trade, TradeStatus } from '../types';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { openTradingView } from '../lib/tradingViewUtils';
import { FiAlertTriangle } from 'react-icons/fi';

type SortOption = 'date' | 'asset' | 'percentInvested';

interface TradeListProps {
  trades: Trade[];
  strategyMap?: Record<string, string>;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewDetails?: (trade: Trade) => void;
  strategyCapital?: number;
  strategies?: Strategy[];
  sortOption?: SortOption;
  onSortChange?: (option: SortOption) => void;
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
            <td className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{trade.asset}</span>
                {(!trade.initialSl || trade.initialSl === 0 || isNaN(trade.initialSl)) && (
                  <div className="relative group/warning">
                    <FiAlertTriangle className="w-4 h-4 text-yellow-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/warning:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                      <span>
                        <strong className="text-yellow-300">Heads up!</strong> Please set a stop loss for this trade.
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => openTradingView(trade.asset, e)}
                  className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-1 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                  aria-label={`Open ${trade.asset} on TradingView`}
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                </button>
              </div>
            </td>
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

const TradeCard: React.FC<{
  trade: Trade;
  strategyName?: string;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewDetails?: (trade: Trade) => void;
  capital?: number;
}> = ({ trade, strategyName, onEdit, onDelete, onViewDetails, capital }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currency } = useSettings();
  const stats = getTradeStats(trade);
  const percentOfCapital = capital && capital > 0 ? (stats.totalInvested / capital) * 100 : 0;

  return (
    <div 
      className="glass-card rounded-lg border border-[rgba(255,255,255,0.1)] p-4 mb-3 cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono font-bold text-white text-lg">{trade.asset}</span>
            {(!trade.initialSl || trade.initialSl === 0 || isNaN(trade.initialSl)) && (
              <div className="relative group/warning">
                <FiAlertTriangle className="w-4 h-4 text-yellow-400" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/warning:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                    <span>
                      <strong className="text-yellow-300">Heads up!</strong> Please set a stop loss for this trade.
                    </span>
                </div>
              </div>
            )}
            <button
              onClick={(e) => openTradingView(trade.asset, e)}
              className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-1.5 rounded transition-all duration-200"
              aria-label={`Open ${trade.asset} on TradingView`}
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </button>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColorMap[trade.status]}`}>
              {trade.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-[#A0A0A0]">
            {new Date(trade.date).toLocaleDateString()}
            {strategyName && <span className="ml-2">• {strategyName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(trade);
            }}
            className="text-[#6A5ACD] hover:text-[#8b5cf6] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
            aria-label="Edit Trade"
          >
            <EditIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(trade.id);
            }}
            className="text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 p-2 rounded-lg transition-all duration-200"
            aria-label="Delete Trade"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)] space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-[#A0A0A0] mb-1">Avg. Entry:</span>
              <span className="text-white font-semibold">{formatCurrency(stats.avgEntryPrice, currency)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#A0A0A0] mb-1">Total Qty:</span>
              <span className="text-white font-semibold">{stats.totalBoughtQty}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#A0A0A0] mb-1">Avg. Exit:</span>
              <span className="text-white font-semibold">
                {stats.isClosed ? (stats.avgExitPrice > 0 ? formatCurrency(stats.avgExitPrice, currency) : 'N/A') : 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#A0A0A0] mb-1">% of Capital:</span>
              <span className="text-white font-semibold">{percentOfCapital > 0 ? `${percentOfCapital.toFixed(2)}%` : 'N/A'}</span>
            </div>
          </div>
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(trade);
              }}
              className="w-full mt-3 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
            >
              View Details
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TradeList: React.FC<TradeListProps> = ({ trades, strategyMap, onEdit, onDelete, onViewDetails, strategyCapital, strategies, sortOption, onSortChange }) => {
  if (trades.length === 0) {
    return <div className="text-center py-10 text-[#A0A0A0]">No trades recorded yet.</div>;
  }
  
  const showStrategyColumn = !!strategyMap;
  const isSortable = !!onSortChange;
  
  const handleSort = (option: SortOption) => {
    if (onSortChange) {
      onSortChange(option);
    }
  };

  const SortIndicator: React.FC<{ option: SortOption }> = ({ option }) => {
    if (!isSortable || sortOption !== option) return null;
    return <span className="ml-1 text-[#6A5ACD]">●</span>;
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {trades.map((trade) => {
          let capitalForTrade: number | undefined;
          if (strategyCapital) {
            capitalForTrade = strategyCapital;
          } else if (strategies) {
            const tradeStrategy = strategies.find(s => s.id === trade.strategyId);
            capitalForTrade = tradeStrategy?.initialCapital;
          }

          return (
            <TradeCard
              key={trade.id}
              trade={trade}
              strategyName={strategyMap ? strategyMap[trade.strategyId] : undefined}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              capital={capitalForTrade}
            />
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.1)] glass-card">
        <table className="w-full text-left">
          <thead className="text-xs text-[#A0A0A0] uppercase tracking-wider border-b border-[rgba(255,255,255,0.1)]">
            <tr>
              <th 
                className={`p-4 font-bold ${isSortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                onClick={() => isSortable && handleSort('date')}
              >
                Date
                <SortIndicator option="date" />
              </th>
              <th 
                className={`p-4 font-bold ${isSortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                onClick={() => isSortable && handleSort('asset')}
              >
                Asset
                <SortIndicator option="asset" />
              </th>
              {showStrategyColumn && <th className="p-4 font-bold">Strategy</th>}
              <th className="p-4 font-bold">Avg. Entry</th>
              <th className="p-4 font-bold">Total Qty</th>
              <th className="p-4 font-bold">Avg. Exit</th>
              <th 
                className={`p-4 font-bold ${isSortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                onClick={() => isSortable && handleSort('percentInvested')}
              >
                % of Capital
                <SortIndicator option="percentInvested" />
              </th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {trades.map((trade) => {
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TradeList;