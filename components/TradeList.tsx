import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Strategy, Trade, TradeStatus } from '../types';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { MoveIcon } from './icons/MoveIcon';
import { CopyIcon } from './icons/CopyIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { openTradingView } from '../lib/tradingViewUtils';
import { FiAlertTriangle, FiInfo } from 'react-icons/fi';
import MoveTradeModal from './MoveTradeModal';
import CopyTradeModal from './CopyTradeModal';
import ConfirmationModal from './ConfirmationModal';

type SortOption = 'date' | 'date-desc' | 'asset' | 'asset-desc' | 'percentInvested' | 'percentInvested-desc';

interface TradeListProps {
  trades: Trade[];
  strategyMap?: Record<string, string>;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewDetails?: (trade: Trade) => void;
  onMoveTrade?: (trade: Trade, targetStrategyId: string) => void;
  onCopyTrade?: (trade: Trade, targetStrategyId: string) => void;
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

const statusInitialMap: Record<TradeStatus, string> = {
  open: 'O',
  win: 'W',
  loss: 'L',
  breakeven: 'B',
};

const statusFullTextMap: Record<TradeStatus, string> = {
  open: 'OPEN',
  win: 'WIN',
  loss: 'LOSS',
  breakeven: 'BREAKEVEN',
};

const TradeRow: React.FC<{
    trade: Trade, 
    strategyName?: string, 
    onEdit: (trade: Trade) => void, 
    onDelete: (tradeId: string) => void,
    onViewDetails?: (trade: Trade) => void,
    onOpenMoveModal?: (trade: Trade) => void;
    onOpenCopyModal?: (trade: Trade) => void;
    onOpenDeleteModal?: (trade: Trade) => void;
    capital?: number;
}> = ({ trade, strategyName, onEdit, onDelete, onViewDetails, onOpenMoveModal, onOpenCopyModal, onOpenDeleteModal, capital }) => {
    const { currency } = useSettings();
    const stats = getTradeStats(trade);
    const percentOfCapital = capital && capital > 0 ? (stats.totalInvested / capital) * 100 : 0;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setMenuPosition(null);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <tr 
            className="border-b border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200 group"
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
                {trade.status !== 'open' && !trade.closeDate && (
                  <div className="relative group/info">
                    <FiInfo className="w-4 h-4 text-[#6A5ACD]" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                      <span>Please add end date for better statistics</span>
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
                {(() => {
                    // For closed trades, use final R-multiple
                    // For open trades with partial exits, use realized R-multiple
                    // For open trades without partial exits, show N/A
                    const hasPartialExits = (trade.partialExits || []).length > 0;
                    let rrRatio = 0;
                    let riskAmount = 0;
                    let rewardAmount = 0;
                    
                    if (stats.isClosed) {
                        // Closed trade: use final R-multiple
                        rrRatio = stats.rMultiple;
                        riskAmount = stats.initialTotalRisk;
                        rewardAmount = stats.realizedPL;
                    } else if (hasPartialExits && stats.initialTotalRisk > 0) {
                        // Open trade with partial exits: use realized R-multiple
                        rrRatio = stats.realizedRMultiple;
                        riskAmount = stats.initialTotalRisk;
                        rewardAmount = stats.realizedPL;
                    } else {
                        // Open trade without partial exits: show N/A
                        rrRatio = 0;
                        riskAmount = stats.totalRiskValue;
                        rewardAmount = 0;
                    }
                    
                    const riskPercent = capital && capital > 0 ? (riskAmount / capital) * 100 : 0;
                    const rewardPercent = capital && capital > 0 ? (rewardAmount / capital) * 100 : 0;
                    
                    return (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className={`font-semibold ${rrRatio > 0 ? 'text-[#28A745]' : rrRatio < 0 ? 'text-[#DC3545]' : 'text-[#E0E0E0]'}`}>
                                {!stats.isClosed && !hasPartialExits ? 'N/A' : (rrRatio !== 0 ? `${rrRatio > 0 ? '+' : ''}${rrRatio.toFixed(2)}R` : '0R')}
                            </span>
                            {(!stats.isClosed && !hasPartialExits) ? null : (
                                <>
                                    <span className="text-[#A0A0A0] mx-1">|</span>
                                    <span className="text-[#A0A0A0] text-[10px]">
                                        ({riskPercent.toFixed(2)}% | {rewardPercent >= 0 ? '+' : ''}{rewardPercent.toFixed(2)}%)
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })()}
            </td>
            <td className="p-2">
                <div className="relative group/status inline-block">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColorMap[trade.status]} transition-all duration-200 inline-flex items-center justify-center min-w-[24px]`}>
                        {statusInitialMap[trade.status]}
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                        {statusFullTextMap[trade.status]}
                    </div>
                </div>
            </td>
            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-1 relative">
                  {/* Menu Button (3 dots) */}
                  <div className="relative">
                    <button 
                      ref={menuButtonRef}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isMenuOpen) {
                          setIsMenuOpen(false);
                          setMenuPosition(null);
                        } else {
                          // Calculate position when opening
                          const button = e.currentTarget;
                          const buttonRect = button.getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const menuHeight = 120; // Approximate menu height
                          
                          // Check if menu would overflow below viewport
                          const spaceBelow = viewportHeight - buttonRect.bottom;
                          const spaceAbove = buttonRect.top;
                          
                          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                            // Position above button
                            setMenuPosition({
                              top: buttonRect.top - menuHeight - 8,
                              right: window.innerWidth - buttonRect.right
                            });
                          } else {
                            // Position below button
                            setMenuPosition({
                              top: buttonRect.bottom + 8,
                              right: window.innerWidth - buttonRect.right
                            });
                          }
                          setIsMenuOpen(true);
                        }
                      }} 
                      className="text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.1)] p-2 rounded-lg transition-all duration-200"
                      aria-label="More options"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {/* Dropdown Menu */}
                    {isMenuOpen && menuPosition && typeof document !== 'undefined' && createPortal(
                      <div 
                        ref={menuRef}
                        className="fixed bg-[#2C2C2C] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-50 min-w-[120px]"
                        style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            setMenuPosition(null);
                            onEdit(trade);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                        >
                          <span className="text-[#6A5ACD] w-4 h-4 flex items-center justify-center"><EditIcon /></span>
                          Edit
                        </button>
                        {onOpenMoveModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              setMenuPosition(null);
                              onOpenMoveModal(trade);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                          >
                            <span className="text-[#06b6d4] w-4 h-4 flex items-center justify-center"><MoveIcon /></span>
                            Move
                          </button>
                        )}
                        {onOpenCopyModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              setMenuPosition(null);
                              onOpenCopyModal(trade);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                          >
                            <span className="text-[#8b5cf6] w-4 h-4 flex items-center justify-center"><CopyIcon /></span>
                            Copy
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                  {/* Open/View Button */}
                  <div className="relative group/open-tooltip inline-block">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onViewDetails?.(trade);
                      }} 
                      className="text-[#A0A0A0] hover:text-[#6A5ACD] hover:bg-[#6A5ACD]/10 p-2 rounded-lg transition-all duration-200"
                      aria-label="View Trade Details"
                    >
                      <DocumentTextIcon />
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/open-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                      View Trade Details
                    </div>
                  </div>
                  {/* Delete Button */}
                  <div className="relative group/delete-tooltip inline-block">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onOpenDeleteModal?.(trade);
                      }} 
                      className="text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 p-2 rounded-lg transition-all duration-200"
                      aria-label="Delete Trade"
                    >
                      <TrashIcon />
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/delete-tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                      Delete Trade
                    </div>
                  </div>
                </div>
            </td>
        </tr>
    );
}

const TradeCard: React.FC<{
  trade: Trade;
  strategyName?: string;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewDetails?: (trade: Trade) => void;
  onOpenMoveModal?: (trade: Trade) => void;
  onOpenCopyModal?: (trade: Trade) => void;
  onOpenDeleteModal?: (trade: Trade) => void;
  capital?: number;
}> = ({ trade, strategyName, onEdit, onDelete, onViewDetails, onOpenMoveModal, onOpenCopyModal, onOpenDeleteModal, capital }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currency } = useSettings();
  const stats = getTradeStats(trade);
  const percentOfCapital = capital && capital > 0 ? (stats.totalInvested / capital) * 100 : 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setMenuPosition(null);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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
            {trade.status !== 'open' && !trade.closeDate && (
              <div className="relative group/info">
                <FiInfo className="w-4 h-4 text-[#6A5ACD]" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                  <span>Please add end date for better statistics</span>
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
            <div className="relative group/status inline-block">
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColorMap[trade.status]} inline-flex items-center justify-center min-w-[24px]`}>
                {statusInitialMap[trade.status]}
              </span>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2C2C2C] text-white text-xs rounded-lg opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)]">
                {statusFullTextMap[trade.status]}
              </div>
            </div>
          </div>
          <div className="text-sm text-[#A0A0A0]">
            {new Date(trade.date).toLocaleDateString()}
            {strategyName && <span className="ml-2">• {strategyName}</span>}
          </div>
        </div>
        {/* Mobile: Only show 3 dots menu button */}
        <div className="relative md:hidden">
          <button 
            ref={menuButtonRef}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (isMenuOpen) {
                setIsMenuOpen(false);
                setMenuPosition(null);
              } else {
                // Calculate position when opening
                const button = e.currentTarget;
                const buttonRect = button.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const menuHeight = 200; // Approximate menu height for all actions
                
                // Check if menu would overflow below viewport
                const spaceBelow = viewportHeight - buttonRect.bottom;
                const spaceAbove = buttonRect.top;
                
                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                  // Position above button
                  setMenuPosition({
                    top: buttonRect.top - menuHeight - 8,
                    right: window.innerWidth - buttonRect.right
                  });
                } else {
                  // Position below button
                  setMenuPosition({
                    top: buttonRect.bottom + 8,
                    right: window.innerWidth - buttonRect.right
                  });
                }
                setIsMenuOpen(true);
              }
            }} 
            className="text-[#A0A0A0] hover:text-white hover:bg-[rgba(255,255,255,0.1)] p-2 rounded-lg transition-all duration-200"
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
          {/* Dropdown Menu */}
          {isMenuOpen && menuPosition && createPortal(
            <div 
              ref={menuRef}
              className="fixed bg-[#2C2C2C] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-50 min-w-[150px]"
              style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setMenuPosition(null);
                  onEdit(trade);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
              >
                <span className="text-[#6A5ACD] w-4 h-4 flex items-center justify-center"><EditIcon /></span>
                Edit
              </button>
              {onOpenMoveModal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setMenuPosition(null);
                    onOpenMoveModal(trade);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                >
                  <span className="text-[#06b6d4] w-4 h-4 flex items-center justify-center"><MoveIcon /></span>
                  Move
                </button>
              )}
              {onOpenCopyModal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setMenuPosition(null);
                    onOpenCopyModal(trade);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                >
                  <span className="text-[#8b5cf6] w-4 h-4 flex items-center justify-center"><CopyIcon /></span>
                  Copy
                </button>
              )}
              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setMenuPosition(null);
                    onViewDetails(trade);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                >
                  <span className="text-[#6A5ACD] w-4 h-4 flex items-center justify-center"><DocumentTextIcon /></span>
                  View Details
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setMenuPosition(null);
                  onOpenDeleteModal?.(trade);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors text-[#DC3545]"
              >
                <span className="text-[#DC3545] w-4 h-4 flex items-center justify-center"><TrashIcon /></span>
                Delete
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
        {/* Desktop: Show all action buttons */}
        <div className="hidden md:flex items-center gap-2">
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
          {onOpenMoveModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMoveModal(trade);
              }}
              className="text-[#06b6d4] hover:text-[#22d3ee] hover:bg-[#06b6d4]/10 p-2 rounded-lg transition-all duration-200"
              aria-label="Move Trade"
            >
              <MoveIcon />
            </button>
          )}
          {onOpenCopyModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCopyModal(trade);
              }}
              className="text-[#8b5cf6] hover:text-[#a78bfa] hover:bg-[#8b5cf6]/10 p-2 rounded-lg transition-all duration-200"
              aria-label="Copy Trade"
            >
              <CopyIcon />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDeleteModal?.(trade);
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
            <div className="flex flex-col col-span-2">
              <span className="text-[#A0A0A0] mb-1">Risk/Reward:</span>
              {(() => {
                // For closed trades, use final R-multiple
                // For open trades with partial exits, use realized R-multiple
                // For open trades without partial exits, show N/A
                const hasPartialExits = (trade.partialExits || []).length > 0;
                let rrRatio = 0;
                let riskAmount = 0;
                let rewardAmount = 0;
                
                if (stats.isClosed) {
                  // Closed trade: use final R-multiple
                  rrRatio = stats.rMultiple;
                  riskAmount = stats.initialTotalRisk;
                  rewardAmount = stats.realizedPL;
                } else if (hasPartialExits && stats.initialTotalRisk > 0) {
                  // Open trade with partial exits: use realized R-multiple
                  rrRatio = stats.realizedRMultiple;
                  riskAmount = stats.initialTotalRisk;
                  rewardAmount = stats.realizedPL;
                } else {
                  // Open trade without partial exits: show N/A
                  rrRatio = 0;
                  riskAmount = stats.totalRiskValue;
                  rewardAmount = 0;
                }
                
                const riskPercent = capital && capital > 0 ? (riskAmount / capital) * 100 : 0;
                const rewardPercent = capital && capital > 0 ? (rewardAmount / capital) * 100 : 0;
                
                return (
                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <span className={`font-semibold ${rrRatio > 0 ? 'text-[#28A745]' : rrRatio < 0 ? 'text-[#DC3545]' : 'text-[#E0E0E0]'}`}>
                      {!stats.isClosed && !hasPartialExits ? 'N/A' : (rrRatio !== 0 ? `${rrRatio > 0 ? '+' : ''}${rrRatio.toFixed(2)}R` : '0R')}
                    </span>
                    {(!stats.isClosed && !hasPartialExits) ? null : (
                      <>
                        <span className="text-[#A0A0A0] mx-1">|</span>
                        <span className="text-[#A0A0A0] text-[10px]">
                          ({riskPercent.toFixed(2)}% | {rewardPercent >= 0 ? '+' : ''}{rewardPercent.toFixed(2)}%)
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
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

const TradeList: React.FC<TradeListProps> = ({ trades, strategyMap, onEdit, onDelete, onViewDetails, onMoveTrade, onCopyTrade, strategyCapital, strategies, sortOption, onSortChange }) => {
  const [selectedTradeForMove, setSelectedTradeForMove] = useState<Trade | null>(null);
  const [selectedTradeForCopy, setSelectedTradeForCopy] = useState<Trade | null>(null);
  const [selectedTradeForDelete, setSelectedTradeForDelete] = useState<Trade | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { currency } = useSettings();

  if (trades.length === 0) {
    return <div className="text-center py-10 text-[#A0A0A0]">No trades recorded yet.</div>;
  }
  
  const showStrategyColumn = !!strategyMap;
  const isSortable = !!onSortChange;
  
  const handleSort = (option: SortOption) => {
    if (onSortChange) {
      // Special handling for toggling: toggle between ascending and descending
      if (option === 'asset') {
        if (sortOption === 'asset') {
          onSortChange('asset-desc');
        } else if (sortOption === 'asset-desc') {
          onSortChange('asset');
        } else {
          onSortChange('asset');
        }
      } else if (option === 'date') {
        if (sortOption === 'date') {
          onSortChange('date-desc');
        } else if (sortOption === 'date-desc') {
          onSortChange('date');
        } else {
          onSortChange('date');
        }
      } else if (option === 'percentInvested') {
        if (sortOption === 'percentInvested') {
          onSortChange('percentInvested-desc');
        } else if (sortOption === 'percentInvested-desc') {
          onSortChange('percentInvested');
        } else {
          onSortChange('percentInvested');
        }
      } else {
        onSortChange(option);
      }
    }
  };

  const handleOpenMoveModal = (trade: Trade) => {
    setSelectedTradeForMove(trade);
    setIsMoveModalOpen(true);
  };

  const handleOpenCopyModal = (trade: Trade) => {
    setSelectedTradeForCopy(trade);
    setIsCopyModalOpen(true);
  };

  const handleMove = (targetStrategyId: string) => {
    if (selectedTradeForMove && onMoveTrade) {
      onMoveTrade(selectedTradeForMove, targetStrategyId);
      setIsMoveModalOpen(false);
      setSelectedTradeForMove(null);
    }
  };

  const handleCopy = (targetStrategyId: string) => {
    if (selectedTradeForCopy && onCopyTrade) {
      onCopyTrade(selectedTradeForCopy, targetStrategyId);
      setIsCopyModalOpen(false);
      setSelectedTradeForCopy(null);
    }
  };

  const handleOpenDeleteModal = (trade: Trade) => {
    setSelectedTradeForDelete(trade);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedTradeForDelete) {
      onDelete(selectedTradeForDelete.id);
      setIsDeleteModalOpen(false);
      setSelectedTradeForDelete(null);
    }
  };

  const SortIndicator: React.FC<{ option: SortOption }> = ({ option }) => {
    if (!isSortable) return null;
    
    // For date, show indicator for both 'date' and 'date-desc'
    if (option === 'date' && (sortOption === 'date' || sortOption === 'date-desc')) {
      return <span className="ml-1 text-[#6A5ACD]">{sortOption === 'date-desc' ? '↑' : '↓'}</span>;
    }
    
    // For asset, show indicator for both 'asset' and 'asset-desc'
    if (option === 'asset' && (sortOption === 'asset' || sortOption === 'asset-desc')) {
      return <span className="ml-1 text-[#6A5ACD]">{sortOption === 'asset-desc' ? '↓' : '↑'}</span>;
    }
    
    // For percentInvested, show indicator for both 'percentInvested' and 'percentInvested-desc'
    if (option === 'percentInvested' && (sortOption === 'percentInvested' || sortOption === 'percentInvested-desc')) {
      return <span className="ml-1 text-[#6A5ACD]">{sortOption === 'percentInvested-desc' ? '↑' : '↓'}</span>;
    }
    
    if (sortOption === option) {
      return <span className="ml-1 text-[#6A5ACD]">●</span>;
    }
    return null;
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3 mb-20">
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
              onOpenMoveModal={onMoveTrade ? handleOpenMoveModal : undefined}
              onOpenCopyModal={onCopyTrade ? handleOpenCopyModal : undefined}
              onOpenDeleteModal={handleOpenDeleteModal}
              capital={capitalForTrade}
            />
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.1)] glass-card mb-20 lg:mb-0">
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
              <th className="p-4 font-bold">Risk/Reward</th>
              <th className="p-2 font-bold">Status</th>
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
                  onOpenMoveModal={onMoveTrade ? handleOpenMoveModal : undefined}
                  onOpenCopyModal={onCopyTrade ? handleOpenCopyModal : undefined}
                  onOpenDeleteModal={handleOpenDeleteModal}
                  capital={capitalForTrade}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {onMoveTrade && strategies && selectedTradeForMove && (
        <MoveTradeModal
          isOpen={isMoveModalOpen}
          onClose={() => {
            setIsMoveModalOpen(false);
            setSelectedTradeForMove(null);
          }}
          onMove={handleMove}
          strategies={strategies}
          currentStrategyId={selectedTradeForMove.strategyId}
          tradeAsset={selectedTradeForMove.asset}
        />
      )}
      {onCopyTrade && strategies && selectedTradeForCopy && (
        <CopyTradeModal
          isOpen={isCopyModalOpen}
          onClose={() => {
            setIsCopyModalOpen(false);
            setSelectedTradeForCopy(null);
          }}
          onCopy={handleCopy}
          strategies={strategies}
          currentStrategyId={selectedTradeForCopy.strategyId}
          tradeAsset={selectedTradeForCopy.asset}
        />
      )}
      {selectedTradeForDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedTradeForDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Trade"
          message={`Are you sure you want to delete the trade for "${selectedTradeForDelete.asset}"? This action cannot be undone.`}
          confirmButtonText="Delete Trade"
        />
      )}
    </>
  );
};

export default TradeList;