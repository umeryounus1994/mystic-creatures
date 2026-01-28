const CommissionRate = require("../models/commissionrate.model");
const { generateResponse } = require("../utils/response");

const DEFAULT_COMMISSION_RATE = 15;

const commissionRateController = {
  // Admin: get the current global commission rate
  getCurrent: async (req, res) => {
    try {
      const doc = await CommissionRate.findOne({ key: "global" }).lean();
      const rate = doc?.rate ?? DEFAULT_COMMISSION_RATE;
      return generateResponse(res, 200, "Commission rate retrieved successfully", {
        rate,
        source: doc ? "database" : "default",
      });
    } catch (error) {
      return generateResponse(res, 500, "Error retrieving commission rate", null, error.message);
    }
  },

  // Admin: set the current global commission rate
  setCurrent: async (req, res) => {
    try {
      const { rate } = req.body;
      const parsed = Number(rate);

      if (!Number.isFinite(parsed)) {
        return generateResponse(res, 400, "rate must be a number");
      }
      if (parsed < 0 || parsed > 100) {
        return generateResponse(res, 400, "rate must be between 0 and 100");
      }

      const updated = await CommissionRate.findOneAndUpdate(
        { key: "global" },
        { $set: { rate: parsed } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      return generateResponse(res, 200, "Commission rate updated successfully", {
        rate: updated.rate,
      });
    } catch (error) {
      return generateResponse(res, 500, "Error updating commission rate", null, error.message);
    }
  },
};

module.exports = commissionRateController;

