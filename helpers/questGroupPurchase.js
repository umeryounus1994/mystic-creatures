const { ObjectId } = require("mongodb");
const QuestGroupModel = require("../src/v1/models/questgroup.model");
const QuestPurchaseModel = require("../src/v1/models/questpurchases.model");
const UserQuestGroupModel = require("../src/v1/models/userquestgroup.model");
const apiResponse = require("./apiResponse");

const PURCHASE_TTL_MS = 24 * 60 * 60 * 1000;

const purchaseExpiry = (fromDate) =>
  new Date(new Date(fromDate || Date.now()).getTime() + PURCHASE_TTL_MS);

const getValidQuestGroupPurchase = async (userId, groupId) => {
  if (!userId || !groupId) {
    return null;
  }
  const purchase = await QuestPurchaseModel.findOne({
    user_id: new ObjectId(userId),
    quest_group_id: new ObjectId(groupId),
    status: "active",
  }).sort({ created_at: -1 });

  if (!purchase) {
    return null;
  }

  const expiresAt =
    purchase.expires_at || purchaseExpiry(purchase.created_at || purchase.purchased_at);
  if (new Date(expiresAt).getTime() < Date.now()) {
    return null;
  }
  return { purchase, expiresAt };
};

const groupPayload = (group, extra = {}) => ({
  scan_type: extra.scan_type || "quest_group_payment",
  needs_purchase: true,
  quest_group_id: group._id,
  quest_group_name: group.quest_group_name,
  group_package: group.group_package || "Bronze",
  qr_code: group.qr_code,
  ...extra,
});

const paymentRequired = (res, group, extra = {}) =>
  apiResponse.paymentRequiredResponse(
    res,
    "This quest belongs to a paid quest group. Complete the group payment first.",
    groupPayload(group, extra)
  );

const requireQuestGroupPurchase = async (req, res, quest, extra = {}) => {
  if (!quest?.quest_group_id) {
    return null;
  }
  const group = await QuestGroupModel.findById(quest.quest_group_id);
  if (!group || group.status !== "active") {
    return apiResponse.ErrorResponse(res, "Quest group is not available");
  }
  const valid = await getValidQuestGroupPurchase(req.user.id, group._id);
  if (valid) {
    return null;
  }
  return paymentRequired(res, group, {
    scan_type: "grouped_quest",
    quest_id: quest._id,
    ...extra,
  });
};

const ensureUserQuestGroupProgress = async (userId, groupId) => {
  const existing = await UserQuestGroupModel.findOne({
    user_id: new ObjectId(userId),
    quest_group_id: new ObjectId(groupId),
  });
  if (existing) {
    return existing;
  }
  const created = new UserQuestGroupModel({
    user_id: userId,
    quest_group_id: groupId,
    status: "inprogress",
  });
  await created.save();
  return created;
};

module.exports = {
  PURCHASE_TTL_MS,
  purchaseExpiry,
  getValidQuestGroupPurchase,
  groupPayload,
  paymentRequired,
  requireQuestGroupPurchase,
  ensureUserQuestGroupProgress,
};
