import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner';
import { useSession } from '../../hooks/use-auth';

/**
 * Client-side gate for the admin area. It only decides what to render: the API
 * enforces authorisation on every request, so a user who bypasses this sees
 * nothing but 401s.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
