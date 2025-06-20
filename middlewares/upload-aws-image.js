const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { randomNumber } = require("../utils/randomNumber");
const path = require('path');

const spacesEndpoint = new aws.Endpoint(process.env.AWS_END_POINT);

// aws.config.update({

// });
const s3 = new aws.S3({
  endpoint: spacesEndpoint
});
module.exports = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'mysticcrts',
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const fileExtension = path.extname(file.originalname); // get .jpg, .png, etc.
      const fileName = `${uuidv4()}_${randomNumber(6)}${fileExtension}`;
      cb(null, `_${Date.now()}_${fileName}`);
    },
  })
});

// const s3 = new aws.S3({ useAccelerateEndpoint: true, endpoint: spacesEndpoint,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID });
// module.exports = multer({
//   storage: multerS3({
//     acl: "public-read",
//     s3,
//     bucket: process.env.AWS_MEDIA_BUCKET,
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     metadata(req, file, cb) {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key(req, file, cb) {
//       const fileName = `${uuidv4()}_${randomNumber(6)}`;
//       cb(null, `_${Date.now().toString()}_${fileName}`);
//     },
//   }),
//   limits: {
//     fileSize: 50000000, // 8 MB
//   },
// });
