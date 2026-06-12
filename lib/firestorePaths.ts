import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const userDocRef = (userId: string) => doc(db, 'users', userId);

export const strategyDocRef = (userId: string, strategyId: string) =>
  doc(db, 'users', userId, 'strategies', strategyId);

export const tradeDocRef = (userId: string, tradeId: string) =>
  doc(db, 'users', userId, 'trades', tradeId);

export const noteDocRef = (userId: string, noteId: string) =>
  doc(db, 'users', userId, 'notes', noteId);

export const strategiesCollectionRef = (userId: string) =>
  collection(db, 'users', userId, 'strategies');

export const tradesCollectionRef = (userId: string) =>
  collection(db, 'users', userId, 'trades');

export const notesCollectionRef = (userId: string) =>
  collection(db, 'users', userId, 'notes');
