import { ApiErrorCode } from '@booking/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, http } from './api-client';

/**
 * The client is what makes state-changing requests survive CSRF protection, so
 * the token handling and error mapping are worth pinning down.
 */
function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('http', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'csrf_token=test-token-value';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefixes requests with /api and sends cookies', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([{ id: '1' }]));

    await http.get('/services');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/services',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    );
  });

  it('does not attach a CSRF header to safe requests', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([]));

    await http.get('/services');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('attaches the CSRF token from the cookie to unsafe requests', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ id: '1' }));

    await http.post('/bookings', { serviceId: 'x' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'test-token-value',
    });
    expect(init.body).toBe(JSON.stringify({ serviceId: 'x' }));
  });

  it('asks the API for a token when the cookie is missing', async () => {
    // Expire the cookie set in beforeEach.
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await http.post('/bookings', {});

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/csrf');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/bookings');
  });

  it('turns an error body into an ApiError carrying the code', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          code: ApiErrorCode.SLOT_TAKEN,
          message: 'That time has just been booked.',
        },
        409,
      ),
    );

    await expect(http.post('/bookings', {})).rejects.toMatchObject({
      status: 409,
      code: ApiErrorCode.SLOT_TAKEN,
      message: 'That time has just been booked.',
    });
  });

  it('reports slot conflicts through isSlotConflict', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        { statusCode: 409, code: ApiErrorCode.SLOT_UNAVAILABLE, message: 'Gone' },
        409,
      ),
    );

    const error = await http.post('/bookings', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isSlotConflict).toBe(true);
  });

  it('flags an expired session through isUnauthorized', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        { statusCode: 401, code: ApiErrorCode.UNAUTHORIZED, message: 'Session expired' },
        401,
      ),
    );

    const error = await http.get('/auth/me').catch((caught: unknown) => caught);

    expect((error as ApiError).isUnauthorized).toBe(true);
  });

  it('keeps validation details for the form to show', async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 400,
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Some values are not valid.',
          details: ['Please enter a valid phone number'],
        },
        400,
      ),
    );

    const error = (await http.post('/bookings', {}).catch((caught: unknown) => caught)) as ApiError;

    expect(error.details).toEqual(['Please enter a valid phone number']);
  });

  it('explains a network failure instead of leaking the raw error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = (await http.get('/services').catch((caught: unknown) => caught)) as ApiError;

    expect(error.status).toBe(0);
    expect(error.message).toContain('unreachable');
  });

  it('returns nothing for a 204 response', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });

    await expect(http.post('/auth/logout')).resolves.toBeUndefined();
  });
});
