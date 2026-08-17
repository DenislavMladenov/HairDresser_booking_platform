import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-brand-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-600">This page does not exist.</p>
        <Link
          to="/"
          className="text-brand-600 hover:text-brand-700 mt-6 inline-block text-sm font-medium"
        >
          Go to booking
        </Link>
      </div>
    </main>
  );
}
