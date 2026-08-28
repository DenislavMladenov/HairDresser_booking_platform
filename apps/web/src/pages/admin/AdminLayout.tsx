import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import { useTranslation } from '../../i18n/language-context-core';
import { useLogout, useSession } from '../../hooks/use-auth';

export function AdminLayout() {
  const { t } = useTranslation();
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  const navigation = [
    { to: '/admin/today', label: t.admin.layout.nav.today },
    { to: '/admin/calendar', label: t.admin.layout.nav.calendar },
    { to: '/admin/appointments', label: t.admin.layout.nav.appointments },
    { to: '/admin/services', label: t.admin.layout.nav.services },
    { to: '/admin/working-hours', label: t.admin.layout.nav.hours },
    { to: '/admin/blocked-times', label: t.admin.layout.nav.timeOff },
    { to: '/admin/settings', label: t.admin.layout.nav.settings },
  ];

  async function handleLogout(): Promise<void> {
    await logout.mutateAsync();
    void navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{t.admin.layout.brand}</p>
              <p className="text-brand-100 text-xs">{session.data?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-brand-100 hover:bg-brand-700"
                onClick={() => void handleLogout()}
                loading={logout.isPending}
              >
                {t.admin.layout.signOut}
              </Button>
            </div>
          </div>

          {/* Horizontally scrollable so all sections stay reachable on a phone. */}
          <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-brand-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
