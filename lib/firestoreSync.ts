import { doc, setDoc } from 'firebase/firestore';
import { Strategy } from '../types';
import { db } from '../firebase';

const FIRESTORE_RETRY_ATTEMPTS = 3;
const FIRESTORE_RETRY_DELAY_MS = 500;

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

export const writeStrategiesToFirestore = async (
  strategies: Strategy[],
  userId: string
): Promise<void> => {
  const cleanedStrategies = removeUndefinedValues(strategies) as Strategy[];
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, { strategies: cleanedStrategies }, { merge: true });
};

export const writeStrategiesWithRetry = async (
  strategies: Strategy[],
  userId: string
): Promise<{ success: boolean; error?: unknown }> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < FIRESTORE_RETRY_ATTEMPTS; attempt++) {
    try {
      await writeStrategiesToFirestore(strategies, userId);
      return { success: true };
    } catch (error) {
      lastError = error;
      if (attempt < FIRESTORE_RETRY_ATTEMPTS - 1) {
        await delay(FIRESTORE_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  return { success: false, error: lastError };
};

export const SYNC_FAILURE_MESSAGE =
  "Couldn't sync to cloud. Your changes are saved on this device only.";
