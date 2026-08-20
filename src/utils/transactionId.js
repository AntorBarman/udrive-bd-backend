const crypto = require('crypto');

/**
 * Generate unique transaction ID for payments
 * Format: UDRIVE_<timestamp>_<random>
 * Example: UDRIVE_1787058055594_a3f8e2c1
 */
const generateTransactionId = (prefix = 'UDRIVE') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Generate short reference ID for wallet transactions
 */
const generateReferenceId = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Generate booking reference number
 * Format: BK-<timestamp>-<random>
 */
const generateBookingReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BK-${timestamp}-${random}`;
};

/**
 * Generate unique ID for audit logs
 */
const generateAuditId = () => {
  return crypto.randomUUID();
};

module.exports = {
  generateTransactionId,
  generateReferenceId,
  generateBookingReference,
  generateAuditId,
};