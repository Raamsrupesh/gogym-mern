import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Plans from './pages/Plans';
import Enrol from './pages/Enrol';
import Login from './pages/Login';
import MemberDashboard from './pages/MemberDashboard';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import Chatbot from './components/Chatbot';
import { useAuth } from './context/AuthContext';

function Protected({ children, role }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="p-8 text-white">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'owner') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/enrol" element={<Enrol />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><MemberDashboard /></Protected>} />
        <Route path="/admin" element={<Protected role="owner"><OwnerDashboard /></Protected>} />
      </Routes>
      <Chatbot />
      <Footer />
    </>
  );
}