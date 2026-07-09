function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function resolveQuestMediaUrl(req, fileField, bodyField, fallback = "") {
  const uploaded = req.files?.[fileField]?.[0]?.location;
  if (uploaded) {
    return uploaded;
  }

  const bodyUrl = req.body?.[bodyField];
  if (isHttpUrl(bodyUrl)) {
    return bodyUrl.trim();
  }

  return fallback;
}

module.exports = {
  isHttpUrl,
  resolveQuestMediaUrl,
};
