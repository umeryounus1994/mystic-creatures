const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { slugify } = require("../src/v1/utils/slug");

const BUCKET = process.env.AWS_MEDIA_BUCKET || "mysticcrts";
const PRESIGNED_URL_EXPIRES_SECONDS = 600;

const fieldSuffixMap = {
  quest_file: "",
  reward: "_reward",
  option1: "_option1",
  option2: "_option2",
  option3: "_option3",
  option4: "_option4",
  option5: "_option5",
};

const ALLOWED_FIELD_TYPES = Object.keys(fieldSuffixMap);

function getS3Client() {
  const spacesEndpoint = new aws.Endpoint(process.env.AWS_END_POINT);
  return new aws.S3({
    endpoint: spacesEndpoint,
  });
}

function buildQuestFileKey({ questTitle, fieldType, fileName }) {
  const fileExtension = path.extname(fileName || "") || "";
  const questSlug = slugify(String(questTitle || "quest")) || "quest";
  const fieldSuffix = fieldSuffixMap[fieldType] ?? `_${fieldType}`;
  return `${questSlug}${fieldSuffix}_${Date.now()}_${uuidv4().slice(0, 8)}${fileExtension}`;
}

function buildPublicUrl(key) {
  const endpoint = (process.env.AWS_END_POINT || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!endpoint) {
    return `https://${BUCKET}/${key}`;
  }

  return `https://${BUCKET}.${endpoint}/${key}`;
}

function createPresignedUploadUrl({ key, contentType }) {
  const s3 = getS3Client();
  const uploadUrl = s3.getSignedUrl("putObject", {
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    ACL: "public-read",
    Expires: PRESIGNED_URL_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: buildPublicUrl(key),
    key,
    expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
  };
}

module.exports = {
  BUCKET,
  ALLOWED_FIELD_TYPES,
  fieldSuffixMap,
  getS3Client,
  buildQuestFileKey,
  buildPublicUrl,
  createPresignedUploadUrl,
};
