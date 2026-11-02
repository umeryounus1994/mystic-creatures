const DEFAULT_TTL_DAYS = 5;

function getViewOnlyTtlDays() {
  const configured = Number(process.env.VIEW_ONLY_DROP_TTL_DAYS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_DAYS;
}

function computeViewOnlyExpiresAt(fromDate = new Date()) {
  const days = getViewOnlyTtlDays();
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Magic Art = mystery bag with a drawing; stays on map until admin deletes (no TTL). */
function isMagicArtBag(bag) {
  return !!(bag && bag.drawing_file && String(bag.drawing_file).trim());
}

function applyViewOnlyBagFields(bagDetails) {
  // Magic Art (look-at / collect) must remain until admin moderation removes it
  if (isMagicArtBag(bagDetails)) {
    bagDetails.expires_at = undefined;
    return bagDetails;
  }

  if (bagDetails.bag_type === "view-only") {
    if (!bagDetails.expires_at) {
      bagDetails.expires_at = computeViewOnlyExpiresAt();
    }
  } else if (bagDetails.bag_type === "collectible") {
    bagDetails.expires_at = undefined;
  }
  return bagDetails;
}

/** Mongo filter: active collectible bags + non-expired view-only bags (+ Magic Art forever) */
function getActiveBagFilter() {
  const now = new Date();
  const legacyCutoff = new Date(
    now.getTime() - getViewOnlyTtlDays() * 24 * 60 * 60 * 1000
  );

  return {
    status: "active",
    $or: [
      { bag_type: { $ne: "view-only" } },
      // Magic Art view-only: no expiry (MCU-5)
      {
        bag_type: "view-only",
        drawing_file: { $exists: true, $nin: [null, ""] },
      },
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
  // Magic Art stays until admin delete
  if (isMagicArtBag(bag)) {
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
  isMagicArtBag,
  applyViewOnlyBagFields,
  getActiveBagFilter,
  isViewOnlyBagExpired,
};
