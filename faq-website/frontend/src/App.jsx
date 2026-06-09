import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import FAQListPage from './pages/FAQListPage';
import FAQDetailPage from './pages/FAQDetailPage';
import CategoriesPage from './pages/CategoriesPage';

import RaiseTicket from './pages/RaiseTicket';
import GoldenTicket from './pages/GoldenTicket';
import ContributeFAQ from './pages/ContributeFAQ';
import WalletPage from './pages/Wallet';
import TicketStatusPage from './pages/TicketStatusPage';
import AdminIntelligencePage from './pages/AdminIntelligencePage';
import VoiceAssistant from './components/VoiceAssistant';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (!['admin', 'mentor'].includes(userRole)) return <Navigate to="/dashboard" />;
  return children;
}

// Global 401 → session-expired handler
function SessionManager() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      if (location.pathname !== '/login') {
        toast.error('Session expired. Please log in again.', { id: 'auth-toast' });
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, [navigate, location.pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <VoiceAssistant />
      <SessionManager />
      <Routes>
        {/* ── PUBLIC ROUTES ── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/faqs" element={<FAQListPage />} />
        <Route path="/faq/:id" element={<FAQDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />

        {/* ── AUTH ROUTES ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── PROTECTED ROUTES (require authentication) ── */}
        <Route path="/discussions" element={<Navigate to="/dashboard?tab=discussions" replace />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/raise-ticket" element={<ProtectedRoute><RaiseTicket /></ProtectedRoute>} />
        <Route path="/contribute-faq" element={<ProtectedRoute><ContributeFAQ /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/track-status/:ticketId" element={<ProtectedRoute><TicketStatusPage /></ProtectedRoute>} />
        <Route path="/golden-ticket" element={<ProtectedRoute><GoldenTicket /></ProtectedRoute>} />

        {/* ── ADMIN ROUTES ── */}
        <Route path="/admin/intelligence" element={<AdminRoute><AdminIntelligencePage /></AdminRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </Router>
  );
}

export default App;