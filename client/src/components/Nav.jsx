import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="sticky top-0 z-30 border-b border-electricblue bg-card backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Go Gym home" className="shrink-0 whitespace-nowrap font-techno text-xl font-black italic tracking-tight sm:text-2xl">
          Go <span className="text-gymred">Gym</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-xs sm:gap-5 sm:text-sm">
          <NavLink to="/plans" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-electricblue sm:inline ${isActive ? 'font-bold text-gymred' : ''}`}>Plans</NavLink>
          {user?.role === 'owner' || user?.role === 'staff'
            ? <NavLink to="/admin" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-electricblue sm:inline ${isActive ? 'font-bold text-gymred' : ''}`}>Admin</NavLink>
            : user && <NavLink to="/dashboard" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-electricblue sm:inline ${isActive ? 'font-bold text-gymred' : ''}`}>My membership</NavLink>}
          {user ? (
            <button onClick={() => { logout(); nav('/'); }} className="whitespace-nowrap rounded-full border border-electricblue px-3 py-1.5 transition hover:bg-electricblue hover:text-charcoal sm:px-4">Logout</button>
          ) : (
            <Link to="/login" className="whitespace-nowrap rounded-full bg-gymred px-3 py-1.5 font-bold text-white transition hover:shadow-[0_0_18px_#00D2FF] sm:px-4">Sign in</Link>
          )}
          <NavLink to="/register" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-electricblue sm:inline ${isActive ? 'font-bold text-gymred' : ''}`}>Sign up</NavLink>
        </div>
      </div>
    </nav>
  );
}