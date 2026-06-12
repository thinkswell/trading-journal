import { PendingWrite, SyncEntityType } from '../types';
import { deleteNoteDoc, deleteStrategyDoc, deleteTradeDoc, upsertNoteDoc, upsertStrategyDoc, upsertTradeDoc } from './firestoreSync';

const QUEUE_KEY = 'trading-journal-pending-sync';

const readQueue = (): PendingWrite[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingWrite[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: PendingWrite[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const addPendingWrite = (write: PendingWrite) => {
  const queue = readQueue();
  const deduped = queue.filter(item => !(item.entity === write.entity && item.id === write.id));
  deduped.push(write);
  writeQueue(deduped);
  return deduped;
};

export const removePendingWrite = (entity: SyncEntityType, id: string) => {
  const queue = readQueue().filter(item => !(item.entity === entity && item.id === id));
  writeQueue(queue);
  return queue;
};

export const getPendingWrites = () => readQueue();

export const clearPendingWrites = () => {
  writeQueue([]);
  return [];
};

export const flushPendingWrites = async (userId: string) => {
  const queue = readQueue();
  if (!queue.length) return { failed: [] as PendingWrite[] };

  const failed: PendingWrite[] = [];

  for (const write of queue) {
    try {
      if (write.entity === 'strategy') {
        if (write.op === 'delete') {
          await deleteStrategyDoc(write.id, userId, 'pending-queue');
        } else {
          await upsertStrategyDoc({ id: write.id, name: '', initialCapital: 0, trades: [], updatedAt: write.updatedAt } as any, userId, 'pending-queue');
        }
      } else if (write.entity === 'trade') {
        if (write.op === 'delete') {
          await deleteTradeDoc(write.id, userId, 'pending-queue');
        } else {
          // The queue stores only metadata; callers should retry with full trade payload when possible.
          await upsertTradeDoc({ id: write.id, strategyId: '', asset: '', date: '', entryPrice: 0, quantity: 0, initialSl: 0, status: 'open', notes: '', pyramids: [], trailingStops: [], partialExits: [], updatedAt: write.updatedAt } as any, userId, 'pending-queue');
        }
      } else if (write.entity === 'note') {
        if (write.op === 'delete') {
          await deleteNoteDoc(write.id, userId, 'pending-queue');
        } else {
          await upsertNoteDoc({ id: write.id, title: '', content: '', tags: [], createdAt: write.updatedAt, updatedAt: write.updatedAt } as any, userId, 'pending-queue');
        }
      }

      removePendingWrite(write.entity, write.id);
    } catch (error) {
      failed.push({ ...write, updatedAt: write.updatedAt });
    }
  }

  return { failed };
};
