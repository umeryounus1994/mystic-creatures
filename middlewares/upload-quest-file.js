const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { slugify } = require("../src/v1/utils/slug");
const { MAX_UPLOAD_BYTES } = require("./handleUploadError");
const {
  BUCKET,
  fieldSuffixMap,
  getS3Client,
} = require("../helpers/spacesStorage");

function getQuestSlugFromRequest(req) {
  const questTitle = req.body?.quest_title || req.body?.quest_question || "quest";
  return slugify(String(questTitle)) || "quest";
}

module.exports = multer({
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  storage: multerS3({
    s3: getS3Client(),
    bucket: BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const questSlug = getQuestSlugFromRequest(req);
      const fieldSuffix = fieldSuffixMap[file.fieldname] ?? `_${file.fieldname}`;
      const fileName = `${questSlug}${fieldSuffix}_${Date.now()}_${uuidv4().slice(0, 8)}${fileExtension}`;
      cb(null, fileName);
    },
  }),
});
