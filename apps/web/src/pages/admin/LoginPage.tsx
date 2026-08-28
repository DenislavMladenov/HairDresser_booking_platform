import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import { useLogin, useSession } from '../../hooks/use-auth';
import { ApiError } from '../../lib/api-client';

export function LoginPage() {
  const { t } = useTranslation();
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const loginErrorMessage = useApiErrorMessage(login.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session.data) {
    return <Navigate to="/admin/today" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          const from = (location.state as { from?: string } | null)?.from;
          void navigate(from ?? '/admin/today', { replace: true });
        },
      },
    );
  }

  const isRateLimited = login.error instanceof ApiError && login.error.status === 429;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-end">
          <LanguageToggle variant="light" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t.admin.login.brand}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.admin.login.subtitle}</p>
        </div>

        <Card>
          {login.error ? (
            <div className="mb-4">
              <Alert
                tone="error"
                title={isRateLimited ? t.admin.login.tooManyAttempts : t.admin.login.signInFailed}
              >
                {login.error instanceof ApiError ? loginErrorMessage : t.admin.login.genericCheckDetails}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label={t.admin.login.emailLabel} htmlFor="email" required>
              <TextInput
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label={t.admin.login.passwordLabel} htmlFor="password" required>
              <TextInput
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={login.isPending}>
              {t.admin.login.submit}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
