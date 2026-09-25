const fs = require("fs");
const path = require("path");
const logger = require("../middlewares/logger");
const UserModel = require("../src/v1/models/user.model");

const DEFAULT_KEY_PATH = path.join(
  __dirname,
  "../templates/mycre-eecaf-firebase-adminsdk-fbsvc-b06a2cef1d.json"
);

let firebaseAdmin = null;
let initAttempted = false;

const getFirebaseAdmin = () => {
  if (firebaseAdmin) return firebaseAdmin;
  if (initAttempted) return null;
  initAttempted = true;
  try {
    const keyPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || DEFAULT_KEY_PATH;
    if (!fs.existsSync(keyPath)) {
      logger.error(`Firebase service account not found at ${keyPath}`);
      return null;
    }
    // eslint-disable-next-line global-require
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(require(keyPath)),
      });
    }
    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (err) {
    logger.error(err);
    return null;
  }
};

const stringifyData = (data = {}) => {
  const out = {};
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined || data[key] === null) return;
    out[key] = String(data[key]);
  });
  return out;
};

const sendPushToTokens = async (tokens, { title, body, data } = {}) => {
  const uniqueTokens = [
    ...new Set((tokens || []).map((token) => String(token || "").trim()).filter(Boolean)),
  ];
  if (!uniqueTokens.length) {
    return { sent: 0, failed: 0 };
  }
  const admin = getFirebaseAdmin();
  if (!admin) {
    return { sent: 0, failed: uniqueTokens.length };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens = [];
  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: stringifyData(data),
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
      sent += response.successCount || 0;
      failed += response.failureCount || 0;
      (response.responses || []).forEach((item, index) => {
        const code = item.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(batch[index]);
        }
      });
    } catch (err) {
      logger.error(err);
      failed += batch.length;
    }
  }

  if (invalidTokens.length) {
    await UserModel.updateMany(
      { push_token: { $in: invalidTokens } },
      { push_token: "" }
    );
  }

  return { sent, failed };
};

const sendPushToAllUsers = async (payload) => {
  const users = await UserModel.find({
    push_token: { $exists: true, $nin: [null, ""] },
  }).select("push_token");
  return sendPushToTokens(
    users.map((user) => user.push_token),
    payload
  );
};

const sendPushToUser = async (userId, payload) => {
  const user = await UserModel.findById(userId).select("push_token");
  if (!user?.push_token) {
    return { sent: 0, failed: 0 };
  }
  return sendPushToTokens([user.push_token], payload);
};

module.exports = {
  sendPushToTokens,
  sendPushToAllUsers,
  sendPushToUser,
};
