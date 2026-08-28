import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AppointmentsPage } from './pages/admin/AppointmentsPage';
import { BlockedTimesPage } from './pages/admin/BlockedTimesPage';
import { CalendarPage } from './pages/admin/CalendarPage';
import { LoginPage } from './pages/admin/LoginPage';
import { RequireSession } from './pages/admin/RequireSession';
import { ServicesPage } from './pages/admin/ServicesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { TodayPage } from './pages/admin/TodayPage';
import { WorkingHoursPage } from './pages/admin/WorkingHoursPage';
import { BookingPage } from './pages/booking/BookingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LanguageProvider } from './i18n/LanguageContext';
import { createQueryClient } from './lib/query-client';

export function App() {
  // Created in state so a re-render never discards the cache.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<BookingPage />} />
            <Route path="/admin/login" element={<LoginPage />} />

            <Route
              path="/admin"
              element={
                <RequireSession>
                  <AdminLayout />
                </RequireSession>
              }
            >
              <Route index element={<Navigate to="/admin/today" replace />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="working-hours" element={<WorkingHoursPage />} />
              <Route path="blocked-times" element={<BlockedTimesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
