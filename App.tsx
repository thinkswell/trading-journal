import React, { useState, useMemo, useEffect } from 'react';
import { Strategy, Trade } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
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

  const navigateTo = (view: string) => {
    setPreviousView(activeView);
    setActiveView(view);
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
                />;
    }

    return <Dashboard allTrades={allTrades} strategies={strategies} navigateTo={navigateTo} onOpenTradeForm={handleOpenTradeForm} onDeleteTrade={handleDeleteTrade} />;
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

    </div>
  );
};

const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);


export default App;