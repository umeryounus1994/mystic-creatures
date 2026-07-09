const mediaUpload = require("./upload-quest-file");
const handleUploadError = require("./handleUploadError");

const questUploadFields = [
  { name: "reward", maxCount: 1 },
  { name: "quest_file", maxCount: 1 },
  { name: "option1", maxCount: 1 },
  { name: "option2", maxCount: 1 },
  { name: "option3", maxCount: 1 },
  { name: "option4", maxCount: 1 },
  { name: "option5", maxCount: 1 },
];

const questQuizUploadFields = [
  { name: "option1", maxCount: 1 },
  { name: "option2", maxCount: 1 },
  { name: "option3", maxCount: 1 },
  { name: "option4", maxCount: 1 },
  { name: "option5", maxCount: 1 },
];

function withUploadErrorHandling(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      return next();
    });
  };
}

module.exports = {
  uploadQuestFiles: withUploadErrorHandling(mediaUpload.fields(questUploadFields)),
  uploadQuestQuizFiles: withUploadErrorHandling(mediaUpload.fields(questQuizUploadFields)),
  uploadQuestGroupReward: withUploadErrorHandling(
    mediaUpload.fields([{ name: "reward", maxCount: 1 }])
  ),
};
