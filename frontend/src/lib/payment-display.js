export function getPaymentStatusClass(status) {
  if (status === 'PAID' || status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (status === 'PROCESSING') {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
  if (status === 'FAILED') {
    return 'bg-red-50 text-red-700 border border-red-200';
  }
  if (status === 'REFUNDED') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  if (status === 'CANCELLED') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

export function formatPaymentStatus(status) {
  if (status === 'PAID' || status === 'COMPLETED') return 'Paid';
  if (status === 'PROCESSING') return 'Processing';
  if (status === 'FAILED') return 'Payment Failed';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
}

export function formatSavedMethod(paymentMethod) {
  if (!paymentMethod?.last4) return 'No payment method saved';

  const brand = String(paymentMethod.brand || 'card');
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);

  return `${label} ending in ${paymentMethod.last4}`;
}
