const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { slugify } = require("../src/v1/utils/slug");

const spacesEndpoint = new aws.Endpoint(process.env.AWS_END_POINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
});

const fieldSuffixMap = {
  quest_file: "",
  reward: "_reward",
  option1: "_option1",
  option2: "_option2",
  option3: "_option3",
  option4: "_option4",
  option5: "_option5",
};

function getQuestSlugFromRequest(req) {
  const questTitle = req.body?.quest_title || req.body?.quest_question || "quest";
  return slugify(String(questTitle)) || "quest";
}

module.exports = multer({
  storage: multerS3({
    s3,
    bucket: "mysticcrts",
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
