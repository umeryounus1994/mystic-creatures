const DEFAULT_TTL_DAYS = 5;

function getViewOnlyTtlDays() {
  const configured = Number(process.env.VIEW_ONLY_DROP_TTL_DAYS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_DAYS;
}

function computeViewOnlyExpiresAt(fromDate = new Date()) {
  const days = getViewOnlyTtlDays();
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function applyViewOnlyBagFields(bagDetails) {
  if (bagDetails.bag_type === "view-only") {
    if (!bagDetails.expires_at) {
      bagDetails.expires_at = computeViewOnlyExpiresAt();
    }
  } else if (bagDetails.bag_type === "collectible") {
    bagDetails.expires_at = undefined;
  }
  return bagDetails;
}

/** Mongo filter: active collectible bags + non-expired view-only bags */
function getActiveBagFilter() {
  const now = new Date();
  const legacyCutoff = new Date(
    now.getTime() - getViewOnlyTtlDays() * 24 * 60 * 60 * 1000
  );

  return {
    status: "active",
    $or: [
      { bag_type: { $ne: "view-only" } },
      { bag_type: "view-only", expires_at: { $gt: now } },
      {
        bag_type: "view-only",
        expires_at: { $exists: false },
        created_at: { $gt: legacyCutoff },
      },
    ],
  };
}

function isViewOnlyBagExpired(bag) {
  if (!bag || bag.bag_type !== "view-only") {
    return false;
  }
  const now = new Date();
  if (bag.expires_at) {
    return new Date(bag.expires_at) <= now;
  }
  const legacyCutoff = new Date(
    now.getTime() - getViewOnlyTtlDays() * 24 * 60 * 60 * 1000
  );
  return new Date(bag.created_at) <= legacyCutoff;
}

module.exports = {
  getViewOnlyTtlDays,
  computeViewOnlyExpiresAt,
  applyViewOnlyBagFields,
  getActiveBagFilter,
  isViewOnlyBagExpired,
};
