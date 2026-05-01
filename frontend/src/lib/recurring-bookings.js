export const isRecurringBooking = (booking) =>
  Boolean(booking?.recurringGroupId || (booking?.recurringType && booking.recurringType !== 'ONE_OFF'));

export const getRecurringSeries = (booking) => booking?.recurringSeries || null;

export const getLatestRescheduleEntry = (booking) =>
  booking?.statusHistory?.find((entry) => entry.status === 'RESCHEDULED') || null;

export const getLatestRescheduleReason = (booking) => getLatestRescheduleEntry(booking)?.reason || '';

export const getRecurringSeriesBookings = (booking) =>
  [...(getRecurringSeries(booking)?.bookings || [])].sort(
    (left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt)
  );

const normalizeStatus = (status) => String(status || 'PENDING').toUpperCase();
const isFutureBooking = (booking) => new Date(booking?.scheduledAt || 0) > new Date();

export const isAwaitingPayment = (booking) => {
  const bookingStatus = normalizeStatus(booking?.status);
  return bookingStatus === 'UNPAID';
};

export const getBookingDisplayStatus = (booking) => {
  const bookingStatus = normalizeStatus(booking?.status);

  if (isAwaitingPayment(booking)) {
    return 'UNPAID';
  }

  return bookingStatus;
};

export const getRecurringStatusSummary = (booking) => {
  const seriesBookings = getRecurringSeriesBookings(booking);
  const bookings = seriesBookings.length ? seriesBookings : booking ? [booking] : [];
  const counts = bookings.reduce((accumulator, entry) => {
    const status = normalizeStatus(entry?.status);
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});
  const totalSessions = bookings.length;
  const unpaidCount = bookings.filter(isAwaitingPayment).length;
  const acceptedCount = (counts.ACCEPTED || 0) + (counts.COMPLETED || 0);
  const declinedCount = counts.DECLINED || 0;
  const cancelledCount = counts.CANCELLED || 0;
  const rescheduledCount = counts.RESCHEDULED || 0;
  const pendingCount = bookings.filter((entry) => {
    const status = normalizeStatus(entry?.status);
    return status === 'PENDING' && !isAwaitingPayment(entry);
  }).length;

  let status = getBookingDisplayStatus(booking);
  if (totalSessions > 0) {
    if ((counts.COMPLETED || 0) === totalSessions) {
      status = 'COMPLETED';
    } else if ((counts.CANCELLED || 0) === totalSessions) {
      status = 'CANCELLED';
    } else if ((counts.DECLINED || 0) === totalSessions) {
      status = 'DECLINED';
    } else if (acceptedCount > 0) {
      status = 'ACCEPTED';
    } else if (unpaidCount > 0) {
      status = 'UNPAID';
    } else if (pendingCount > 0) {
      status = 'PENDING';
    } else if (declinedCount > 0) {
      status = counts.DECLINED ? 'DECLINED' : 'CANCELLED';
    }
  }

  return {
    status,
    counts,
    totalSessions,
    acceptedCount,
    declinedCount,
    cancelledCount,
    rescheduledCount,
    unpaidCount,
    pendingCount,
    isPartiallyAccepted: status === 'ACCEPTED' && acceptedCount > 0 && acceptedCount < totalSessions,
  };
};

export const getRecurringDisplayStatus = (booking) => getRecurringStatusSummary(booking).status;

export const getDisplayStatusLabel = (booking) => {
  if (isRecurringBooking(booking) && getRecurringStatusSummary(booking).isPartiallyAccepted) {
    return 'Partially accepted';
  }

  const status = isRecurringBooking(booking) ? getRecurringDisplayStatus(booking) : getBookingDisplayStatus(booking);
  if (status === 'UNPAID') return 'Unpaid';
  if (status === 'PENDING') return 'Pending';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'DECLINED') return 'Declined';
  if (status === 'RESCHEDULED') return 'Rescheduled';
  return status || 'Unknown';
};

export const getRecurringDisplayBookings = (bookings) => {
  const seenRecurringGroups = new Set();

  return bookings.filter((booking) => {
    const groupId = booking?.recurringGroupId || booking?.recurringSeries?.recurringGroupId;
    if (!groupId) return true;
    if (seenRecurringGroups.has(groupId)) return false;

    seenRecurringGroups.add(groupId);
    return true;
  });
};

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

export const getUpcomingAcceptedSessions = (booking) => {
  const bookings = isRecurringBooking(booking) ? getRecurringSeriesBookings(booking) : booking ? [booking] : [];

  return bookings
    .filter((entry) => normalizeStatus(entry?.status) === 'ACCEPTED' && isFutureBooking(entry))
    .sort((left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt));
};

export const getUpcomingSessionCount = (booking) => getUpcomingAcceptedSessions(booking).length;

export const getNextUpcomingSession = (booking) => getUpcomingAcceptedSessions(booking)[0] || null;

export const matchesBookingDisplayStatus = (booking, status) => {
  if (!status) return true;
  const targetStatus = normalizeStatus(status);
  const displayStatus = isRecurringBooking(booking) ? getRecurringDisplayStatus(booking) : getBookingDisplayStatus(booking);

  if (targetStatus === 'CANCELLED') {
    return displayStatus === 'CANCELLED' || displayStatus === 'DECLINED';
  }

  if (targetStatus === 'ACCEPTED') {
    return getUpcomingSessionCount(booking) > 0;
  }

  return displayStatus === targetStatus;
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
