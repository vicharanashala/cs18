import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, RefreshCw } from 'lucide-react';
import TrackQueryCard from './TrackQueryCard';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

export default function TrackQuerySection({ refreshTrigger, canConvertToGT, userPizzaSlices, onGTConverted }) {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedTicket, setSearchedTicket] = useState(null);
  const [searchedRedirect, setSearchedRedirect] = useState(null); // { redirectId, redirectType }

  const fetchMyTickets = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/tickets/my');
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [refreshTrigger]);

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    setIsSearching(true);
    setSearchedTicket(null);
    setSearchedRedirect(null);
    try {
      const res = await axiosClient.get(`/tickets/track/${searchInput.toUpperCase()}`);
      setSearchedTicket(res.data.ticket);
      setSearchedRedirect({
        redirectId: res.data.redirectId,
        redirectType: res.data.redirectType,
      });
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Ticket not found. Check the ID and try again.');
      } else {
        toast.error('Failed to track ticket.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveTicket = (ticketNumber) => {
    setTickets(prev => prev.filter(t => t.ticketNumber !== ticketNumber));
    if (searchedTicket?.ticketNumber === ticketNumber) {
      setSearchedTicket(null);
    }
  };

  if (isLoading && tickets.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Premium Separator line */}
      <div className="relative flex items-center justify-center py-6 mb-2">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-8 bg-emerald-500/10 blur-[20px] rounded-full pointer-events-none" />
        <span className="relative z-10 px-4 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 font-bricolage backdrop-blur-sm">
          Track My Query
        </span>
      </div>

      {/* Main Tracking Section */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-emerald-900/30 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent shadow-[0_0_40px_rgba(16,185,129,0.03)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="flex flex-col md:flex-row gap-8 relative z-10">
          
          {/* Track Input */}
          <div className="w-full md:w-1/3 flex flex-col justify-center">
            <h2 className="font-bold font-bricolage text-xl text-slate-800 dark:text-slate-100 mb-2">Track Status</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 leading-relaxed">Enter your 8-character ticket ID to check real-time resolution status.</p>
            
            <form onSubmit={handleTrackSubmit} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              </div>
              <input 
                type="text" 
                maxLength={8}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                placeholder="e.g. VNS6A1P2"
                className="w-full bg-black/20 border border-white/10 rounded-2xl pl-11 pr-24 py-3.5 text-sm font-bricolage tracking-widest text-slate-100 placeholder-slate-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all uppercase shadow-inner"
              />
              <div className="absolute inset-y-1.5 right-1.5">
                <button 
                  type="submit"
                  disabled={isSearching || searchInput.length < 5}
                  className="h-full px-4 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-40 flex items-center justify-center min-w-[70px]"
                >
                  {isSearching ? <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" /> : 'Track'}
                </button>
              </div>
            </form>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />
          <div className="md:hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

          {/* Results / List */}
          <div className="w-full md:w-2/3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-bricolage text-sm text-slate-700 dark:text-slate-300">
                {searchedTicket ? 'Search Result' : 'Recent Tickets'}
              </h3>
              {!searchedTicket && (
                <button onClick={fetchMyTickets} className="text-slate-500 hover:text-emerald-400 transition-colors" title="Refresh list">
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {searchedTicket ? (
                  <TrackQueryCard
                    key={searchedTicket.ticketNumber}
                    ticket={searchedTicket}
                    redirectId={searchedRedirect?.redirectId}
                    redirectType={searchedRedirect?.redirectType}
                    onDeleteSuccess={handleRemoveTicket}
                    canConvertToGT={canConvertToGT}
                    userPizzaSlices={userPizzaSlices}
                    onGTConverted={onGTConverted}
                  />
                ) : tickets.length > 0 ? (
                  tickets.slice(0, 3).map(ticket => (
                    <TrackQueryCard
                      key={ticket.ticketNumber}
                      ticket={ticket}
                      redirectId={ticket.redirectId}
                      redirectType={ticket.redirectType}
                      onDeleteSuccess={handleRemoveTicket}
                      canConvertToGT={canConvertToGT}
                      userPizzaSlices={userPizzaSlices}
                      onGTConverted={onGTConverted}
                    />
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-center bg-white/[0.01]"
                  >
                    <Compass size={24} className="text-slate-500 dark:text-slate-600 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">No active tickets found.</p>
                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Your recent tracking history will appear here.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {searchedTicket && (
              <button 
                onClick={() => { setSearchedTicket(null); setSearchInput(''); }}
                className="mt-4 text-xs text-slate-500 hover:text-emerald-400 font-bold flex items-center gap-1 transition-colors"
              >
                ← Back to recent tickets
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
