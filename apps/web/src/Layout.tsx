import { LOCALES } from '@confinet/i18n';
import { useI18n } from '@confinet/i18n/react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router';
import { api } from './api';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: api.me });
}

const icons = {
  analyze: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  history: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  account: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  admin: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
    </svg>
  ),
};

export function Layout() {
  const { t, locale, setPreference } = useI18n();
  const { data: me } = useMe();
  const links = [
    { to: '/', label: t('nav.analyze'), icon: icons.analyze, end: true },
    { to: '/historial', label: t('nav.history'), icon: icons.history },
    { to: '/cuenta', label: t('nav.account'), icon: icons.account },
    ...(me?.user?.isAdmin ? [{ to: '/admin', label: t('nav.admin'), icon: icons.admin }] : []),
  ];

  return (
    <div className="app cf-root">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
            Confinet
          </Link>
          <nav className="topnav" aria-label={t('nav.main')}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
        <footer className="footer cf-small">
          <Link to="/privacidad">{t('nav.privacy')}</Link>
          <Link to="/terminos">{t('nav.terms')}</Link>
          <span className="lang-switch" role="group" aria-label={t('nav.language')}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={l === locale}
                onClick={() => setPreference(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        </footer>
      </main>

      <nav className="tabbar" aria-label={t('nav.main')}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            {l.icon}
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
