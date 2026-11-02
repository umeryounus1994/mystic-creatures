const SORT_ORDER = {
  ASC: 1,
  DESC: -1,
};

// Partner profile copy link: base URL and page path (e.g. partner-profile.html?slug=xxx)
const PARTNER_PROFILE_BASE_URL = process.env.FRONTEND_URL || "https://mycrebooking.com";
const PARTNER_PROFILE_PAGE_PATH = "partner-profile.html";

/** Fixed Crypes awarded when a player collects Magic Art from the map (MCU-5). */
const MAGIC_ART_COLLECT_CRYPES = 10;

module.exports = {
  SORT_ORDER,
  PARTNER_PROFILE_BASE_URL,
  PARTNER_PROFILE_PAGE_PATH,
  MAGIC_ART_COLLECT_CRYPES,
};
