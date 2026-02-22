/**
 * Generate URL-safe slug from text (e.g. business name).
 * Lowercase, replace spaces/special chars with hyphens, collapse multiple dashes.
 */
function slugify(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "";
}

/**
 * Ensure slug is unique among partners. If taken, appends -2, -3, etc.
 * @param {Model} UserModel - mongoose User model
 * @param {string} baseSlug - slug from slugify(businessName)
 * @param {string} [excludeUserId] - optional _id to exclude (for updates)
 * @returns {Promise<string>} unique slug
 */
async function ensureUniquePartnerSlug(UserModel, baseSlug, excludeUserId) {
  const base = baseSlug || "partner";
  let slug = base;
  let n = 2;
  const filter = { user_type: "partner", slug };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  while (await UserModel.exists(filter)) {
    slug = `${base}-${n}`;
    filter.slug = slug;
    n += 1;
  }
  return slug;
}

module.exports = { slugify, ensureUniquePartnerSlug };
