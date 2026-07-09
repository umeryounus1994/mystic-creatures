const multer = require("multer");
const apiResponse = require("../helpers/apiResponse");

const MAX_UPLOAD_MB = 100;

module.exports = function handleUploadError(err, req, res, next) {
  if (!err) {
    return next();
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return apiResponse.ErrorResponse(
        res,
        `File is too large. Maximum allowed size is ${MAX_UPLOAD_MB} MB.`
      );
    }
    return apiResponse.ErrorResponse(res, `Upload error: ${err.message}`);
  }

  return apiResponse.ErrorResponse(res, err.message || "File upload failed");
};

module.exports.MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
