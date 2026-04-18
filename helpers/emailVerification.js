const crypto = require("crypto");

const TOKEN_BYTES = 32;

function getSecret() {
  return process.env.JWT_SECRET_KEY || process.env.EMAIL_VERIFICATION_SECRET || "email-verification";
}

function generateVerificationToken() {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const hash = crypto.createHash("sha256").update(`${getSecret()}:${raw}`).digest("hex");
  return { raw, hash };
}

function hashVerificationToken(raw) {
  if (!raw || typeof raw !== "string") return "";
  return crypto.createHash("sha256").update(`${getSecret()}:${raw.trim()}`).digest("hex");
}

module.exports = {
  generateVerificationToken,
  hashVerificationToken,
};
