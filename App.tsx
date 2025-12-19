import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Strategy, Trade } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import StrategyView from './components/StrategyView';
import TradeDetailPage from './components/TradeDetailPage';
import ProfilePage from './components/ProfilePage';
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { PlusIcon } from './components/icons/PlusIcon';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import TradeForm from './components/TradeForm';
import { SettingsProvider } from './contexts/SettingsContext';

// Helper function to remove undefined values from objects/arrays for Firestore compatibility
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefinedValues(obj[key]);
      }
    }
    return cleaned;
  }
  
  return obj;
};

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
  const [strategies, setStrategies] = useLocalStorage<Strategy[]>('trading-journal-strategies', initialStrategies);
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

  const navigateTo = (view: string) => {
    setPreviousView(activeView);
    setActiveView(view);
    // Update URL without page reload
    const path = getPathFromView(view, strategies);
    window.history.pushState({ view }, '', path);
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if(data.strategies) setStrategies(data.strategies);
          if(data.firstName) setFirstName(data.firstName);
          if(data.lastName) setLastName(data.lastName);

        } else {
          // New user, sync local data to firestore
          // Remove undefined values before saving to Firestore
          const cleanedStrategies = removeUndefinedValues(strategies);
          await setDoc(userDocRef, { strategies: cleanedStrategies, firstName: '', lastName: '' });
        }
      } else {
        setCurrentUser(null);
        const localData = window.localStorage.getItem('trading-journal-strategies');
        setStrategies(localData ? JSON.parse(localData) : initialStrategies);
        setFirstName('');
        setLastName('');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    if (activeView === 'dashboard' || activeView === 'profile') {
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
    // Always update localStorage first
    setStrategies(newStrategies);
    
    // Check if user is authenticated before attempting Firestore save
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('User not authenticated, saving to localStorage only');
      return;
    }

    try {
      console.log('Attempting to save strategies to Firestore for user:', currentUser.uid);
      // Remove undefined values before saving to Firestore (Firestore doesn't accept undefined)
      const cleanedStrategies = removeUndefinedValues(newStrategies);
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { strategies: cleanedStrategies }, { merge: true });
      console.log('Successfully saved strategies to Firestore');
    } catch (error) {
      console.error('Error saving strategies to Firestore:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        strategiesCount: newStrategies.length,
        tradesCount: newStrategies.reduce((sum, s) => sum + s.trades.length, 0)
      });
      // Note: localStorage was already updated, so data is not lost
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
  
  const handleSaveTrade = (tradeToSave: Trade) => {
    const newStrategies = strategies.map(strategy => {
        if (strategy.id === tradeToSave.strategyId) {
            const tradeIndex = strategy.trades.findIndex(t => t.id === tradeToSave.id);
            const newTrades = [...strategy.trades];
            if (tradeIndex > -1) {
                newTrades[tradeIndex] = tradeToSave;
            } else {
                newTrades.push(tradeToSave);
            }
            return { ...strategy, trades: newTrades };
        }
        return strategy;
    });
    saveStrategies(newStrategies);
    handleCloseTradeForm();
  };

  const handleDeleteTrade = (tradeId: string, strategyId: string) => {
    const newStrategies = strategies.map(strategy => {
      if (strategy.id === strategyId) {
        return { ...strategy, trades: strategy.trades.filter(t => t.id !== tradeId) };
      }
      return strategy;
    });
    saveStrategies(newStrategies);
  }

  const handleMoveTrade = (trade: Trade, targetStrategyId: string) => {
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
        const updatedTrade = { ...trade, strategyId: targetStrategyId };
        return { ...strategy, trades: [...strategy.trades, updatedTrade] };
      }
      return strategy;
    });
    saveStrategies(newStrategies);
  };

  const handleCopyTrade = (trade: Trade, targetStrategyId: string) => {
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
    saveStrategies(newStrategies);
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
    </div>
  );
};

const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);


export default App;