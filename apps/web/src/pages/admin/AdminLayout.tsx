import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useLogout, useSession } from '../../hooks/use-auth';

const NAVIGATION = [
  { to: '/admin/today', label: 'Today' },
  { to: '/admin/calendar', label: 'Calendar' },
  { to: '/admin/appointments', label: 'Appointments' },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/working-hours', label: 'Hours' },
  { to: '/admin/blocked-times', label: 'Time off' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

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
              <p className="font-semibold">Barber Shop admin</p>
              <p className="text-brand-100 text-xs">{session.data?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand-100 hover:bg-brand-700"
              onClick={() => void handleLogout()}
              loading={logout.isPending}
            >
              Sign out
            </Button>
          </div>

          {/* Horizontally scrollable so all sections stay reachable on a phone. */}
          <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1">
            {NAVIGATION.map((item) => (
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
