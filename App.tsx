import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Strategy, Trade, Note } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mergeStrategies, mergeNotes } from './lib/firebaseSyncUtils';
import {
  removeUndefinedValues,
  SYNC_FAILURE_MESSAGE,
  upsertStrategyDoc,
  upsertTradeDoc,
  deleteStrategyDoc,
  deleteTradeDoc,
  upsertNoteDoc,
  deleteNoteDoc,
  getSyncStats,
  logSync,
  logSyncWarn,
  logSyncError,
} from './lib/firestoreSync';
import SyncSnackbar from './components/SyncSnackbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import StrategyView from './components/StrategyView';
import TradeDetailPage from './components/TradeDetailPage';
import ProfilePage from './components/ProfilePage';
import ToolsPage from './components/ToolsPage';
import QuantityCalculator from './components/QuantityCalculator';
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { PlusIcon } from './components/icons/PlusIcon';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import TradeForm from './components/TradeForm';
import { SettingsProvider } from './contexts/SettingsContext';
import NotesPage from './components/NotesPage';

const LOCAL_STRATEGIES_KEY = 'trading-journal-strategies';
const LOCAL_NOTES_KEY = 'trading-journal-notes';

const initialStrategies: Strategy[] = [
    {
        id: 'strategy-1',
        name: 'Momentum Scalping',
        initialCapital: 10000,
        trades: [
            { id: 'trade-1-1', strategyId: 'strategy-1', asset: 'TSLA', date: '2023-10-26T10:00:00Z', entryPrice: 210.50, quantity: 10, initialSl: 208.00, exitPrice: 215.00, status: 'win', notes: '<b>Strong pre-market momentum.</b> Followed the plan exactly.', pyramids: [], trailingStops: [{id: 'ts1', price: 212.00}], partialExits: [] },
            { id: 'trade-1-2', strategyId: 'strategy-1', asset: 'AAPL', date: '2023-10-26T11:30:00Z', entryPrice: 170.20, quantity: 20, initialSl: 169.50, exitPrice: 169.00, status: 'loss', notes: 'Faked out on the breakout. <i>Should have waited for more confirmation.</i>', pyramids: [], trailingStops: [], partialExits: [] },
        ]
    },
    {
        id: 'strategy-2',
        name: 'Swing Kings',
        initialCapital: 50000,
        trades: [
             { id: 'trade-2-1', strategyId: 'strategy-2', asset: 'GOOGL', date: '2023-10-25T14:00:00Z', entryPrice: 135.00, quantity: 50, initialSl: 132.50, status: 'open', notes: 'Earnings run-up play. Plan is to scale out into strength.', pyramids: [{id: 'p1', price: 136.50, quantity: 25}], trailingStops: [{id: 'ts1', price: 134.00}], partialExits: [] },
        ]
    }
];

const getLocalStrategies = (): Strategy[] => {
  try {
    const item = window.localStorage.getItem(LOCAL_STRATEGIES_KEY);
    return item ? JSON.parse(item) : initialStrategies;
  } catch (error) {
    console.error('Failed to read strategies from localStorage:', error);
    return initialStrategies;
  }
};

const getLocalNotes = (): Note[] => {
  try {
    const item = window.localStorage.getItem(LOCAL_NOTES_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error('Failed to read notes from localStorage:', error);
    return [];
  }
};

// URL routing helper functions
// Convert strategy name to URL-friendly slug
const nameToSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Build a map of strategy slugs to strategy IDs, handling duplicates with counters
const buildStrategySlugMap = (strategies: Strategy[]): Map<string, string> => {
  const slugMap = new Map<string, string>();
  const slugCounts = new Map<string, number>();
  
  // First pass: count occurrences of each slug
  strategies.forEach(strategy => {
    const baseSlug = nameToSlug(strategy.name);
    slugCounts.set(baseSlug, (slugCounts.get(baseSlug) || 0) + 1);
  });
  
  // Second pass: create slugs with counters for duplicates
  const usedSlugs = new Map<string, number>();
  strategies.forEach(strategy => {
    const baseSlug = nameToSlug(strategy.name);
    const count = slugCounts.get(baseSlug) || 1;
    
    let finalSlug: string;
    if (count > 1) {
      // Multiple strategies with same name, need counter
      const currentCount = (usedSlugs.get(baseSlug) || 0) + 1;
      usedSlugs.set(baseSlug, currentCount);
      finalSlug = currentCount === 1 ? baseSlug : `${baseSlug}-${currentCount}`;
    } else {
      // Unique name, no counter needed
      finalSlug = baseSlug;
    }
    
    slugMap.set(finalSlug, strategy.id);
  });
  
  return slugMap;
};

// Build reverse map: strategy ID to slug
const buildStrategyIdToSlugMap = (strategies: Strategy[]): Map<string, string> => {
  const idToSlugMap = new Map<string, string>();
  const slugMap = buildStrategySlugMap(strategies);
  
  // Reverse the slug map
  slugMap.forEach((id, slug) => {
    idToSlugMap.set(id, slug);
  });
  
  return idToSlugMap;
};

const getViewFromPath = (pathname: string, strategies: Strategy[]): string => {
  // Remove leading/trailing slashes and split
  const path = pathname.replace(/^\/+|\/+$/g, '');
  
  if (!path || path === 'dashboard') {
    return 'dashboard';
  }
  
  if (path === 'profile') {
    return 'profile';
  }
  
  if (path === 'tools') {
    return 'tools';
  }

  if (path === 'notes') {
    return 'notes';
  }

  // Check for tools route: /tools/:tool-slug
  const toolsMatch = path.match(/^tools\/(.+)$/);
  if (toolsMatch) {
    const toolSlug = decodeURIComponent(toolsMatch[1]);
    if (toolSlug === 'quantity-calculator') {
      return 'tools/quantity-calculator';
    }
    // Unknown tool, redirect to tools
    return 'tools';
  }
  
  // Check for strategy route: /strategy/:slug
  const strategyMatch = path.match(/^strategy\/(.+)$/);
  if (strategyMatch) {
    const strategySlug = decodeURIComponent(strategyMatch[1]);
    const slugMap = buildStrategySlugMap(strategies);
    const strategyId = slugMap.get(strategySlug);
    
    if (strategyId) {
      // Validate strategy still exists
      const strategy = strategies.find(s => s.id === strategyId);
      if (strategy) {
        return strategyId;
      }
    }
    // Invalid strategy, redirect to dashboard
    return 'dashboard';
  }
  
  // Check for trade route: /trade/:id
  const tradeMatch = path.match(/^trade\/(.+)$/);
  if (tradeMatch) {
    const tradeId = decodeURIComponent(tradeMatch[1]);
    // Validate trade exists
    for (const strategy of strategies) {
      const trade = strategy.trades.find(t => t.id === tradeId);
      if (trade) {
        return `trade/${tradeId}`;
      }
    }
    // Invalid trade, redirect to dashboard
    return 'dashboard';
  }
  
  // Unknown route, default to dashboard
  return 'dashboard';
};

const getPathFromView = (view: string, strategies: Strategy[]): string => {
  if (view === 'dashboard') {
    return '/dashboard';
  }
  
  if (view === 'profile') {
    return '/profile';
  }
  
  if (view === 'tools') {
    return '/tools';
  }
  
  if (view === 'tools/quantity-calculator') {
    return '/tools/quantity-calculator';
  }

  if (view === 'notes') {
    return '/notes';
  }

  // Check if it's a trade view
  if (view.startsWith('trade/')) {
    const tradeId = view.split('/')[1];
    return `/trade/${encodeURIComponent(tradeId)}`;
  }
  
  // It's a strategy ID, convert to slug
  const idToSlugMap = buildStrategyIdToSlugMap(strategies);
  const slug = idToSlugMap.get(view);
  
  if (slug) {
    return `/strategy/${encodeURIComponent(slug)}`;
  }
  
  // Fallback to strategy ID if slug not found (shouldn't happen)
  return `/strategy/${encodeURIComponent(view)}`;
};

const AppContent: React.FC = () => {
  const [strategies, setStrategies] = useLocalStorage<Strategy[]>(LOCAL_STRATEGIES_KEY, initialStrategies);
  const [notes, setNotes] = useLocalStorage<Note[]>(LOCAL_NOTES_KEY, []);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [previousView, setPreviousView] = useState<string>('dashboard');
  const [isNewStrategyModalOpen, setIsNewStrategyModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyCapital, setNewStrategyCapital] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isTradeFormOpen, setIsTradeFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const hasInitializedFromUrl = useRef(false);

  const [syncFailed, setSyncFailed] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState(SYNC_FAILURE_MESSAGE);
  const [pendingSync, setPendingSync] = useState<Strategy[] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const strategiesRef = useRef<Strategy[]>(strategies);
  const notesRef = useRef<Note[]>(notes);
  const pendingFirestoreDuringLoadRef = useRef<Strategy[] | null>(null);
  const pendingFirestoreDuringLoadNotesRef = useRef<Note[] | null>(null);
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    strategiesRef.current = strategies;
  }, [strategies]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const navigateTo = (view: string) => {
    setPreviousView(activeView);
    setActiveView(view);
    // Update URL without page reload
    const path = getPathFromView(view, strategies);
    window.history.pushState({ view }, '', path);
  };


  const reportSyncFailure = useCallback((strategiesToSync: Strategy[], error?: unknown, context = 'save') => {
    setPendingSync(strategiesToSync);
    setSyncFailed(true);
    setSyncSuccess(false);
    const detail =
      error instanceof Error ? error.message : error ? String(error) : undefined;
    setSyncErrorMessage(
      detail ? `${SYNC_FAILURE_MESSAGE} (${detail})` : SYNC_FAILURE_MESSAGE
    );
    logSyncError('Sync failure surfaced to user (snackbar shown)', error, {
      context,
      ...getSyncStats(strategiesToSync),
    });
  }, []);

  const clearSyncFailure = useCallback((context = 'save') => {
    setSyncFailed(false);
    setPendingSync(null);
    setSyncErrorMessage(SYNC_FAILURE_MESSAGE);
    logSync('Sync failure state cleared', { context });
  }, []);

  const syncStrategiesToCloud = useCallback(
    async (strategiesToSync: Strategy[], context = 'save'): Promise<boolean> => {
      const user = auth.currentUser;
      if (!user) {
        logSyncWarn('Skipping Firestore sync — user not authenticated (localStorage only)', { context, ...getSyncStats(strategiesToSync) });
        return false;
      }

      const previousStrategies: Strategy[] = strategiesRef.current;
      const previousMap = new Map<string, Strategy>(previousStrategies.map(strategy => [strategy.id, strategy]));
      const nextMap = new Map<string, Strategy>(strategiesToSync.map(strategy => [strategy.id, strategy]));
      logSync('Starting per-document strategy sync', { context, userId: user.uid, ...getSyncStats(strategiesToSync) });

      try {
        for (const [strategyId, nextStrategy] of nextMap) {
          const previousStrategy = previousMap.get(strategyId);
          if (!previousStrategy) {
            await upsertStrategyDoc(nextStrategy, user.uid, context);
            for (const trade of nextStrategy.trades) {
              await upsertTradeDoc(trade, user.uid, context);
            }
            continue;
          }

          if (JSON.stringify(previousStrategy) !== JSON.stringify(nextStrategy)) {
            await upsertStrategyDoc(nextStrategy, user.uid, context);
          }

          const previousTradeMap = new Map<string, Trade>(previousStrategy.trades.map(trade => [trade.id, trade]));
          const nextTradeMap = new Map<string, Trade>(nextStrategy.trades.map(trade => [trade.id, trade]));

          for (const [tradeId, nextTrade] of nextTradeMap) {
            const previousTrade = previousTradeMap.get(tradeId);
            if (!previousTrade || JSON.stringify(previousTrade) !== JSON.stringify(nextTrade)) {
              await upsertTradeDoc(nextTrade, user.uid, context);
            }
          }

          for (const tradeId of previousTradeMap.keys()) {
            if (!nextTradeMap.has(tradeId)) {
              await deleteTradeDoc(tradeId, user.uid, context);
            }
          }
        }

        for (const strategyId of previousMap.keys()) {
          if (!nextMap.has(strategyId)) {
            await deleteStrategyDoc(strategyId, user.uid, context);
          }
        }

        clearSyncFailure(context);
        logSync('Per-document strategy sync completed successfully', { context, userId: user.uid });
        return true;
      } catch (error) {
        reportSyncFailure(strategiesToSync, error, context);
        return false;
      }
    },
    [clearSyncFailure, reportSyncFailure]
  );

  const handleRetrySync = useCallback(async () => {
    if (!pendingSync || !auth.currentUser) {
      logSyncWarn('Manual retry aborted', {
        hasPendingSync: Boolean(pendingSync),
        isAuthenticated: Boolean(auth.currentUser),
      });
      return;
    }

    logSync('User initiated manual sync retry', {
      userId: auth.currentUser.uid,
      ...getSyncStats(pendingSync),
    });
    setIsRetrying(true);
    const result = await syncStrategiesToCloud(pendingSync, 'manual-retry');
    setIsRetrying(false);

    if (result) {
      clearSyncFailure('manual-retry');
      setSyncSuccess(true);
      logSync('Manual retry succeeded — hiding failure snackbar');
      window.setTimeout(() => setSyncSuccess(false), 3000);
    } else {
      reportSyncFailure(pendingSync, result.error, 'manual-retry');
    }
  }, [pendingSync, clearSyncFailure, reportSyncFailure]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      logSync('Auth state changed — starting session data load');
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        logSync('User session active', { userId: user.uid });
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const local = getLocalStrategies();
        logSync('Loaded local strategies from localStorage', getSyncStats(local));

        if (userDoc.exists()) {
          const data = userDoc.data();
          const remote: Strategy[] = data.strategies ?? [];
          logSync('Loaded remote strategies from Firestore', getSyncStats(remote));
          const merged = mergeStrategies(local, remote);
          logSync('Merged local and remote strategies', {
            ...getSyncStats(merged),
            localOnlyStrategies: local.filter(s => !remote.some(r => r.id === s.id)).length,
            remoteOnlyStrategies: remote.filter(r => !local.some(s => s.id === r.id)).length,
          });
          setStrategies(merged);
          if (data.firstName) setFirstName(data.firstName);
          if (data.lastName) setLastName(data.lastName);

          const syncResult = await syncStrategiesToCloud(merged, 'session-restore');
          if (!syncResult) {
            reportSyncFailure(merged, undefined, 'session-restore');
          } else {
            clearSyncFailure('session-restore');
            logSync('Session restore complete — local and cloud are in sync');
          }
        } else {
          logSync('New Firestore user — uploading local strategies', getSyncStats(local));
          const cleanedStrategies = removeUndefinedValues(local) as Strategy[];
          setStrategies(local);
          const syncResult = await syncStrategiesToCloud(cleanedStrategies, 'new-user');
          if (!syncResult) {
            reportSyncFailure(local, undefined, 'new-user');
          } else {
            logSync('Writing default profile fields for new user');
            await setDoc(userDocRef, { firstName: '', lastName: '' }, { merge: true });
            clearSyncFailure('new-user');
            logSync('New user initial sync complete');
          }
        }

        const localNotes = getLocalNotes();
        logSync('Loaded local notes from localStorage', { noteCount: localNotes.length });
        const remoteNotes: Note[] = userDoc.exists() ? (userDoc.data().notes ?? []) : [];
        logSync('Loaded remote notes from Firestore', { noteCount: remoteNotes.length });
        const mergedNotes = mergeNotes(localNotes, remoteNotes);
        logSync('Merged local and remote notes', {
          noteCount: mergedNotes.length,
          localOnlyNotes: localNotes.filter(n => !remoteNotes.some(r => r.id === n.id)).length,
          remoteOnlyNotes: remoteNotes.filter(r => !localNotes.some(l => l.id === r.id)).length,
        });
        setNotes(mergedNotes);
        await syncNotesToCloud(mergedNotes, 'session-restore');
      } else {
        logSync('User signed out — loading strategies and notes from localStorage only');
        setCurrentUser(null);
        setStrategies(getLocalStrategies());
        setNotes(getLocalNotes());
        setFirstName('');
        setLastName('');
        clearSyncFailure('logout');
      }
      setLoading(false);
      logSync('Auth session load finished — app ready');
    });
    return () => unsubscribe();
  }, [clearSyncFailure, reportSyncFailure]);

  useEffect(() => {
    if (loading || !pendingFirestoreDuringLoadRef.current) return;

    const queued = pendingFirestoreDuringLoadRef.current;
    pendingFirestoreDuringLoadRef.current = null;
    logSync('Flushing Firestore sync queued during auth loading', getSyncStats(queued));
    void syncStrategiesToCloud(queued, 'queued-during-auth');
  }, [loading, syncStrategiesToCloud]);

  useEffect(() => {
    if (loading || !pendingFirestoreDuringLoadNotesRef.current) return;

    const queued = pendingFirestoreDuringLoadNotesRef.current;
    pendingFirestoreDuringLoadNotesRef.current = null;
    logSync('Flushing notes Firestore sync queued during auth loading', { noteCount: queued?.length });
    void syncNotesToCloud(queued, 'queued-during-auth');
  }, [loading]);

  // Initialize view from URL after strategies are loaded (only once)
  useEffect(() => {
    // Only initialize once when loading is complete
    if (loading || hasInitializedFromUrl.current) return;
    
    const pathname = window.location.pathname;
    const urlView = getViewFromPath(pathname, strategies);
    
    // Set initial view from URL
    setActiveView(urlView);
    setPreviousView('dashboard');
    hasInitializedFromUrl.current = true;
    
    // Update URL to match view (replace state to avoid adding to history)
    const path = getPathFromView(urlView, strategies);
    if (pathname !== path) {
      window.history.replaceState({ view: urlView }, '', path);
    }
  }, [loading, strategies]); // Run when loading completes and strategies are available

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const pathname = window.location.pathname;
      const view = getViewFromPath(pathname, strategies);
      const expectedPath = getPathFromView(view, strategies);
      
      // If route is not found, redirect to dashboard
      if (view === 'dashboard' && pathname !== expectedPath) {
        window.history.replaceState({ view: 'dashboard' }, '', expectedPath);
      }
      
      // Use functional update to capture current activeView as previousView
      setActiveView(currentView => {
        setPreviousView(currentView);
        return view;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [strategies]); // Only depend on strategies, not activeView

  // Ensure URL matches view (redirect unknown routes to dashboard)
  useEffect(() => {
    if (!hasInitializedFromUrl.current || loading) return;
    
    const pathname = window.location.pathname;
    const expectedView = getViewFromPath(pathname, strategies);
    const expectedPath = getPathFromView(expectedView, strategies);
    
    // If the URL path doesn't match what it should be (unknown route detected), redirect
    if (pathname !== expectedPath) {
      window.history.replaceState({ view: expectedView }, '', expectedPath);
      if (activeView !== expectedView) {
        setPreviousView(activeView);
        setActiveView(expectedView);
      }
    }
  }, [strategies, loading]); // Only check when strategies or loading state changes, not on every activeView change

  // Update URL when strategies change (in case current strategy/trade was deleted)
  useEffect(() => {
    // Check if current view is still valid
    if (activeView === 'dashboard' || activeView === 'profile' || activeView === 'tools' || activeView === 'notes' || activeView.startsWith('tools/')) {
      return; // These are always valid
    }

    if (activeView.startsWith('trade/')) {
      const tradeId = activeView.split('/')[1];
      const tradeExists = strategies.some(s => s.trades.some(t => t.id === tradeId));
      if (!tradeExists) {
        // Trade was deleted, redirect to dashboard
        const path = getPathFromView('dashboard', strategies);
        window.history.replaceState({ view: 'dashboard' }, '', path);
        setActiveView('dashboard');
        setPreviousView('dashboard');
      }
    } else {
      // It's a strategy view
      const strategyExists = strategies.some(s => s.id === activeView);
      if (!strategyExists) {
        // Strategy was deleted, redirect to dashboard
        const path = getPathFromView('dashboard', strategies);
        window.history.replaceState({ view: 'dashboard' }, '', path);
        setActiveView('dashboard');
        setPreviousView('dashboard');
      }
    }
  }, [strategies, activeView]);


  // Validate URL when window gets focus (catches edge cases where URL might be invalid)
  useEffect(() => {
    if (!hasInitializedFromUrl.current || loading) return;

    const handleFocus = () => {
      const pathname = window.location.pathname;
      const expectedView = getViewFromPath(pathname, strategies);
      const expectedPath = getPathFromView(expectedView, strategies);
      
      // If URL doesn't match expected path (unknown route), redirect to dashboard
      if (pathname !== expectedPath) {
        window.history.replaceState({ view: expectedView }, '', expectedPath);
        setActiveView(currentView => {
          if (currentView !== expectedView) {
            setPreviousView(currentView);
          }
          return expectedView;
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [strategies, loading]);

  const saveStrategies = async (newStrategies: Strategy[]) => {
    logSync('Saving strategies — updating localStorage', getSyncStats(newStrategies));
    setStrategies(newStrategies);

    if (loadingRef.current) {
      pendingFirestoreDuringLoadRef.current = newStrategies;
      logSyncWarn('Auth still loading — Firestore sync queued', getSyncStats(newStrategies));
      return;
    }

    await syncStrategiesToCloud(newStrategies, 'user-change');
  };

  const syncNotesToCloud = useCallback(
    async (notesToSync: Note[], context = 'save'): Promise<boolean> => {
      const user = auth.currentUser;
      if (!user) {
        logSyncWarn('Skipping notes Firestore sync — user not authenticated (localStorage only)', {
          context,
          noteCount: notesToSync.length,
        });
        return false;
      }

      logSync('Starting notes cloud sync', { context, userId: user.uid, noteCount: notesToSync.length });
      const previousNotes: Note[] = notesRef.current;
      const previousMap = new Map<string, Note>(previousNotes.map(note => [note.id, note]));
      const nextMap = new Map<string, Note>(notesToSync.map(note => [note.id, note]));

      try {
        for (const [noteId, nextNote] of nextMap) {
          const previousNote = previousMap.get(noteId);
          if (!previousNote || JSON.stringify(previousNote) !== JSON.stringify(nextNote)) {
            await upsertNoteDoc(nextNote, user.uid, context);
          }
        }

        for (const noteId of previousMap.keys()) {
          if (!nextMap.has(noteId)) {
            await deleteNoteDoc(noteId, user.uid, context);
          }
        }

        logSync('Per-document notes sync completed successfully', { context, userId: user.uid });
        return true;
      } catch (error) {
        logSyncError('Notes cloud sync failed', error, { context, userId: user.uid, noteCount: notesToSync.length });
        return false;
      }
    },
    []
  );

  const saveNotes = async (newNotes: Note[]) => {
    logSync('Saving notes — updating localStorage', { noteCount: newNotes.length });
    setNotes(newNotes);

    if (loadingRef.current) {
      pendingFirestoreDuringLoadNotesRef.current = newNotes;
      logSyncWarn('Auth still loading — notes Firestore sync queued', { noteCount: newNotes.length });
      return;
    }

    await syncNotesToCloud(newNotes, 'user-change');
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNotes([...notes, newNote]);
    return newNote.id;
  };

  const handleSaveNote = async (noteToSave: Note) => {
    const updatedNote = { ...noteToSave, updatedAt: new Date().toISOString() };
    const newNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n);

    setNotes(newNotes);

    if (auth.currentUser) {
      await upsertNoteDoc(updatedNote, auth.currentUser.uid, 'note-update');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const newNotes = notes.filter(n => n.id !== noteId);

    setNotes(newNotes);

    if (auth.currentUser) {
      await deleteNoteDoc(noteId, auth.currentUser.uid, 'note-delete');
    }
  };

  const handleUpdateProfile = async (newFirstName: string, newLastName: string) => {
    if (!auth.currentUser) return;
    setFirstName(newFirstName);
    setLastName(newLastName);
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userDocRef, { firstName: newFirstName, lastName: newLastName }, { merge: true });
  }

  const handleOpenTradeForm = (trade: Trade | null) => {
    setEditingTrade(trade);
    setIsTradeFormOpen(true);
  };
  
  const handleCloseTradeForm = () => {
    setEditingTrade(null);
    setIsTradeFormOpen(false);
  };

  const allTrades = useMemo(() => strategies.flatMap(s => s.trades), [strategies]);
  
  const handleAddStrategy = () => {
    if (newStrategyName.trim() && parseFloat(newStrategyCapital) > 0) {
      const newStrategy: Strategy = {
        id: `strategy-${Date.now()}`,
        name: newStrategyName,
        initialCapital: parseFloat(newStrategyCapital),
        trades: [],
      };
      saveStrategies([...strategies, newStrategy]);
      setNewStrategyName('');
      setNewStrategyCapital('');
      setIsNewStrategyModalOpen(false);
      navigateTo(newStrategy.id);
    }
  };
  
  const handleSaveTrade = async (tradeToSave: Trade) => {
    const updatedTrade = { ...tradeToSave, updatedAt: new Date().toISOString() };
    const newStrategies = strategies.map(strategy => {
        if (strategy.id === updatedTrade.strategyId) {
            const tradeIndex = strategy.trades.findIndex(t => t.id === updatedTrade.id);
            const newTrades = [...strategy.trades];
            if (tradeIndex > -1) {
                newTrades[tradeIndex] = updatedTrade;
            } else {
                newTrades.push(updatedTrade);
            }
            return { ...strategy, trades: newTrades };
        }
        return strategy;
    });

    setStrategies(newStrategies);

    if (auth.currentUser) {
      await upsertTradeDoc(updatedTrade, auth.currentUser.uid, 'trade-update');
    }

    handleCloseTradeForm();
  };

  const handleDeleteTrade = async (tradeId: string, strategyId: string) => {
    const newStrategies = strategies.map(strategy => {
      if (strategy.id === strategyId) {
        return { ...strategy, trades: strategy.trades.filter(t => t.id !== tradeId) };
      }
      return strategy;
    });

    setStrategies(newStrategies);

    if (auth.currentUser) {
      await deleteTradeDoc(tradeId, auth.currentUser.uid, 'trade-delete');
    }
  }

  const handleMoveTrade = async (trade: Trade, targetStrategyId: string) => {
    // Find the trade in the current strategy
    const currentStrategy = strategies.find(s => s.id === trade.strategyId);
    if (!currentStrategy) return;

    // Remove trade from current strategy and add to target strategy
    const newStrategies = strategies.map(strategy => {
      if (strategy.id === trade.strategyId) {
        // Remove from current strategy
        return { ...strategy, trades: strategy.trades.filter(t => t.id !== trade.id) };
      } else if (strategy.id === targetStrategyId) {
        // Add to target strategy with updated strategyId
        const updatedTrade = { ...trade, strategyId: targetStrategyId, updatedAt: new Date().toISOString() };
        return { ...strategy, trades: [...strategy.trades, updatedTrade] };
      }
      return strategy;
    });

    setStrategies(newStrategies);

    if (auth.currentUser) {
      await upsertTradeDoc({ ...trade, strategyId: targetStrategyId, updatedAt: new Date().toISOString() }, auth.currentUser.uid, 'trade-move');
    }
  };

  const handleCopyTrade = async (trade: Trade, targetStrategyId: string) => {
    // Create a new trade with a new ID
    const newTradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTrade: Trade = {
      ...trade,
      id: newTradeId,
      strategyId: targetStrategyId,
    };

    // Add the new trade to the target strategy
    const newStrategies = strategies.map(strategy => {
      if (strategy.id === targetStrategyId) {
        return { ...strategy, trades: [...strategy.trades, newTrade] };
      }
      return strategy;
    });

    setStrategies(newStrategies);

    if (auth.currentUser) {
      await upsertTradeDoc(newTrade, auth.currentUser.uid, 'trade-copy');
    }
  };

  const handleUpdateStrategy = (strategyId: string, name: string, initialCapital: number) => {
    const newStrategies = strategies.map(s => 
      s.id === strategyId ? { ...s, name, initialCapital } : s
    );
    saveStrategies(newStrategies);
  };

  const handleDeleteStrategy = (strategyId: string) => {
    saveStrategies(strategies.filter(s => s.id !== strategyId));
    navigateTo('dashboard');
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigateTo('dashboard');
  }

  const renderContent = () => {
    if (activeView === 'profile') {
        return <ProfilePage 
                    user={currentUser} 
                    firstName={firstName}
                    lastName={lastName}
                    onUpdateProfile={handleUpdateProfile}
                    onLogout={handleLogout}
                />;
    }

    if (activeView === 'tools') {
        return <ToolsPage navigateTo={navigateTo} />;
    }

    if (activeView === 'tools/quantity-calculator') {
        return <QuantityCalculator />;
    }

    if (activeView === 'notes') {
        return <NotesPage
                    notes={notes}
                    onSaveNote={handleSaveNote}
                    onDeleteNote={handleDeleteNote}
                    onCreateNote={handleCreateNote}
                />;
    }

    const isTradeView = activeView.startsWith('trade/');
    if (isTradeView) {
        const tradeId = activeView.split('/')[1];
        let trade: Trade | undefined;
        let strategy: Strategy | undefined;
        for (const s of strategies) {
            const foundTrade = s.trades.find(t => t.id === tradeId);
            if (foundTrade) {
                trade = foundTrade;
                strategy = s;
                break;
            }
        }

        if (trade && strategy) {
            let backButtonText = "Back";
            if (previousView === 'dashboard') {
                backButtonText = "Back to Dashboard";
            } else {
                const prevStrategy = strategies.find(s => s.id === previousView);
                if (prevStrategy) {
                    backButtonText = `Back to ${prevStrategy.name}`;
                }
            }

            return <TradeDetailPage 
                        trade={trade} 
                        strategy={strategy} 
                        onSaveTrade={handleSaveTrade}
                        onBack={() => setActiveView(previousView)}
                        onOpenTradeForm={handleOpenTradeForm}
                        onMoveTrade={handleMoveTrade}
                        onCopyTrade={handleCopyTrade}
                        strategies={strategies}
                        backButtonText={backButtonText}
                    />;
        }
    }
    
    if (activeView === 'dashboard') {
        return <Dashboard 
                    allTrades={allTrades} 
                    strategies={strategies} 
                    navigateTo={navigateTo}
                    onOpenTradeForm={handleOpenTradeForm}
                    onDeleteTrade={handleDeleteTrade}
                    onMoveTrade={handleMoveTrade}
                    onCopyTrade={handleCopyTrade}
                />;
    }

    const activeStrategy = strategies.find(s => s.id === activeView);
    if (activeStrategy) {
        return <StrategyView 
                    strategy={activeStrategy} 
                    onDeleteTrade={handleDeleteTrade}
                    onUpdateStrategy={handleUpdateStrategy}
                    onDeleteStrategy={handleDeleteStrategy}
                    navigateTo={navigateTo}
                    onOpenTradeForm={handleOpenTradeForm}
                    onMoveTrade={handleMoveTrade}
                    onCopyTrade={handleCopyTrade}
                    strategies={strategies}
                />;
    }

    return <Dashboard allTrades={allTrades} strategies={strategies} navigateTo={navigateTo} onOpenTradeForm={handleOpenTradeForm} onDeleteTrade={handleDeleteTrade} onMoveTrade={handleMoveTrade} onCopyTrade={handleCopyTrade} />;
  }


  if (loading) {
    return (
        <div className="flex h-screen w-full justify-center items-center text-white" style={{ backgroundColor: '#121212' }}>
            <p className="text-2xl">Loading Journal...</p>
        </div>
    );
  }

  const strategyIdForForm = editingTrade?.strategyId || (activeView !== 'dashboard' && !activeView.startsWith('trade/') && activeView !== 'profile' ? activeView : undefined);

  return (
    <div className="flex flex-col md:flex-row h-screen text-white font-sans" style={{ backgroundColor: '#121212' }}>
      <Sidebar
        strategies={strategies}
        activeView={activeView}
        navigateTo={navigateTo}
        onNewStrategy={() => setIsNewStrategyModalOpen(true)}
        currentUser={currentUser}
        onLogin={() => setIsAuthModalOpen(true)}
        onProfile={() => navigateTo('profile')}
        onSettings={() => setIsSettingsModalOpen(true)}
      />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
        {renderContent()}
      </main>
      <BottomNav
        strategies={strategies}
        activeView={activeView}
        navigateTo={navigateTo}
        onNewStrategy={() => setIsNewStrategyModalOpen(true)}
        currentUser={currentUser}
        onLogin={() => setIsAuthModalOpen(true)}
        onProfile={() => navigateTo('profile')}
        onSettings={() => setIsSettingsModalOpen(true)}
      />

      <Modal isOpen={isNewStrategyModalOpen} onClose={() => setIsNewStrategyModalOpen(false)}>
        <div className="p-2">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-6">Create New Strategy</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Strategy Name</label>
              <input
                type="text"
                placeholder="Strategy Name"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                          focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                          transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Initial Capital</label>
              <input
                type="number"
                placeholder="Initial Capital"
                value={newStrategyCapital}
                onChange={(e) => setNewStrategyCapital(e.target.value)}
                onWheel={(e) => (e.target as HTMLElement).blur()}
                className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                          focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                          transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={handleAddStrategy}
                className="flex items-center gap-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                        shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusIcon />
              Create Strategy
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)}>
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      </Modal>

       <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)}>
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      </Modal>

      {strategyIdForForm && (
        <Modal isOpen={isTradeFormOpen} onClose={handleCloseTradeForm} size="4xl">
          <TradeForm
            strategyId={strategyIdForForm}
            existingTrade={editingTrade}
            onSave={handleSaveTrade}
            onCancel={handleCloseTradeForm}
          />
        </Modal>
      )}

      <Footer />

      <SyncSnackbar
        visible={syncFailed}
        message={syncErrorMessage}
        isRetrying={isRetrying}
        showSuccess={syncSuccess}
        onRetry={handleRetrySync}
      />
    </div>
  );
};

const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);


export default App;