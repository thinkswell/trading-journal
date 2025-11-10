import React, { useState, useEffect, useMemo } from 'react';
import { Trade, PyramidEntry, TrailingStop, TradeStatus, PartialExit } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { getTradeStats } from '../lib/tradeCalculations';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency } from '../lib/formatters';
import RichTextEditor from './RichTextEditor';

interface TradeFormProps {
  strategyId: string;
  existingTrade: Trade | null;
  onSave: (trade: Trade) => void;
  onCancel: () => void;
}

// Define InputField outside the component to prevent re-creation on re-renders, which fixes the focus loss issue.
const InputField = ({ label, name, type, value, onChange, onBlur, error, touched, required = true }: { 
  label: string, 
  name: string, 
  type: string, 
  value: any, 
  onChange: any, 
  onBlur?: (name: string, value: any) => void,
  error?: string,
  touched?: boolean,
  required?: boolean 
}) => (
    <div className="relative">
        <label className="block text-sm font-semibold text-[#E0E0E0] mb-3">{label}</label>
        <input 
          type={type} 
          name={name} 
          value={value} 
          onChange={onChange} 
          onBlur={() => onBlur && onBlur(name, value)}
          required={required}
          onWheel={type === 'number' ? (e) => (e.target as HTMLElement).blur() : undefined}
          className={`w-full border rounded-lg px-4 py-3.5 text-white placeholder-[#A0A0A0] 
                    focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                    transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] ${
                      error && touched ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                    }`} 
        />
        <div className="absolute left-0 right-0 mt-1 min-h-[20px]">
          {error && touched && (
            <p className="text-xs text-[#DC3545] font-medium">{error}</p>
          )}
        </div>
    </div>
);

const TradeForm: React.FC<TradeFormProps> = ({ strategyId, existingTrade, onSave, onCancel }) => {
  const [trade, setTrade] = useState<Omit<Trade, 'id' | 'strategyId'>>({
    asset: '',
    date: new Date().toISOString().split('T')[0],
    entryPrice: 0,
    quantity: 0,
    initialSl: 0,
    status: 'open',
    notes: '',
    pyramids: [],
    trailingStops: [],
    partialExits: [],
  });
  const [slInput, setSlInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { currency } = useSettings();

  useEffect(() => {
    if (existingTrade) {
      setTrade({
        ...existingTrade,
        date: new Date(existingTrade.date).toISOString().split('T')[0],
        partialExits: existingTrade.partialExits || [],
      });
      setSlInput(existingTrade.initialSl > 0 ? String(existingTrade.initialSl) : '');
    } else {
       setTrade({
            asset: '',
            date: new Date().toISOString().split('T')[0],
            entryPrice: 0,
            quantity: 0,
            initialSl: 0,
            status: 'open',
            notes: '',
            pyramids: [],
            trailingStops: [],
            partialExits: [],
        });
        setSlInput('');
    }
  }, [existingTrade]);

  useEffect(() => {
    const value = slInput;
    const entryPrice = trade.entryPrice;

    if (entryPrice > 0 && value) {
        let absoluteSl = 0;
        if (value.includes('%')) {
            const percentage = parseFloat(value.replace(/[^0-9.]/g, '')) / 100;
            if (!isNaN(percentage) && percentage > 0) {
                absoluteSl = entryPrice * (1 - percentage);
            }
        } else {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
                absoluteSl = numericValue;
            }
        }
        if (trade.initialSl !== absoluteSl) {
            setTrade(prev => ({ ...prev, initialSl: absoluteSl }));
        }
    } else if (!value) {
         if (trade.initialSl !== 0) {
            setTrade(prev => ({ ...prev, initialSl: 0 }));
        }
    }
  }, [slInput, trade.entryPrice]);

  const slHelperText = useMemo(() => {
    const entryPrice = trade.entryPrice;
    if (!entryPrice || entryPrice <= 0 || !slInput) return null;

    if (slInput.includes('%')) {
        const absoluteSl = trade.initialSl;
        if (!isNaN(absoluteSl) && absoluteSl > 0) {
            return `SL Price: ${formatCurrency(absoluteSl, currency)}`;
        }
    } else {
        const slValueNum = parseFloat(slInput);
        if (!isNaN(slValueNum) && slValueNum > 0) {
            const percentage = ((entryPrice - slValueNum) / entryPrice) * 100;
            if (!isNaN(percentage)) {
                return `Risk: ${percentage.toFixed(2)}%`;
            }
        }
    }
    return null;
  }, [slInput, trade.entryPrice, trade.initialSl, currency]);

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'asset':
        if (!value || value.trim() === '') {
          return 'Asset name is required';
        }
        return '';
      
      case 'date':
        if (!value) {
          return 'Date is required';
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'Invalid date';
        }
        return '';
      
      case 'entryPrice':
        if (value === '' || value === null || value === undefined) {
          return 'Entry price is required';
        }
        const entryPrice = parseFloat(value);
        if (isNaN(entryPrice)) {
          return 'Entry price must be a valid number';
        }
        if (entryPrice <= 0) {
          return 'Entry price must be greater than 0';
        }
        return '';
      
      case 'quantity':
        if (value === '' || value === null || value === undefined) {
          return 'Quantity is required';
        }
        const quantity = parseFloat(value);
        if (isNaN(quantity)) {
          return 'Quantity must be a valid number';
        }
        if (quantity <= 0) {
          return 'Quantity must be greater than 0';
        }
        if (!Number.isInteger(quantity)) {
          return 'Quantity must be a whole number';
        }
        return '';
      
      case 'initialSl':
        if (slInput && slInput.trim() !== '') {
          if (slInput.includes('%')) {
            const percentage = parseFloat(slInput.replace(/[^0-9.]/g, '')) / 100;
            if (isNaN(percentage) || percentage <= 0 || percentage >= 1) {
              return 'Stop loss percentage must be between 0% and 100%';
            }
          } else {
            const absoluteSl = parseFloat(slInput);
            if (isNaN(absoluteSl) || absoluteSl <= 0) {
              return 'Stop loss must be a positive number';
            }
            if (trade.entryPrice > 0 && absoluteSl >= trade.entryPrice) {
              return 'Stop loss must be less than entry price';
            }
          }
        }
        return '';
      
      case 'exitPrice':
        if (trade.status !== 'open' && (trade.partialExits || []).length === 0) {
          if (value === '' || value === null || value === undefined) {
            return 'Exit price is required when trade is closed';
          }
          const exitPrice = parseFloat(value);
          if (isNaN(exitPrice)) {
            return 'Exit price must be a valid number';
          }
          if (exitPrice <= 0) {
            return 'Exit price must be greater than 0';
          }
        }
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const tradeStats = getTradeStats({ ...trade, id: '', strategyId: '' });
    
    // Validate basic fields
    const assetError = validateField('asset', trade.asset);
    if (assetError) newErrors.asset = assetError;
    
    const dateError = validateField('date', trade.date);
    if (dateError) newErrors.date = dateError;
    
    const entryPriceError = validateField('entryPrice', trade.entryPrice);
    if (entryPriceError) newErrors.entryPrice = entryPriceError;
    
    const quantityError = validateField('quantity', trade.quantity);
    if (quantityError) newErrors.quantity = quantityError;
    
    const initialSlError = validateField('initialSl', trade.initialSl);
    if (initialSlError) newErrors.initialSl = initialSlError;
    
    const exitPriceError = validateField('exitPrice', trade.exitPrice);
    if (exitPriceError) newErrors.exitPrice = exitPriceError;
    
    // Validate pyramids
    trade.pyramids.forEach((p, index) => {
      if (isNaN(p.price) || p.price <= 0) {
        newErrors[`pyramid_price_${index}`] = 'Pyramid price must be greater than 0';
      }
      if (isNaN(p.quantity) || p.quantity <= 0) {
        newErrors[`pyramid_quantity_${index}`] = 'Pyramid quantity must be greater than 0';
      }
      if (!Number.isInteger(p.quantity)) {
        newErrors[`pyramid_quantity_${index}`] = 'Pyramid quantity must be a whole number';
      }
      if (p.price === trade.entryPrice) {
        newErrors[`pyramid_price_${index}`] = 'Pyramid price should be different from entry price';
      }
    });
    
    // Validate partial exits
    const totalExitQty = (trade.partialExits || []).reduce((sum, pe) => sum + (isNaN(pe.quantity) ? 0 : pe.quantity), 0);
    (trade.partialExits || []).forEach((pe, index) => {
      if (isNaN(pe.price) || pe.price <= 0) {
        newErrors[`partial_exit_price_${index}`] = 'Exit price must be greater than 0';
      }
      if (isNaN(pe.quantity) || pe.quantity <= 0) {
        newErrors[`partial_exit_quantity_${index}`] = 'Exit quantity must be greater than 0';
      }
      if (!Number.isInteger(pe.quantity)) {
        newErrors[`partial_exit_quantity_${index}`] = 'Exit quantity must be a whole number';
      }
    });
    
    if (totalExitQty > tradeStats.totalBoughtQty) {
      (trade.partialExits || []).forEach((_, index) => {
        if (!newErrors[`partial_exit_quantity_${index}`]) {
          newErrors[`partial_exit_quantity_${index}`] = `Total exit quantity (${totalExitQty}) exceeds holdings (${tradeStats.totalBoughtQty})`;
        }
      });
    }
    
    // Validate trailing stops
    trade.trailingStops.forEach((ts, index) => {
      if (isNaN(ts.price) || ts.price <= 0) {
        newErrors[`trailing_stop_${index}`] = 'Trailing stop price must be greater than 0';
      }
      if (trade.initialSl > 0 && ts.price === trade.initialSl) {
        newErrors[`trailing_stop_${index}`] = 'Trailing stop should be different from initial stop loss';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTrade(prev => ({ ...prev, [name]: name === 'entryPrice' || name === 'quantity' || name === 'exitPrice' ? parseFloat(value) : value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (name: string, value: any) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setTrade(prev => ({ ...prev, notes: newNotes }));
  };

  const handleSlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlInput(e.target.value);
    // Clear error when user starts typing
    if (errors.initialSl) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.initialSl;
        return newErrors;
      });
    }
  };

  const handleSlInputBlur = () => {
    setTouched(prev => ({ ...prev, initialSl: true }));
    const error = validateField('initialSl', trade.initialSl);
    if (error) {
      setErrors(prev => ({ ...prev, initialSl: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.initialSl;
        return newErrors;
      });
    }
  };
  
  const handlePyramidChange = (index: number, field: keyof PyramidEntry, value: string) => {
    const newPyramids = [...trade.pyramids];
    (newPyramids[index] as any)[field] = parseFloat(value);
    setTrade(prev => ({...prev, pyramids: newPyramids}));
    
    // Clear error when user starts typing
    const errorKey = `pyramid_${field}_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }

  const handlePyramidBlur = (index: number, field: keyof PyramidEntry, value: string) => {
    const errorKey = `pyramid_${field}_${index}`;
    setTouched(prev => ({ ...prev, [errorKey]: true }));
    
    const pyramid = trade.pyramids[index];
    if (field === 'price') {
      if (isNaN(pyramid.price) || pyramid.price <= 0) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Pyramid price must be greater than 0' }));
      } else if (pyramid.price === trade.entryPrice) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Pyramid price should be different from entry price' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    } else if (field === 'quantity') {
      if (isNaN(pyramid.quantity) || pyramid.quantity <= 0) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Pyramid quantity must be greater than 0' }));
      } else if (!Number.isInteger(pyramid.quantity)) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Pyramid quantity must be a whole number' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  }
  
  const addPyramid = () => {
    setTrade(prev => ({...prev, pyramids: [...prev.pyramids, {id: `p-${Date.now()}`, price: 0, quantity: 0}]}));
  }

  const removePyramid = (index: number) => {
    setTrade(prev => ({...prev, pyramids: prev.pyramids.filter((_, i) => i !== index)}));
  }

  const handleTrailingStopChange = (index: number, value: string) => {
    const newStops = [...trade.trailingStops];
    newStops[index].price = parseFloat(value);
    setTrade(prev => ({...prev, trailingStops: newStops}));
    
    // Clear error when user starts typing
    const errorKey = `trailing_stop_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }

  const handleTrailingStopBlur = (index: number, value: string) => {
    const errorKey = `trailing_stop_${index}`;
    setTouched(prev => ({ ...prev, [errorKey]: true }));
    
    const stop = trade.trailingStops[index];
    if (isNaN(stop.price) || stop.price <= 0) {
      setErrors(prev => ({ ...prev, [errorKey]: 'Trailing stop price must be greater than 0' }));
    } else if (trade.initialSl > 0 && stop.price === trade.initialSl) {
      setErrors(prev => ({ ...prev, [errorKey]: 'Trailing stop should be different from initial stop loss' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }

  const addTrailingStop = () => {
    setTrade(prev => ({...prev, trailingStops: [...prev.trailingStops, {id: `ts-${Date.now()}`, price: 0}]}));
  }

  const removeTrailingStop = (index: number) => {
    setTrade(prev => ({...prev, trailingStops: prev.trailingStops.filter((_, i) => i !== index)}));
  }

  const handlePartialExitChange = (index: number, field: keyof PartialExit, value: string) => {
    const newExits = [...trade.partialExits];
    (newExits[index] as any)[field] = parseFloat(value);
    setTrade(prev => ({...prev, partialExits: newExits}));
    
    // Clear error when user starts typing
    const errorKey = `partial_exit_${field}_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handlePartialExitBlur = (index: number, field: keyof PartialExit, value: string) => {
    const errorKey = `partial_exit_${field}_${index}`;
    setTouched(prev => ({ ...prev, [errorKey]: true }));
    
    const exit = trade.partialExits[index];
    const tradeStats = getTradeStats({ ...trade, id: '', strategyId: '' });
    const totalExitQty = (trade.partialExits || []).reduce((sum, pe) => sum + (isNaN(pe.quantity) ? 0 : pe.quantity), 0);
    
    if (field === 'price') {
      if (isNaN(exit.price) || exit.price <= 0) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Exit price must be greater than 0' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    } else if (field === 'quantity') {
      if (isNaN(exit.quantity) || exit.quantity <= 0) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Exit quantity must be greater than 0' }));
      } else if (!Number.isInteger(exit.quantity)) {
        setErrors(prev => ({ ...prev, [errorKey]: 'Exit quantity must be a whole number' }));
      } else if (totalExitQty > tradeStats.totalBoughtQty) {
        setErrors(prev => ({ ...prev, [errorKey]: `Total exit quantity (${totalExitQty}) exceeds holdings (${tradeStats.totalBoughtQty})` }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  };
  
  const addPartialExit = () => {
    setTrade(prev => ({...prev, partialExits: [...(prev.partialExits || []), {id: `pe-${Date.now()}`, price: 0, quantity: 0}]}));
  };
  
  const removePartialExit = (index: number) => {
    setTrade(prev => ({...prev, partialExits: (prev.partialExits || []).filter((_, i) => i !== index)}));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      asset: true,
      date: true,
      entryPrice: true,
      quantity: true,
      initialSl: true,
      exitPrice: true,
    });
    
    // Validate entire form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                       document.querySelector(`[data-field="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }
      return;
    }
    
    const sanitizedPyramids = (trade.pyramids || []).map(p => ({
        ...p,
        price: isNaN(p.price) ? 0 : p.price,
        quantity: isNaN(p.quantity) ? 0 : p.quantity,
    }));

    const sanitizedPartialExits = (trade.partialExits || []).map(pe => ({
        ...pe,
        price: isNaN(pe.price) ? 0 : pe.price,
        quantity: isNaN(pe.quantity) ? 0 : pe.quantity,
    }));

    const fullTradeObject: Trade = {
      ...trade,
      entryPrice: isNaN(trade.entryPrice) ? 0 : trade.entryPrice,
      quantity: isNaN(trade.quantity) ? 0 : trade.quantity,
      initialSl: isNaN(trade.initialSl) ? 0 : trade.initialSl,
      exitPrice: trade.exitPrice && !isNaN(trade.exitPrice) ? trade.exitPrice : undefined,
      pyramids: sanitizedPyramids,
      partialExits: sanitizedPartialExits,
      id: existingTrade?.id || `trade-${Date.now()}`,
      strategyId: strategyId,
      date: new Date(trade.date).toISOString()
    };
    
    const stats = getTradeStats(fullTradeObject);

    if (stats.isClosed) {
      const plPercentage = stats.totalInvested > 0 ? (stats.realizedPL / stats.totalInvested) * 100 : 0;
      
      if (plPercentage >= -1.5 && plPercentage <= 1.5) {
        fullTradeObject.status = 'breakeven';
      } else if (stats.realizedPL > 0) {
        fullTradeObject.status = 'win';
      } else {
        fullTradeObject.status = 'loss';
      }
      
      if (stats.avgExitPrice > 0) {
        fullTradeObject.exitPrice = stats.avgExitPrice;
      }
    } else {
       fullTradeObject.status = 'open';
       fullTradeObject.exitPrice = undefined;
    }

    onSave(fullTradeObject);
  };

  const isClosable = trade.status !== 'open' && (trade.partialExits || []).length === 0;
  const tradeStats = getTradeStats({ ...trade, id: '', strategyId: '' });

  return (
    <form onSubmit={handleSubmit} className="p-3 md:p-6 space-y-4 md:space-y-8 h-full md:h-auto md:max-h-[85vh] md:overflow-y-auto flex flex-col md:block">
      <h2 className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-4 md:mb-8">{existingTrade ? 'Edit Trade' : 'Add New Trade'}</h2>
      <div className="flex-1 md:flex-none overflow-y-auto space-y-4 md:space-y-8">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <InputField 
          label="Asset" 
          name="asset" 
          type="text" 
          value={trade.asset} 
          onChange={handleChange} 
          onBlur={handleBlur}
          error={errors.asset}
          touched={touched.asset}
        />
        <InputField 
          label="Date" 
          name="date" 
          type="date" 
          value={trade.date} 
          onChange={handleChange} 
          onBlur={handleBlur}
          error={errors.date}
          touched={touched.date}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <InputField 
          label="Entry Price" 
          name="entryPrice" 
          type="number" 
          value={isNaN(trade.entryPrice) ? '' : trade.entryPrice} 
          onChange={handleChange} 
          onBlur={handleBlur}
          error={errors.entryPrice}
          touched={touched.entryPrice}
        />
        <InputField 
          label="Quantity" 
          name="quantity" 
          type="number" 
          value={isNaN(trade.quantity) ? '' : trade.quantity} 
          onChange={handleChange} 
          onBlur={handleBlur}
          error={errors.quantity}
          touched={touched.quantity}
        />
        <div className="relative">
            <label className="block text-sm font-semibold text-[#E0E0E0] mb-3">Initial SL</label>
            <input 
                type="text" 
                name="initialSl" 
                value={slInput} 
                onChange={handleSlInputChange}
                onBlur={handleSlInputBlur}
                placeholder="e.g., 145.50 or 2%"
                className={`w-full border rounded-lg px-4 py-3.5 text-white placeholder-[#A0A0A0] 
                          focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                          transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] ${
                            errors.initialSl && touched.initialSl ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                          }`} 
            />
            <div className="absolute left-0 right-0 mt-1 min-h-[20px]">
              {errors.initialSl && touched.initialSl && (
                <p className="text-xs text-[#DC3545] font-medium">{errors.initialSl}</p>
              )}
              {slHelperText && !errors.initialSl && <p className="text-xs text-[#6A5ACD] font-medium">{slHelperText}</p>}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
            <label className="block text-sm font-semibold text-[#E0E0E0] mb-3">Status</label>
            <select name="status" value={trade.status} onChange={handleChange} 
                    className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3.5 text-white 
                              focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                              transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer" 
                    disabled={(trade.partialExits||[]).length > 0}>
                <option value="open">Open</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="breakeven">Breakeven</option>
            </select>
        </div>
        {isClosable && (
             <InputField 
               label="Exit Price" 
               name="exitPrice" 
               type="number" 
               value={trade.exitPrice === undefined || isNaN(trade.exitPrice) ? '' : trade.exitPrice} 
               onChange={handleChange} 
               onBlur={handleBlur}
               error={errors.exitPrice}
               touched={touched.exitPrice}
             />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#E0E0E0] mb-3">Notes</label>
        <RichTextEditor content={trade.notes} onSave={handleNotesChange} />
      </div>

      <div className="glass-card p-3 md:p-6 rounded-xl space-y-3 md:space-y-5">
        <h3 className="text-lg md:text-xl font-bold text-white border-b border-[rgba(255,255,255,0.1)] pb-2 md:pb-3">Pyramiding</h3>
        {trade.pyramids.map((p, index) => (
            <div key={p.id} className="flex items-end gap-4">
                <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-[#A0A0A0] mb-2">Price</label>
                    <input 
                      type="number" 
                      value={isNaN(p.price) ? '' : p.price} 
                      onChange={e => handlePyramidChange(index, 'price', e.target.value)} 
                      onBlur={e => handlePyramidBlur(index, 'price', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()} 
                      className={`w-full border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all ${
                        errors[`pyramid_price_${index}`] && touched[`pyramid_price_${index}`] ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                    <div className="absolute left-0 right-0 mt-1 min-h-[18px]">
                      {errors[`pyramid_price_${index}`] && touched[`pyramid_price_${index}`] && (
                        <p className="text-xs text-[#DC3545] font-medium">{errors[`pyramid_price_${index}`]}</p>
                      )}
                    </div>
                </div>
                <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-[#A0A0A0] mb-2">Quantity</label>
                    <input 
                      type="number" 
                      value={isNaN(p.quantity) ? '' : p.quantity} 
                      onChange={e => handlePyramidChange(index, 'quantity', e.target.value)} 
                      onBlur={e => handlePyramidBlur(index, 'quantity', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()} 
                      className={`w-full border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all ${
                        errors[`pyramid_quantity_${index}`] && touched[`pyramid_quantity_${index}`] ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                    <div className="absolute left-0 right-0 mt-1 min-h-[18px]">
                      {errors[`pyramid_quantity_${index}`] && touched[`pyramid_quantity_${index}`] && (
                        <p className="text-xs text-[#DC3545] font-medium">{errors[`pyramid_quantity_${index}`]}</p>
                      )}
                    </div>
                </div>
                <button type="button" onClick={() => removePyramid(index)} 
                        className="p-3 mb-0 text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 rounded-lg transition-all duration-200">
                  <XIcon />
                </button>
            </div>
        ))}
        <button type="button" onClick={addPyramid} 
                className="text-[#6A5ACD] hover:text-[#8b5cf6] flex items-center gap-2 text-sm font-semibold hover:bg-[#6A5ACD]/10 px-4 py-2.5 rounded-lg transition-all duration-200">
          <PlusIcon /> Add Pyramid Entry
        </button>
      </div>

       <div className="glass-card p-3 md:p-6 rounded-xl space-y-3 md:space-y-5">
        <h3 className="text-lg md:text-xl font-bold text-white border-b border-[rgba(255,255,255,0.1)] pb-2 md:pb-3">Partial Exits</h3>
        {(trade.partialExits || []).map((pe, index) => (
            <div key={pe.id} className="flex items-end gap-4">
                <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-[#A0A0A0] mb-2">Exit Price</label>
                    <input 
                      type="number" 
                      value={isNaN(pe.price) ? '' : pe.price} 
                      onChange={e => handlePartialExitChange(index, 'price', e.target.value)} 
                      onBlur={e => handlePartialExitBlur(index, 'price', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()} 
                      className={`w-full border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all ${
                        errors[`partial_exit_price_${index}`] && touched[`partial_exit_price_${index}`] ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                    <div className="absolute left-0 right-0 mt-1 min-h-[18px]">
                      {errors[`partial_exit_price_${index}`] && touched[`partial_exit_price_${index}`] && (
                        <p className="text-xs text-[#DC3545] font-medium">{errors[`partial_exit_price_${index}`]}</p>
                      )}
                    </div>
                </div>
                <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-[#A0A0A0] mb-2">Exit Quantity</label>
                    <input 
                      type="number" 
                      value={isNaN(pe.quantity) ? '' : pe.quantity} 
                      onChange={e => handlePartialExitChange(index, 'quantity', e.target.value)} 
                      onBlur={e => handlePartialExitBlur(index, 'quantity', e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()} 
                      className={`w-full border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all ${
                        errors[`partial_exit_quantity_${index}`] && touched[`partial_exit_quantity_${index}`] ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                    <div className="absolute left-0 right-0 mt-1 min-h-[18px]">
                      {errors[`partial_exit_quantity_${index}`] && touched[`partial_exit_quantity_${index}`] && (
                        <p className="text-xs text-[#DC3545] font-medium">{errors[`partial_exit_quantity_${index}`]}</p>
                      )}
                    </div>
                </div>
                <button type="button" onClick={() => removePartialExit(index)} 
                        className="p-3 mb-0 text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 rounded-lg transition-all duration-200">
                  <XIcon />
                </button>
            </div>
        ))}
        <button type="button" onClick={addPartialExit} 
                className="text-[#6A5ACD] hover:text-[#8b5cf6] flex items-center gap-2 text-sm font-semibold hover:bg-[#6A5ACD]/10 px-4 py-2.5 rounded-lg transition-all duration-200">
          <PlusIcon /> Add Partial Exit
        </button>
        <p className="text-sm text-[#6A5ACD] font-medium mt-4">Current Holdings: {tradeStats.currentHoldingsQty} of {tradeStats.totalBoughtQty}</p>
      </div>

       <div className="glass-card p-3 md:p-6 rounded-xl space-y-3 md:space-y-5">
        <h3 className="text-lg md:text-xl font-bold text-white border-b border-[rgba(255,255,255,0.1)] pb-2 md:pb-3">Trailing Stops</h3>
        {trade.trailingStops.map((ts, index) => (
            <div key={ts.id} className="flex items-center gap-4">
                 <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-[#A0A0A0] mb-2">New SL Price</label>
                    <input 
                      type="number" 
                      value={isNaN(ts.price) ? '' : ts.price} 
                      onChange={e => handleTrailingStopChange(index, e.target.value)} 
                      onBlur={e => handleTrailingStopBlur(index, e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()} 
                      className={`w-full border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none transition-all ${
                        errors[`trailing_stop_${index}`] && touched[`trailing_stop_${index}`] ? 'border-[#DC3545]/50 focus:border-[#DC3545]/50 focus:ring-[#DC3545]/50' : 'border-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                    <div className="absolute left-0 right-0 mt-1 min-h-[18px]">
                      {errors[`trailing_stop_${index}`] && touched[`trailing_stop_${index}`] && (
                        <p className="text-xs text-[#DC3545] font-medium">{errors[`trailing_stop_${index}`]}</p>
                      )}
                    </div>
                 </div>
                <button type="button" onClick={() => removeTrailingStop(index)} 
                        className="p-3 text-[#DC3545] hover:text-[#e85d75] hover:bg-[#DC3545]/10 rounded-lg transition-all duration-200 mt-6">
                  <XIcon />
                </button>
            </div>
        ))}
        <button type="button" onClick={addTrailingStop} 
                className="text-[#6A5ACD] hover:text-[#8b5cf6] flex items-center gap-2 text-sm font-semibold hover:bg-[#6A5ACD]/10 px-4 py-2.5 rounded-lg transition-all duration-200">
          <PlusIcon /> Add Trailing SL
        </button>
      </div>

      </div>
      <div className="flex flex-col md:flex-row justify-end gap-3 md:gap-4 pt-3 md:pt-6 border-t border-[rgba(255,255,255,0.1)] mt-auto md:mt-0">
        <button type="button" onClick={onCancel} 
                className="w-full md:w-auto bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
          Cancel
        </button>
        <button type="submit" 
                className="w-full md:w-auto bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                          shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
          Save Trade
        </button>
      </div>
    </form>
  );
};

export default TradeForm;