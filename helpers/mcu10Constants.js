/**
 * MCU-10 constants — price levels & default images.
 * Extensible: add one store product + one dropdown option later.
 */

const DEFAULT_IMAGES = ["chest", "map", "compass", "door"];
const DEFAULT_IMAGE = "chest";

const LANGUAGES = ["german", "english"];
const DEFAULT_LANGUAGE = "german";

/** @type {Record<string, string>} */
const PRICE_LEVEL_PRODUCT_IDS = {
  "1.99": "com.usquaresolution.mysticalcreatures.treasurehunt199",
  "2.99": "com.usquaresolution.mysticalcreatures.treasurehunt299",
  "4.99": "com.usquaresolution.mysticalcreatures.treasurehunt499",
  "6.99": "com.usquaresolution.mysticalcreatures.treasurehunt699",
  "9.99": "com.usquaresolution.mysticalcreatures.treasurehunt999",
};

const PRICE_LEVELS = Object.keys(PRICE_LEVEL_PRODUCT_IDS);

const MAP_HUNT_RADIUS_KM = 50;

/** Legacy stock URL used as schema default — treat as "no custom image". */
const LEGACY_STOCK_IMAGE =
  "https://st.depositphotos.com/1819777/4778/v/450/depositphotos_47785885-stock-illustration-treasure-map.jpg";

function normalizeLanguage(value) {
  if (!value) return DEFAULT_LANGUAGE;
  const v = String(value).trim().toLowerCase();
  if (v === "de" || v === "deutsch" || v === "german") return "german";
  if (v === "en" || v === "english") return "english";
  return LANGUAGES.includes(v) ? v : DEFAULT_LANGUAGE;
}

function normalizeDefaultImage(value) {
  if (!value) return DEFAULT_IMAGE;
  const v = String(value).trim().toLowerCase();
  return DEFAULT_IMAGES.includes(v) ? v : DEFAULT_IMAGE;
}

function normalizePriceLevel(value) {
  if (value === undefined || value === null || value === "" || value === "null") {
    return null;
  }
  const key = String(value).trim();
  return PRICE_LEVELS.includes(key) ? key : null;
}

function storeProductIdForPriceLevel(priceLevel) {
  const level = normalizePriceLevel(priceLevel);
  return level ? PRICE_LEVEL_PRODUCT_IDS[level] : null;
}

function isCustomImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === LEGACY_STOCK_IMAGE) return false;
  return true;
}

module.exports = {
  DEFAULT_IMAGES,
  DEFAULT_IMAGE,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  PRICE_LEVEL_PRODUCT_IDS,
  PRICE_LEVELS,
  MAP_HUNT_RADIUS_KM,
  LEGACY_STOCK_IMAGE,
  normalizeLanguage,
  normalizeDefaultImage,
  normalizePriceLevel,
  storeProductIdForPriceLevel,
  isCustomImageUrl,
};
