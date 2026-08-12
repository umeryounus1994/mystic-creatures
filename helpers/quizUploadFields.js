/**
 * Build multer.fields() config for quiz option images + optional reward.
 * Supports a large practical max so missions/hunts are not capped at 3/5.
 */
function buildQuizUploadFields(maxOptions = 50) {
  const fields = [];
  for (let i = 1; i <= maxOptions; i += 1) {
    fields.push({ name: `option${i}`, maxCount: 1 });
  }
  fields.push({ name: "reward", maxCount: 1 });
  return fields;
}

module.exports = { buildQuizUploadFields };
