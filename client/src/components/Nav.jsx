// components/Nav.jsx
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { api } from '../api';
import { gymServices } from '../data/services';

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [hasTransformations, setHasTransformations] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/features/public-transformations')
      .then(({ transformations }) => { if (active) setHasTransformations(transformations.length > 0); })
      .catch((error) => console.error('Could not load public transformations:', error));
    return () => { active = false; };
  }, []);

  function goToServices(e) {
    e.preventDefault();
    setServicesOpen(false);
    if (window.location.pathname === '/') {
      scrollToId('services');
    } else {
      nav('/');
      setTimeout(() => scrollToId('services'), 150);
    }
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-brand bg-card backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="GoGym home" className="shrink-0">
          <BrandLogo />
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-xs sm:gap-5 sm:text-sm">
          <div
            className="relative hidden sm:block"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              onClick={goToServices}
              onFocus={() => setServicesOpen(true)}
              onBlur={() => setServicesOpen(false)}
              aria-haspopup="true"
              aria-expanded={servicesOpen}
              className="whitespace-nowrap transition-colors hover:text-brand focus:outline-none"
            >
              Services
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full z-50 pt-3">
                <div className="min-w-[200px] rounded-xl border border-brand bg-card py-2 shadow-[0_0_18px_rgb(240_84_35_/_22%)]">
                  {gymServices.map((service) => (
                    <button key={service.id} type="button" onClick={goToServices}
                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm transition-colors hover:bg-brand/10 hover:text-brand">
                      {service.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {hasTransformations && <Link to="/#transformations" className="hidden whitespace-nowrap transition-colors hover:text-brand sm:inline">Transformations</Link>}
          {user?.role === 'owner'
            ? <NavLink to="/admin" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-brand sm:inline ${isActive ? 'font-bold text-brand' : ''}`}>Admin</NavLink>
            : user?.role === 'staff'
              ? <NavLink to="/trainer" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-brand sm:inline ${isActive ? 'font-bold text-brand' : ''}`}>Trainer workspace</NavLink>
            : user && <NavLink to="/dashboard" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-brand sm:inline ${isActive ? 'font-bold text-brand' : ''}`}>My membership</NavLink>}
          {user ? (
            <button onClick={() => { logout(); nav('/'); }} className="whitespace-nowrap rounded-full border border-brand px-3 py-1.5 transition hover:bg-brand hover:text-charcoal sm:px-4">Logout</button>
          ) : (
            <Link to="/login" className="whitespace-nowrap rounded-full bg-brand px-3 py-1.5 font-bold text-white transition hover:shadow-[0_0_18px_#F05423] sm:px-4">Sign in</Link>
          )}
          <NavLink to="/register" className={({ isActive }) => `hidden whitespace-nowrap transition-colors hover:text-brand sm:inline ${isActive ? 'font-bold text-brand' : ''}`}>Sign up</NavLink>
        </div>
      </div>
    </nav>
  );
}