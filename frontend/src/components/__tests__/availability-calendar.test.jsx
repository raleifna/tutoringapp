import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import AvailabilityCalendar from '../AvailabilityCalendar';

describe('AvailabilityCalendar component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T00:00:00.000Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('toggles an editable availability cell and reports the updated slots', async () => {
    const onChange = vi.fn();

    render(
      <AvailabilityCalendar
        mode="edit"
        hideWeekNavigation
        slots={[{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Available' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  test('selects an available future slot and ignores a booked slot', async () => {
    const onSelect = vi.fn();

    render(
      <AvailabilityCalendar
        mode="select"
        fixedWeekOffset={1}
        hideWeekNavigation
        slots={[
          { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
          { dayOfWeek: 2, startTime: '10:00', endTime: '11:00' },
        ]}
        bookedSlots={[
          {
            scheduledAt: '2026-05-05T10:00:00.000Z',
            duration: 60,
          },
        ]}
        onSelect={onSelect}
        timezone="UTC"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Booked' }));
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Available' }));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        key: '1:1-9',
        dayOfWeek: 1,
        hour: 9,
      })
    );
  });
});
