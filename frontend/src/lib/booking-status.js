export function getBookingStatusClass(status) {
  if (status === 'UNPAID') return 'bg-orange-50 text-orange-700 border border-orange-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export function formatBookingStatus(status) {
  if (status === 'UNPAID') return 'Unpaid';
  if (status === 'PENDING') return 'Pending';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'DECLINED') return 'Declined';
  if (status === 'RESCHEDULED') return 'Rescheduled';
  return status || 'Unknown';
}
