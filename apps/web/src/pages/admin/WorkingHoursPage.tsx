import { useState } from 'react';
import {
  WEEKDAY_LABELS,
  type UpdateWorkingHoursDay,
  type Weekday,
  type WorkingHoursDay,
} from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/QueryState';
import { useUpdateWorkingHours, useWorkingHours } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';
import { formatMinuteOfDay } from '../../lib/format';

interface BreakRow {
  startMinute: number;
  endMinute: number;
}

interface DayRow {
  dayOfWeek: Weekday;
  enabled: boolean;
  openMinute: number;
  closeMinute: number;
  breaks: BreakRow[];
}

function toRows(days: WorkingHoursDay[]): DayRow[] {
  return days.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    enabled: day.enabled,
    openMinute: day.openMinute,
    closeMinute: day.closeMinute,
    breaks: day.breaks.map((item) => ({
      startMinute: item.startMinute,
      endMinute: item.endMinute,
    })),
  }));
}

function toMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function WorkingHoursPage() {
  const workingHours = useWorkingHours();
  const save = useUpdateWorkingHours();

  // Server state is the source until the barber edits something; deriving it
  // during render avoids seeding state from an effect.
  const [draft, setDraft] = useState<DayRow[] | null>(null);
  const days = draft ?? (workingHours.data ? toRows(workingHours.data.days) : null);

  function updateDay(dayOfWeek: Weekday, changes: Partial<DayRow>): void {
    if (!days) {
      return;
    }

    setDraft(days.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day)));
  }

  function updateBreak(dayOfWeek: Weekday, index: number, changes: Partial<BreakRow>): void {
    if (!days) {
      return;
    }

    setDraft(
      days.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breaks: day.breaks.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
              ),
            }
          : day,
      ),
    );
  }

  function handleSave(): void {
    if (!days) {
      return;
    }

    const payload: UpdateWorkingHoursDay[] = days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      enabled: day.enabled,
      openMinute: day.openMinute,
      closeMinute: day.closeMinute,
      breaks: day.breaks,
    }));

    save.mutate({ days: payload }, { onSuccess: () => setDraft(null) });
  }

  return (
    <Card>
      <CardHeader
        title="Working hours"
        description="Times are in the shop's timezone and apply every week"
        action={
          <Button onClick={handleSave} loading={save.isPending} disabled={days === null}>
            Save week
          </Button>
        }
      />

      {save.error ? (
        <div className="mb-4">
          <Alert
            tone="error"
            title="Could not save the schedule"
            details={save.error instanceof ApiError ? save.error.details : undefined}
          >
            {save.error instanceof ApiError ? save.error.message : 'Please try again.'}
          </Alert>
        </div>
      ) : null}

      {save.isSuccess && draft === null ? (
        <div className="mb-4">
          <Alert tone="success">Schedule saved.</Alert>
        </div>
      ) : null}

      <QueryState isLoading={workingHours.isPending || days === null} error={workingHours.error}>
        <div className="space-y-3">
          {(days ?? []).map((day) => (
            <div key={day.dayOfWeek} className="rounded-lg p-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      updateDay(day.dayOfWeek, { enabled: event.target.checked })
                    }
                    className="text-brand-600 focus:ring-brand-600 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-800">
                    {WEEKDAY_LABELS[day.dayOfWeek]}
                  </span>
                </label>

                {day.enabled ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <TextInput
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[day.dayOfWeek]} opening time`}
                      value={formatMinuteOfDay(day.openMinute)}
                      onChange={(event) =>
                        updateDay(day.dayOfWeek, { openMinute: toMinutes(event.target.value) })
                      }
                      className="w-32"
                    />
                    <span className="text-slate-500">to</span>
                    <TextInput
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[day.dayOfWeek]} closing time`}
                      value={formatMinuteOfDay(day.closeMinute)}
                      onChange={(event) =>
                        updateDay(day.dayOfWeek, { closeMinute: toMinutes(event.target.value) })
                      }
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Closed</span>
                )}
              </div>

              {day.enabled ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {day.breaks.map((item, index) => (
                    <div
                      key={`${day.dayOfWeek}-${index}`}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="w-32 text-slate-600">Break</span>
                      <TextInput
                        type="time"
                        aria-label="Break start"
                        value={formatMinuteOfDay(item.startMinute)}
                        onChange={(event) =>
                          updateBreak(day.dayOfWeek, index, {
                            startMinute: toMinutes(event.target.value),
                          })
                        }
                        className="w-32"
                      />
                      <span className="text-slate-500">to</span>
                      <TextInput
                        type="time"
                        aria-label="Break end"
                        value={formatMinuteOfDay(item.endMinute)}
                        onChange={(event) =>
                          updateBreak(day.dayOfWeek, index, {
                            endMinute: toMinutes(event.target.value),
                          })
                        }
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateDay(day.dayOfWeek, {
                            breaks: day.breaks.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateDay(day.dayOfWeek, {
                        breaks: [...day.breaks, { startMinute: 13 * 60, endMinute: 14 * 60 }],
                      })
                    }
                  >
                    Add break
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </QueryState>
    </Card>
  );
}
