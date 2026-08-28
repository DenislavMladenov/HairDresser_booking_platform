import { ApiError } from '../lib/api-client';
import { useTranslation } from './language-context-core';

/**
 * Exact English strings the API is known to send back (see `create-booking.dto.ts`,
 * `auth.service.ts`, `bookings.service.ts` and friends), mapped to their Bulgarian
 * equivalent. The backend stays English-only internally: this is purely a display
 * concern on the frontend.
 *
 * Messages with a dynamic part (a count, a raw field name) are intentionally left
 * out here and fall back to the generic per-code translation instead, since a
 * word-for-word match is not possible without changing the API's response shape.
 */
const KNOWN_MESSAGES_BG: Record<string, string> = {
  'Please enter your name': 'Моля, въведете име',
  'Please enter a valid phone number': 'Моля, въведете валиден телефонен номер',
  'Please enter a valid email address': 'Моля, въведете валиден имейл адрес',
  'Price must be a number with up to two decimal places':
    'Цената трябва да е число с до два знака след десетичната запетая',
  'date must be in YYYY-MM-DD format': 'Датата трябва да е във формат ГГГГ-ММ-ДД',
  'from must be in YYYY-MM-DD format': 'Началната дата трябва да е във формат ГГГГ-ММ-ДД',
  'A valid email address is required': 'Нужен е валиден имейл адрес',
  'Password must be at least 10 characters': 'Паролата трябва да е поне 10 символа',
  'Your session has expired. Please sign in again.': 'Сесията ви е изтекла. Моля, влезте отново.',
  'The working hours are not valid.': 'Работното време не е валидно.',
  'That time overlaps an existing appointment. Please choose another time.':
    'Часът се припокрива със съществуваща резервация. Моля, изберете друг час.',
  'Appointment not found.': 'Резервацията не е намерена.',
  'Request origin is not allowed.': 'Произходът на заявката не е разрешен.',
  'Missing CSRF token. Please reload the page and try again.':
    'Липсва CSRF токен. Моля, презаредете страницата и опитайте пак.',
  'Invalid CSRF token. Please reload the page and try again.':
    'Невалиден CSRF токен. Моля, презаредете страницата и опитайте пак.',
  'Incorrect email or password.': 'Грешен имейл или парола.',
  'Blocked period not found.': 'Периодът не е намерен.',
  'The blocked period must end after it starts.':
    'Блокираният период трябва да завършва след началото си.',
  'Service not found.': 'Услугата не е намерена.',
  'That time has just been booked. Please choose another slot.':
    'Часът току-що беше зает. Моля, изберете друг.',
  'That time is no longer available. Please pick another slot.':
    'Този час вече не е свободен. Моля, изберете друг.',
  'A record with these details already exists.': 'Вече съществува запис с тези данни.',
  'The submitted values are not valid.': 'Въведените данни не са валидни.',
  'Resource not found.': 'Ресурсът не е намерен.',
  'Date must be in YYYY-MM-DD format.': 'Датата трябва да е във формат ГГГГ-ММ-ДД.',
};

/**
 * Translates whatever the API (or the network layer) threw into a message fit
 * for display: a known code first, then a known raw string for Bulgarian, then
 * the server's own English text as a safe fallback that never breaks.
 */
export function useApiErrorMessage(error: unknown): string {
  const { language, t } = useTranslation();

  if (error instanceof ApiError) {
    if (language === 'bg') {
      const known = KNOWN_MESSAGES_BG[error.message];

      if (known) {
        return known;
      }
    }

    return t.errors.byCode[error.code] ?? error.message;
  }

  if (error instanceof Error) {
    return t.common.tryAgain;
  }

  return t.common.tryAgain;
}
