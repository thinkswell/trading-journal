import { deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { Strategy, Trade, Note } from '../types';
import { db } from '../firebase';
import { strategyDocRef, tradeDocRef, noteDocRef, tradesCollectionRef } from './firestorePaths';

const SYNC_LOG_PREFIX = '[Sync]';
const FIRESTORE_RETRY_ATTEMPTS = 3;
const FIRESTORE_RETRY_DELAY_MS = 500;

export const getSyncStats = (strategies: Strategy[]) => ({
  strategyCount: strategies.length,
  tradeCount: strategies.reduce((sum, s) => sum + s.trades.length, 0),
});

export const logSync = (message: string, details?: Record<string, unknown>) => {
  if (details) {
    console.log(`${SYNC_LOG_PREFIX} ${message}`, details);
  } else {
    console.log(`${SYNC_LOG_PREFIX} ${message}`);
  }
};

export const logSyncWarn = (message: string, details?: Record<string, unknown>) => {
  if (details) {
    console.warn(`${SYNC_LOG_PREFIX} ${message}`, details);
  } else {
    console.warn(`${SYNC_LOG_PREFIX} ${message}`);
  }
};

export const logSyncError = (message: string, error?: unknown, details?: Record<string, unknown>) => {
  console.error(`${SYNC_LOG_PREFIX} ${message}`, { ...details, error });
};

export const removeUndefinedValues = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const stampUpdatedAt = <T extends { updatedAt?: string }>(entity: T): T => ({
  ...entity,
  updatedAt: entity.updatedAt ?? new Date().toISOString(),
});

const runWithRetry = async <T>(
  operationName: string,
  userId: string,
  operation: () => Promise<T>,
  context: string,
  extra?: Record<string, unknown>
): Promise<{ success: true; value: T } | { success: false; error: unknown }> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < FIRESTORE_RETRY_ATTEMPTS; attempt++) {
    const attemptNumber = attempt + 1;
    try {
      if (attempt > 0) {
        logSync(`Retrying Firestore ${operationName}`, { context, userId, attempt: attemptNumber, maxAttempts: FIRESTORE_RETRY_ATTEMPTS, ...extra });
      }
      const value = await operation();
      logSync(`Firestore ${operationName} succeeded`, { context, userId, attempt: attemptNumber, ...extra });
      return { success: true, value };
    } catch (error) {
      lastError = error;
      logSyncWarn(`Firestore ${operationName} attempt failed`, {
        context,
        userId,
        attempt: attemptNumber,
        maxAttempts: FIRESTORE_RETRY_ATTEMPTS,
        error: error instanceof Error ? error.message : error,
        ...extra,
      });
      if (attempt < FIRESTORE_RETRY_ATTEMPTS - 1) {
        const waitMs = FIRESTORE_RETRY_DELAY_MS * (attempt + 1);
        logSync('Scheduling Firestore retry after delay', { context, waitMs, nextAttempt: attemptNumber + 1, userId, ...extra });
        await delay(waitMs);
      }
    }
  }

  logSyncError(`Firestore ${operationName} failed after all retries`, lastError, { context, userId, attempts: FIRESTORE_RETRY_ATTEMPTS, ...extra });
  return { success: false, error: lastError };
};

const cleanEntity = <T>(entity: T): T => removeUndefinedValues(entity) as T;

export const upsertStrategyDoc = async (
  strategy: Strategy,
  userId: string,
  context = 'upsert-strategy'
): Promise<{ success: boolean; error?: unknown }> => {
  const stampedStrategy = stampUpdatedAt(strategy);
  const result = await runWithRetry('strategy upsert', userId, async () => {
    const ref = strategyDocRef(userId, stampedStrategy.id);
    await setDoc(ref, cleanEntity(stampedStrategy), { merge: true });
  }, context, { strategyId: stampedStrategy.id });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const deleteStrategyDoc = async (
  strategyId: string,
  userId: string,
  context = 'delete-strategy'
): Promise<{ success: boolean; error?: unknown }> => {
  const result = await runWithRetry('strategy delete', userId, async () => {
    const tradeSnap = await getDocs(tradesCollectionRef(userId));
    const matchingTrades = tradeSnap.docs.filter(docSnap => docSnap.data().strategyId === strategyId);

    if (matchingTrades.length > 0) {
      const batch = writeBatch(db);
      matchingTrades.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }

    await deleteDoc(strategyDocRef(userId, strategyId));
  }, context, { strategyId });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const upsertTradeDoc = async (
  trade: Trade,
  userId: string,
  context = 'upsert-trade'
): Promise<{ success: boolean; error?: unknown }> => {
  const stampedTrade = stampUpdatedAt(trade);
  const result = await runWithRetry('trade upsert', userId, async () => {
    await setDoc(tradeDocRef(userId, stampedTrade.id), cleanEntity(stampedTrade), { merge: true });
  }, context, { tradeId: stampedTrade.id, strategyId: stampedTrade.strategyId });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const deleteTradeDoc = async (
  tradeId: string,
  userId: string,
  context = 'delete-trade'
): Promise<{ success: boolean; error?: unknown }> => {
  const result = await runWithRetry('trade delete', userId, async () => {
    await deleteDoc(tradeDocRef(userId, tradeId));
  }, context, { tradeId });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const upsertNoteDoc = async (
  note: Note,
  userId: string,
  context = 'upsert-note'
): Promise<{ success: boolean; error?: unknown }> => {
  const stampedNote = stampUpdatedAt(note);
  const result = await runWithRetry('note upsert', userId, async () => {
    await setDoc(noteDocRef(userId, stampedNote.id), cleanEntity(stampedNote), { merge: true });
  }, context, { noteId: stampedNote.id });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const deleteNoteDoc = async (
  noteId: string,
  userId: string,
  context = 'delete-note'
): Promise<{ success: boolean; error?: unknown }> => {
  const result = await runWithRetry('note delete', userId, async () => {
    await deleteDoc(noteDocRef(userId, noteId));
  }, context, { noteId });

  return result.success ? { success: true } : { success: false, error: result.error };
};

export const writeStrategiesToFirestore = async (
  strategies: Strategy[],
  userId: string,
  context: string
): Promise<void> => {
  const stats = getSyncStats(strategies);
  logSync('Writing strategies to Firestore', { context, userId, ...stats });
  const cleanedStrategies = removeUndefinedValues(strategies) as Strategy[];
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, { strategies: cleanedStrategies }, { merge: true });
  logSync('Firestore write completed', { context, userId, ...stats });
};

export const writeStrategiesWithRetry = async (
  strategies: Strategy[],
  userId: string,
  context = 'save'
): Promise<{ success: boolean; error?: unknown }> => {
  const stats = getSyncStats(strategies);
  logSync('Attempting data sync to Firestore', { context, userId, ...stats });

  let lastError: unknown;

  for (let attempt = 0; attempt < FIRESTORE_RETRY_ATTEMPTS; attempt++) {
    const attemptNumber = attempt + 1;
    try {
      if (attempt > 0) {
        logSync('Retrying Firestore sync', {
          context,
          userId,
          attempt: attemptNumber,
          maxAttempts: FIRESTORE_RETRY_ATTEMPTS,
          ...stats,
        });
      }
      await writeStrategiesToFirestore(strategies, userId, context);
      logSync('Firestore sync succeeded', {
        context,
        userId,
        attempt: attemptNumber,
        ...stats,
      });
      return { success: true };
    } catch (error) {
      lastError = error;
      logSyncWarn('Firestore sync attempt failed', {
        context,
        userId,
        attempt: attemptNumber,
        maxAttempts: FIRESTORE_RETRY_ATTEMPTS,
        error: error instanceof Error ? error.message : error,
        ...stats,
      });
      if (attempt < FIRESTORE_RETRY_ATTEMPTS - 1) {
        const waitMs = FIRESTORE_RETRY_DELAY_MS * (attempt + 1);
        logSync('Scheduling sync retry after delay', { context, waitMs, nextAttempt: attemptNumber + 1 });
        await delay(waitMs);
      }
    }
  }

  logSyncError('Firestore sync failed after all retries', lastError, {
    context,
    userId,
    attempts: FIRESTORE_RETRY_ATTEMPTS,
    ...stats,
  });
  return { success: false, error: lastError };
};

export const SYNC_FAILURE_MESSAGE =
  "Couldn't sync to cloud. Your changes are saved on this device only.";

export const writeNotesToFirestore = async (
  notes: Note[],
  userId: string,
  context: string
): Promise<void> => {
  logSync('Writing notes to Firestore', { context, userId, noteCount: notes.length });
  const cleanedNotes = removeUndefinedValues(notes) as Note[];
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, { notes: cleanedNotes }, { merge: true });
  logSync('Notes Firestore write completed', { context, userId, noteCount: cleanedNotes.length });
};

export const writeNotesWithRetry = async (
  notes: Note[],
  userId: string,
  context = 'save'
): Promise<{ success: boolean; error?: unknown }> => {
  logSync('Attempting notes sync to Firestore', { context, userId, noteCount: notes.length });

  let lastError: unknown;

  for (let attempt = 0; attempt < FIRESTORE_RETRY_ATTEMPTS; attempt++) {
    const attemptNumber = attempt + 1;
    try {
      if (attempt > 0) {
        logSync('Retrying notes Firestore sync', {
          context,
          userId,
          attempt: attemptNumber,
          maxAttempts: FIRESTORE_RETRY_ATTEMPTS,
          noteCount: notes.length,
        });
      }
      await writeNotesToFirestore(notes, userId, context);
      logSync('Notes Firestore sync succeeded', {
        context,
        userId,
        attempt: attemptNumber,
        noteCount: notes.length,
      });
      return { success: true };
    } catch (error) {
      lastError = error;
      logSyncWarn('Notes Firestore sync attempt failed', {
        context,
        userId,
        attempt: attemptNumber,
        maxAttempts: FIRESTORE_RETRY_ATTEMPTS,
        error: error instanceof Error ? error.message : error,
        noteCount: notes.length,
      });
      if (attempt < FIRESTORE_RETRY_ATTEMPTS - 1) {
        const waitMs = FIRESTORE_RETRY_DELAY_MS * (attempt + 1);
        logSync('Scheduling notes sync retry after delay', { context, waitMs, nextAttempt: attemptNumber + 1 });
        await delay(waitMs);
      }
    }
  }

  logSyncError('Notes Firestore sync failed after all retries', lastError, {
    context,
    userId,
    attempts: FIRESTORE_RETRY_ATTEMPTS,
    noteCount: notes.length,
  });
  return { success: false, error: lastError };
};
