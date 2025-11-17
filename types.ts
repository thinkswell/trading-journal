export interface PyramidEntry {
  id: string;
  price: number;
  quantity: number;
}

export interface PartialExit {
  id: string;
  price: number;
  quantity: number;
}

export interface TrailingStop {
  id: string;
  price: number;
}

export type TradeStatus = 'open' | 'win' | 'loss' | 'breakeven';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface Trade {
  id: string;
  strategyId: string;
  asset: string;
  date: string; // ISO string
  entryPrice: number;
  quantity: number;
  initialSl: number;
  exitPrice?: number;
  status: TradeStatus;
  notes: string;
  pyramids: PyramidEntry[];
  trailingStops: TrailingStop[];
  partialExits: PartialExit[];
  statusManuallySet?: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  initialCapital: number;
  trades: Trade[];
}