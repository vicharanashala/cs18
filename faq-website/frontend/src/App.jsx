import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';

import RaiseTicket from './pages/RaiseTicket';
import GoldenTicket from './pages/GoldenTicket';
import ContributeFAQ from './pages/ContributeFAQ';
import WalletPage from './pages/Wallet';
import TicketStatusPage from './pages/TicketStatusPage';
import AdminIntelligencePage from './pages/AdminIntelligencePage';

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/login" />;

  return children;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/faq" element={<Navigate to="/dashboard?tab=faq" replace />} />
        <Route
          path="/discussions"
          element={
            // Guests cannot access OAQ / cluster / discussion routes
            <ProtectedRoute role="student">
              <Navigate to="/dashboard?tab=discussions" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute role="student">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/raise-ticket"
          element={
            <ProtectedRoute role="student">
              <RaiseTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contribute-faq"
          element={
            <ProtectedRoute role="student">
              <ContributeFAQ />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute role="student">
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-status/:ticketId"
          element={
            <ProtectedRoute role="student">
              <TicketStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/golden-ticket"
          element={
            <ProtectedRoute role="student">
              <GoldenTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/intelligence"
          element={
            <ProtectedRoute role="admin">
              <AdminIntelligencePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;