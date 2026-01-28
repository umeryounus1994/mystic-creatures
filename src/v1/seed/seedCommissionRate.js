const CommissionRate = require("../models/commissionrate.model");

const DEFAULT_COMMISSION_RATE = 15;

/**
 * Idempotent seed:
 * - Ensures a global CommissionRate document exists
 * - Does NOT overwrite an existing value
 */
async function seedCommissionRate() {
  const existing = await CommissionRate.findOne({ key: "global" }).select("_id").lean();
  if (existing) return { seeded: false };

  const created = await CommissionRate.create({
    key: "global",
    rate: DEFAULT_COMMISSION_RATE,
  });

  return { seeded: true, rate: created.rate };
}

module.exports = { seedCommissionRate, DEFAULT_COMMISSION_RATE };

