const MysteryBagModel = require("../models/mysterybag.model");
const ModelBagModel = require("../models/modelbag.model");
const {
  getViewOnlyTtlDays,
} = require("../../../utils/viewOnlyBag");

async function cleanupExpiredViewOnlyBags() {
  const now = new Date();
  const legacyCutoff = new Date(
    now.getTime() - getViewOnlyTtlDays() * 24 * 60 * 60 * 1000
  );

  const expiredFilter = {
    bag_type: "view-only",
    status: "active",
    $or: [
      { expires_at: { $lte: now } },
      { expires_at: { $exists: false }, created_at: { $lte: legacyCutoff } },
    ],
  };

  const [mysteryResult, modelResult] = await Promise.all([
    MysteryBagModel.updateMany(expiredFilter, { status: "deleted" }),
    ModelBagModel.updateMany(expiredFilter, { status: "deleted" }),
  ]);

  console.log(
    `   Expired view-only bags cleaned: mystery=${mysteryResult.modifiedCount}, model=${modelResult.modifiedCount}`
  );
}

module.exports = cleanupExpiredViewOnlyBags;
