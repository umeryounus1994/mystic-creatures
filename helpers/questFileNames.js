const path = require("path");

function sanitizeQuestTitleForFilename(title) {
  if (!title || typeof title !== "string") return "Quest";
  const sanitized = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ");
  return sanitized || "Quest";
}

function getExtensionFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return "";
  const basename = fileUrl.split("/").pop().split("?")[0];
  return path.extname(basename) || "";
}

function buildQuestFileDisplayName(questTitle, fileUrl, suffix = "") {
  if (!fileUrl) return "";
  const name = sanitizeQuestTitleForFilename(questTitle);
  const ext = getExtensionFromUrl(fileUrl);
  if (suffix) {
    return `${name}_${suffix}${ext}`;
  }
  return `${name}${ext}`;
}

function getQuestTitleFromQuest(quest) {
  return quest?.quest_title || quest?.quest_question || "";
}

function enrichQuestWithFileNames(quest) {
  const title = getQuestTitleFromQuest(quest);
  const questObj = quest?.toObject ? quest.toObject() : { ...quest };
  return {
    ...questObj,
    quest_image_name: buildQuestFileDisplayName(title, questObj.quest_image),
    reward_file_name: buildQuestFileDisplayName(title, questObj.reward_file, "reward"),
  };
}

function enrichQuestQuizWithFileNames(questTitle, questQuiz) {
  if (!Array.isArray(questQuiz)) return [];
  return questQuiz.map((quizItem, index) => {
    const quizObj = quizItem?.toObject ? quizItem.toObject() : { ...quizItem };
    return {
      ...quizObj,
      answer_image_name: buildQuestFileDisplayName(
        questTitle,
        quizObj.answer_image,
        `option${index + 1}`
      ),
    };
  });
}

module.exports = {
  sanitizeQuestTitleForFilename,
  getExtensionFromUrl,
  buildQuestFileDisplayName,
  getQuestTitleFromQuest,
  enrichQuestWithFileNames,
  enrichQuestQuizWithFileNames,
};
