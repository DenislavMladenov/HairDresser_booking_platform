-- Integrity rules that the Prisma schema language cannot express.
-- These are the authoritative guarantees; application code validates the same
-- rules earlier only to produce friendly error messages.

-- ---------------------------------------------------------------------------
-- Bookings: no overlapping appointments, ever.
-- ---------------------------------------------------------------------------

-- A booking must cover a positive amount of time.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_time_valid" CHECK ("endTime" > "startTime");

-- Double-booking protection.
--
-- The half-open range '[)' means a booking ending at 10:30 does not conflict
-- with one starting at 10:30. The partial WHERE clause keeps CANCELLED and
-- NO_SHOW rows out of the index, so cancelling an appointment immediately frees
-- its slot. Because PostgreSQL evaluates this constraint while holding the
-- relevant index locks, two concurrent transactions inserting the same interval
-- cannot both commit: the second one fails with SQLSTATE 23P01.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ((tstzrange("startTime", "endTime", '[)')) WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED'));

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------

ALTER TABLE "Service"
  ADD CONSTRAINT "service_duration_valid"
  CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 480);

ALTER TABLE "Service"
  ADD CONSTRAINT "service_price_valid" CHECK ("price" >= 0);

-- ---------------------------------------------------------------------------
-- Weekly configuration. Minute offsets are business-local wall time, so they
-- must stay inside a single day.
-- ---------------------------------------------------------------------------

ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "working_hours_day_valid" CHECK ("dayOfWeek" BETWEEN 1 AND 7);

ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "working_hours_range_valid"
  CHECK ("openMinute" >= 0 AND "closeMinute" <= 1440 AND "closeMinute" > "openMinute");

ALTER TABLE "WeeklyBreak"
  ADD CONSTRAINT "weekly_break_range_valid"
  CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");

-- ---------------------------------------------------------------------------
-- Blocked periods and settings
-- ---------------------------------------------------------------------------

ALTER TABLE "BlockedTime"
  ADD CONSTRAINT "blocked_time_valid" CHECK ("endTime" > "startTime");

-- BookingSettings is a singleton; a second row would silently split config.
ALTER TABLE "BookingSettings"
  ADD CONSTRAINT "booking_settings_singleton" CHECK ("id" = 1);

ALTER TABLE "BookingSettings"
  ADD CONSTRAINT "booking_settings_valid"
  CHECK (
    "slotIntervalMinutes" BETWEEN 5 AND 240
    AND "minLeadTimeMinutes" >= 0
    AND "maxAdvanceDays" BETWEEN 1 AND 365
  );
