import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogOut, CheckCircle, Sparkles, Inbox, Menu, X, Settings, Ticket, BarChart2, Users, Database, Activity, Mic, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import FAQPromotionModal from '../components/FAQPromotionModal';
import DeduplicationSection from '../components/DeduplicationSection';

// Import Tabs
import ReviewQueueTab from './admin/ReviewQueueTab';
import PersonalTicketsTab from './admin/PersonalTicketsTab';
import GoldenTicketsTab from './admin/GoldenTicketsTab';
import FAQContributionsTab from './admin/FAQContributionsTab';
import AdminSettingsTab from './AdminSettingsTab';
import UserManagementTab from '../components/UserManagementTab';
import AdminAnalyticsTab from './admin/AdminAnalyticsTab';
import AdminFaqTab from './admin/AdminFaqTab';
import AdminCategoryTab from './admin/AdminCategoryTab';
import AdminVoiceTab from './admin/AdminVoiceTab';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('analytics');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [promotionModal, setPromotionModal] = useState({ isOpen: false, source: null, sourceItem: null });
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to force refresh in child tabs
  
  const authFailedRef = useRef(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const openPromotionModal = (source, sourceItem) => {
    setPromotionModal({ isOpen: true, source, sourceItem });
  };

  const handlePromoted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'analytics':
        return <AdminAnalyticsTab key={refreshTrigger} />;
      case 'users':
        return <UserManagementTab key={refreshTrigger} />;
      case 'faqs':
        return <AdminFaqTab key={refreshTrigger} />;
      case 'categories':
        return <AdminCategoryTab key={refreshTrigger} />;
      case 'voice':
        return <AdminVoiceTab key={refreshTrigger} />;
      case 'queue':
        return <ReviewQueueTab openPromotionModal={openPromotionModal} key={refreshTrigger} />;
      case 'deduplication':
        return <DeduplicationSection key={refreshTrigger} />;
      case 'golden':
        return <GoldenTicketsTab openPromotionModal={openPromotionModal} key={refreshTrigger} />;
      case 'personal':
        return <PersonalTicketsTab key={refreshTrigger} />;
      case 'contributions':
        return <FAQContributionsTab openPromotionModal={openPromotionModal} key={refreshTrigger} />;
      case 'settings':
        return <AdminSettingsTab key={refreshTrigger} />;
      default:
        return <AdminAnalyticsTab key={refreshTrigger} />;
    }
  };

  const NavButton = ({ id, icon: Icon, label, close }) => (
    <button 
      onClick={() => { setActiveSection(id); close(); }} 
      className={`sidebar-button sidebar-button-normal w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors ${
        activeSection === id 
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
      }`}
    >
      <Icon size={16} /> 
      {label}
    </button>
  );

  const adminNav = (close = () => {}) => (
    <nav className="space-y-1">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-4">Core</div>
      <NavButton id="analytics" icon={LayoutDashboard} label="Dashboard" close={close} />
      <NavButton id="users" icon={Users} label="User Management" close={close} />
      <NavButton id="faqs" icon={Database} label="FAQ Management" close={close} />
      <NavButton id="categories" icon={Activity} label="Categories" close={close} />
      <NavButton id="voice" icon={Mic} label="Voice Assistant" close={close} />
      
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Review & Escalations</div>
      <NavButton id="queue" icon={Inbox} label="Review Queue" close={close} />
      <NavButton id="deduplication" icon={Activity} label="Deduplication" close={close} />
      <NavButton id="golden" icon={Sparkles} label="Golden Tickets" close={close} />
      <NavButton id="personal" icon={Ticket} label="Personal Tickets" close={close} />
      <NavButton id="contributions" icon={CheckCircle} label="Contributions" close={close} />
      
      <div className="pt-4 mt-6 border-t border-white/5 space-y-1">
        <NavButton id="settings" icon={Settings} label="Settings" close={close} />
        <button onClick={() => { navigate('/dashboard'); close(); }} className="sidebar-button sidebar-button-normal w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors">
          <BarChart2 size={16} /> 
          User View
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-mesh font-inter text-slate-300 overflow-hidden">
      {/* ── Sidebar ── */}
      {sidebarVisible && (
        <aside className="w-[260px] h-screen flex flex-col glass-strong border-r border-white/5 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-5 py-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-purple-300 text-xs font-black font-bricolage">A</span>
              </div>
              <span className="font-bold font-bricolage text-lg text-slate-100">Admin</span>
            </div>
            <button onClick={() => setSidebarVisible(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {adminNav()}
          </div>
          <div className="px-4 py-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-semibold transition-colors font-bricolage cursor-pointer">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 glass-strong px-8 py-5 border-b border-white/5 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            {!sidebarVisible && (
              <button onClick={() => setSidebarVisible(true)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-xl font-bold font-bricolage tracking-tight text-slate-100 capitalize">
              {activeSection.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 md:p-12 max-w-6xl mx-auto w-full relative z-10">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveSection()}
          </motion.div>
        </main>
      </div>

      <FAQPromotionModal
        isOpen={promotionModal.isOpen}
        onClose={() => setPromotionModal({ isOpen: false, source: null, sourceItem: null })}
        source={promotionModal.source}
        sourceItem={promotionModal.sourceItem}
        onPromoted={handlePromoted}
      />
    </div>
  );
}