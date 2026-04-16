export const isRecurringBooking = (booking) =>
  Boolean(booking?.recurringGroupId || (booking?.recurringType && booking.recurringType !== 'ONE_OFF'));

export const getRecurringSeries = (booking) => booking?.recurringSeries || null;

export const getRecurringSeriesBookings = (booking) =>
  [...(getRecurringSeries(booking)?.bookings || [])].sort(
    (left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt)
  );

export const getRecurringSessionCount = (booking) => {
  if (!isRecurringBooking(booking)) return 1;
  return getRecurringSeries(booking)?.totalSessions || getRecurringSeriesBookings(booking).length || 1;
};

export const formatRecurringType = (value) => {
  if (value === 'WEEKLY') return 'Weekly series';
  if (value === 'FORTNIGHTLY') return 'Fortnightly series';
  if (value === 'MONTHLY') return 'Monthly series';
  return 'Recurring series';
};

export const getRecurringLabel = (booking) => {
  if (!isRecurringBooking(booking)) return '';

  const count = getRecurringSessionCount(booking);
  const type = formatRecurringType(booking?.recurringType || getRecurringSeries(booking)?.recurringType);
  return count > 1 ? `${type} · ${count} sessions` : type;
};

export const isPaidBooking = (booking) =>
  ['PAID', 'COMPLETED'].includes(String(booking?.payment?.status || '').toUpperCase());

export const needsPaymentSetup = (booking) =>
  ['PENDING', 'ACCEPTED'].includes(String(booking?.status || '').toUpperCase()) &&
  ['PENDING', 'FAILED'].includes(String(booking?.payment?.status || 'PENDING').toUpperCase());

export const getPayableSeriesBookings = (booking) => {
  const seriesBookings = getRecurringSeriesBookings(booking);
  if (!seriesBookings.length) return needsPaymentSetup(booking) ? [booking] : [];

  return seriesBookings.filter(needsPaymentSetup);
};

export const getSeriesTotalAmount = (bookings) =>
  bookings.reduce((sum, booking) => sum + Number(booking?.totalAmount || 0), 0);
