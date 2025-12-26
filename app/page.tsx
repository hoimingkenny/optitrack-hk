'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Trade, TradeFilters, NewTradeInput, CloseTradeInput } from '@/utils/types/trades';
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut, 
  getTrades, 
  createTrade, 
  closeTrade,
  deleteTrade,
  getOpenTrades,
  batchUpdateTradeStatuses
} from '@/utils/supabase';
import { checkAndUpdateExpiredTrades } from '@/utils/helpers/status-calculator';
import AuthForm from '@/components/auth/AuthForm';
import DashboardNav from '@/components/layout/DashboardNav';
import TradeForm from '@/components/trades/TradeForm';
import TradeCard from '@/components/trades/TradeCard';
import TradeFiltersComponent, { applyTradeFilters } from '@/components/trades/TradeFilters';
import CloseTradeModal from '@/components/trades/CloseTradeModal';
import PNLSummary from '@/components/trades/PNLSummary';
import Button from '@/components/ui/Button';
import { ToastContainer, toast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Trade state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>({});
  const [tradesLoading, setTradesLoading] = useState(false);
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Modal state
  const [closeModalTrade, setCloseModalTrade] = useState<Trade | null>(null);
  const [closeModalLoading, setCloseModalLoading] = useState(false);
  const [deleteModalTrade, setDeleteModalTrade] = useState<Trade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load trades when user is authenticated
  const loadTrades = useCallback(async () => {
    if (!user) return;
    
    setTradesLoading(true);
    try {
      const data = await getTrades(user.id);
      setTrades(data);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setTradesLoading(false);
    }
  }, [user]);

  // Check for expired trades on load
  const checkExpiredTrades = useCallback(async () => {
    if (!user) return;
    
    try {
      const openTrades = await getOpenTrades(user.id);
      const updates = checkAndUpdateExpiredTrades(openTrades);
      
      if (updates.length > 0) {
        await batchUpdateTradeStatuses(
          user.id, 
          updates.map(u => ({ id: u.trade.id, status: u.newStatus }))
        );
        toast.info(`${updates.length} trade(s) status updated`);
        await loadTrades();
      }
    } catch (error) {
      console.error('Error checking expired trades:', error);
    }
  }, [user, loadTrades]);

  useEffect(() => {
    if (user) {
      loadTrades();
      checkExpiredTrades();
    }
  }, [user, loadTrades, checkExpiredTrades]);

  // Auth handlers
  const handleAuth = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      if (authMode === 'login') {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else {
        await signUp(email, password);
        toast.success('Account created! Please check your email to verify.');
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setTrades([]);
      toast.info('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  // Trade handlers
  const handleCreateTrade = async (data: NewTradeInput) => {
    if (!user) return;
    
    setFormLoading(true);
    try {
      await createTrade(user.id, data);
      toast.success('Trade opened successfully!');
      setShowNewTradeForm(false);
      await loadTrades();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create trade');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseTrade = async (data: CloseTradeInput) => {
    if (!user || !closeModalTrade) return;
    
    setCloseModalLoading(true);
    try {
      await closeTrade(closeModalTrade.id, user.id, data);
      toast.success('Position closed successfully!');
      setCloseModalTrade(null);
      await loadTrades();
    } catch (error: any) {
      toast.error(error.message || 'Failed to close trade');
    } finally {
      setCloseModalLoading(false);
    }
  };

  const handleDeleteTrade = async () => {
    if (!user || !deleteModalTrade) return;
    
    setDeleteLoading(true);
    try {
      await deleteTrade(deleteModalTrade.id, user.id);
      toast.success('Trade deleted');
      setDeleteModalTrade(null);
      await loadTrades();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete trade');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get unique stock symbols for filter
  const stockSymbols = [...new Set(trades.map(t => t.stock_symbol))].sort();
  const filteredTrades = applyTradeFilters(trades, filters);

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ToastContainer />
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">📈 OptiTrack HK</h1>
            <p className="text-gray-400">Hong Kong Stock Options Tracker</p>
          </div>
          <AuthForm
            mode={authMode}
            onSubmit={handleAuth}
            onToggleMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
            isLoading={authLoading}
            error={authError}
          />
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen">
      <ToastContainer />
      <DashboardNav onSignOut={handleSignOut} userEmail={user.email} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
            <p className="text-gray-400 text-sm">
              {new Date().toLocaleDateString('en-HK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button onClick={() => setShowNewTradeForm(true)}>
            + New Trade
          </Button>
        </div>

        {/* New Trade Form */}
        {showNewTradeForm && (
          <div className="mb-6">
            <TradeForm
              onSubmit={handleCreateTrade}
              onCancel={() => setShowNewTradeForm(false)}
              isLoading={formLoading}
            />
          </div>
        )}

        {/* PNL Summary */}
        {trades.length > 0 && (
          <div className="mb-6">
            <PNLSummary trades={trades} />
          </div>
        )}

        {/* Filters */}
        {trades.length > 0 && (
          <div className="mb-6">
            <TradeFiltersComponent
              filters={filters}
              onFilterChange={setFilters}
              stockSymbols={stockSymbols}
            />
          </div>
        )}

        {/* Trade List */}
        {tradesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-400 mb-4">
              {trades.length === 0 
                ? "No trades yet. Create your first trade to get started!" 
                : "No trades match your filters."}
            </p>
            {trades.length === 0 && (
              <Button onClick={() => setShowNewTradeForm(true)}>
                Create First Trade
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTrades.map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onClose={(t) => setCloseModalTrade(t)}
                onDelete={(t) => setDeleteModalTrade(t)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Close Trade Modal */}
      {closeModalTrade && (
        <CloseTradeModal
          trade={closeModalTrade}
          isOpen={!!closeModalTrade}
          onClose={() => setCloseModalTrade(null)}
          onSubmit={handleCloseTrade}
          isLoading={closeModalLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalTrade}
        onClose={() => setDeleteModalTrade(null)}
        onConfirm={handleDeleteTrade}
        title="Delete Trade"
        message={`Are you sure you want to delete the ${deleteModalTrade?.stock_symbol} trade? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
