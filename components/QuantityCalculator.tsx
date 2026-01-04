import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import { CalculatorIcon } from './icons/CalculatorIcon';

const QuantityCalculator: React.FC = () => {
  const { currency } = useSettings();
  const [capital, setCapital] = useLocalStorage<number>('quantity-calculator-capital', 100000);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');

  // Custom inputs
  const [customRiskPercent, setCustomRiskPercent] = useState<string>('');
  const [customShares, setCustomShares] = useState<string>('');
  const [customAllocation, setCustomAllocation] = useState<string>('');

  const entryPriceNum = parseFloat(entryPrice) || 0;
  const stopLossNum = parseFloat(stopLoss) || 0;
  const priceDiff = entryPriceNum - stopLossNum;

  // Clear custom inputs when base inputs change
  useEffect(() => {
    setCustomRiskPercent('');
    setCustomShares('');
    setCustomAllocation('');
  }, [entryPrice, stopLoss, capital]);

  // Calculate Risk on Investment
  const riskOnInvestment = useMemo(() => {
    if (entryPriceNum > 0 && priceDiff > 0) {
      return (priceDiff / entryPriceNum) * 100;
    }
    return 0;
  }, [entryPriceNum, priceDiff]);

  // Risk percentages for table
  const riskPercentages = [0.10, 0.25, 0.5, 1.0];

  // Calculate table data
  const tableData = useMemo(() => {
    if (capital <= 0 || entryPriceNum <= 0 || priceDiff <= 0) {
      return riskPercentages.map(() => ({
        shares: 0,
        investment: 0,
        allocation: 0
      }));
    }

    return riskPercentages.map(riskPercent => {
      const riskAmount = capital * (riskPercent / 100);
      const shares = Math.floor(riskAmount / priceDiff);
      const investment = shares * entryPriceNum;
      const allocation = (investment / capital) * 100;

      return {
        shares,
        investment,
        allocation
      };
    });
  }, [capital, entryPriceNum, priceDiff, riskPercentages]);

  const handleCustomRiskChange = (value: string) => {
    setCustomRiskPercent(value);
    if (capital > 0 && entryPriceNum > 0 && priceDiff > 0) {
      const riskPercent = parseFloat(value);
      if (!isNaN(riskPercent) && riskPercent > 0) {
        const riskAmount = capital * (riskPercent / 100);
        const shares = Math.floor(riskAmount / priceDiff);
        const investment = shares * entryPriceNum;
        const allocation = (investment / capital) * 100;

        setCustomShares(shares.toString());
        setCustomAllocation(allocation.toFixed(2));
      } else {
        setCustomShares('');
        setCustomAllocation('');
      }
    }
  };

  const handleCustomSharesChange = (value: string) => {
    setCustomShares(value);
    if (capital > 0 && entryPriceNum > 0 && priceDiff > 0) {
      const shares = parseFloat(value);
      if (!isNaN(shares) && shares > 0) {
        const investment = shares * entryPriceNum;
        const allocation = (investment / capital) * 100;
        const riskAmount = shares * priceDiff;
        const riskPercent = (riskAmount / capital) * 100;

        setCustomAllocation(allocation.toFixed(2));
        setCustomRiskPercent(riskPercent.toFixed(2));
      } else {
        setCustomAllocation('');
        setCustomRiskPercent('');
      }
    }
  };

  const handleCustomAllocationChange = (value: string) => {
    setCustomAllocation(value);
    if (capital > 0 && entryPriceNum > 0 && priceDiff > 0) {
      const allocation = parseFloat(value);
      if (!isNaN(allocation) && allocation > 0) {
        const investment = capital * (allocation / 100);
        const shares = Math.floor(investment / entryPriceNum);
        const riskAmount = shares * priceDiff;
        const riskPercent = (riskAmount / capital) * 100;

        setCustomShares(shares.toString());
        setCustomRiskPercent(riskPercent.toFixed(2));
      } else {
        setCustomShares('');
        setCustomRiskPercent('');
      }
    }
  };

  const isValid = entryPriceNum > 0 && stopLossNum > 0 && priceDiff > 0 && capital > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <CalculatorIcon />
          Quantity Calculator
        </h1>
        <p className="text-[#A0A0A0]">Calculate trade allocation and risk based on your capital, entry price, and stop loss</p>
      </div>

      {/* Input Section */}
      <div className="glass-card p-4 md:p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-white mb-4">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="capital" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
              Capital
            </label>
            <input
              type="number"
              id="capital"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
              className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
              placeholder="100000"
            />
          </div>
          <div>
            <label htmlFor="entryPrice" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
              Entry Price
            </label>
            <input
              type="number"
              id="entryPrice"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
              placeholder="2308.00"
            />
          </div>
          <div>
            <label htmlFor="stopLoss" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
              Stop Loss
            </label>
            <input
              type="number"
              id="stopLoss"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
              placeholder="2250.00"
            />
          </div>
        </div>

        {/* Risk on Investment Display */}
        {isValid && (
          <div className="mt-4 p-4 bg-[rgba(106,90,205,0.1)] border border-[rgba(106,90,205,0.3)] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[#E0E0E0] font-semibold">Risk on Investment:</span>
              <span className="text-white font-bold text-lg">{riskOnInvestment.toFixed(2)}%</span>
            </div>
          </div>
        )}

        {!isValid && entryPrice && stopLoss && (
          <div className="mt-4 p-4 bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.3)] rounded-lg">
            <p className="text-[#DC3545] text-sm">
              {entryPriceNum <= stopLossNum ? 'Entry Price must be greater than Stop Loss' : 'Please enter valid values'}
            </p>
          </div>
        )}
      </div>

      {/* Table Section */}
      {isValid && (
        <div className="glass-card p-4 md:p-6 rounded-xl shadow-sm overflow-x-auto">
          <h2 className="text-xl font-bold text-white mb-4">Risk Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)]">
                  <th className="p-3 text-sm font-semibold text-[#A0A0A0] uppercase">Risk% of Capital</th>
                  {riskPercentages.map(risk => (
                    <th key={risk} className="p-3 text-sm font-semibold text-[#A0A0A0] uppercase text-center">
                      {risk}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="p-3 text-[#E0E0E0] font-medium">No. of Shares</td>
                  {tableData.map((data, index) => (
                    <td key={index} className="p-3 text-white text-center font-semibold">
                      {data.shares}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="p-3 text-[#E0E0E0] font-medium">Investment per trade</td>
                  {tableData.map((data, index) => (
                    <td key={index} className="p-3 text-white text-center font-semibold">
                      {formatCurrency(data.investment, currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-[#E0E0E0] font-medium">Allocation</td>
                  {tableData.map((data, index) => (
                    <td key={index} className="p-3 text-white text-center font-semibold">
                      {data.allocation.toFixed(2)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Inputs Section */}
      {isValid && (
        <div className="glass-card p-4 md:p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-white mb-4">Custom Allocations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="customRisk" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
                % Risk on Capital
              </label>
              <input
                type="number"
                id="customRisk"
                value={customRiskPercent}
                onChange={(e) => handleCustomRiskChange(e.target.value)}
                step="0.01"
                className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="customShares" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
                Number of Shares
              </label>
              <input
                type="number"
                id="customShares"
                value={customShares}
                onChange={(e) => handleCustomSharesChange(e.target.value)}
                className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="customAllocation" className="block text-sm font-semibold text-[#E0E0E0] mb-2">
                % Allocation of Capital
              </label>
              <input
                type="number"
                id="customAllocation"
                value={customAllocation}
                onChange={(e) => handleCustomAllocationChange(e.target.value)}
                step="0.01"
                className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 bg-[rgba(255,255,255,0.05)] text-white placeholder-[#A0A0A0] focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuantityCalculator;

