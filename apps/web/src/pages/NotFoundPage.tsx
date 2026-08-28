import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/language-context-core';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-brand-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t.shared.notFound.title}</h1>
        <p className="mt-2 text-slate-600">{t.shared.notFound.description}</p>
        <Link
          to="/"
          className="text-brand-600 hover:text-brand-700 mt-6 inline-block text-sm font-medium"
        >
          {t.shared.notFound.link}
        </Link>
      </div>
    </main>
  );
}
