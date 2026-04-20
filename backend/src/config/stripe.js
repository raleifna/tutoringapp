const Stripe = require('stripe');

let stripeClient = null;

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const getStripe = () => {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(secretKey);

  return stripeClient;
};

module.exports = {
  getStripe,
  isStripeConfigured,
};
