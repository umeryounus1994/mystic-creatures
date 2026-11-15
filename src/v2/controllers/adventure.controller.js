const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const TreasureHuntModel = require("../../v1/models/treasure.model");
const MissionModel = require("../../v1/models/mission.model");
const UserTreasureHuntModel = require("../../v1/models/usertreasurehunt.model");
const UserMissionModel = require("../../v1/models/usermission.model");
const HuntPurchaseModel = require("../../v1/models/huntpurchases.model");
const logger = require("../../../middlewares/logger");
const {
  normalizeLanguage,
  normalizePriceLevel,
  storeProductIdForPriceLevel,
  PRICE_LEVEL_PRODUCT_IDS,
  DEFAULT_IMAGES,
  LANGUAGES,
  PRICE_LEVELS,
} = require("../../../helpers/mcu10Constants");
const {
  MAP_HUNT_RADIUS_KM,
  buildHuntMapEntry,
  buildMissionMapEntry,
  pauseInProgressAdventures,
} = require("../../../helpers/mcu10MapHunt");

/**
 * POST /api/v2/adventure/map_hunt
 * Body: { latitude, longitude, language }
 * Returns nearby treasure hunts + missions for Map Hunt list.
 */
const getMapHuntList = async (req, res, next) => {
  try {
    if (req.body.latitude === undefined || req.body.longitude === undefined) {
      return apiResponse.ErrorResponse(res, "Lat, Long is required");
    }
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return apiResponse.ErrorResponse(res, "Invalid latitude or longitude");
    }

    const language = normalizeLanguage(
      req.body.language || req.headers["accept-language"] || "german"
    );
    const userId = req.user.id;

    const [hunts, missions] = await Promise.all([
      TreasureHuntModel.find({ status: "active", language }).populate(
        "mythica_ID"
      ),
      MissionModel.find({ status: "active", language }).populate("mythica_ID"),
    ]);

    // Include docs missing language (pre-migration) as german
    let huntPool = hunts;
    let missionPool = missions;
    if (language === "german") {
      const [huntsNoLang, missionsNoLang] = await Promise.all([
        TreasureHuntModel.find({
          status: "active",
          $or: [{ language: { $exists: false } }, { language: null }],
        }).populate("mythica_ID"),
        MissionModel.find({
          status: "active",
          $or: [{ language: { $exists: false } }, { language: null }],
        }).populate("mythica_ID"),
      ]);
      const huntIds = new Set(huntPool.map((h) => String(h._id)));
      const missionIds = new Set(missionPool.map((m) => String(m._id)));
      huntPool = huntPool.concat(
        huntsNoLang.filter((h) => !huntIds.has(String(h._id)))
      );
      missionPool = missionPool.concat(
        missionsNoLang.filter((m) => !missionIds.has(String(m._id)))
      );
    }

    const entries = [];
    for (const hunt of huntPool) {
      const entry = await buildHuntMapEntry(hunt, userId, latitude, longitude);
      if (entry) entries.push(entry);
    }
    for (const mission of missionPool) {
      const entry = await buildMissionMapEntry(
        mission,
        userId,
        latitude,
        longitude
      );
      if (entry) entries.push(entry);
    }

    entries.sort((a, b) => a.distance_km - b.distance_km);

    return apiResponse.successResponseWithData(res, "Data Found", {
      count: entries.length,
      radius_km: MAP_HUNT_RADIUS_KM,
      language,
      items: entries,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * GET /api/v2/adventure/meta
 * Price levels + default images for admin / clients.
 */
const getAdventureMeta = async (req, res, next) => {
  try {
    return apiResponse.successResponseWithData(res, "OK", {
      languages: LANGUAGES,
      default_images: DEFAULT_IMAGES,
      price_levels: PRICE_LEVELS.map((level) => ({
        price_level: level,
        store_product_id: PRICE_LEVEL_PRODUCT_IDS[level],
      })),
      radius_km: MAP_HUNT_RADIUS_KM,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/hunt/get_all
 * Same filters as map list but hunts only; includes MCU-10 fields.
 */
const getHuntsV2 = async (req, res, next) => {
  try {
    if (req.body.latitude === undefined || req.body.longitude === undefined) {
      return apiResponse.ErrorResponse(res, "Lat, Long is required");
    }
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const language = normalizeLanguage(req.body.language || "german");
    const userId = req.user.id;

    const hunts = await TreasureHuntModel.find({ status: "active" }).populate(
      "mythica_ID"
    );
    const items = [];
    for (const hunt of hunts) {
      if (normalizeLanguage(hunt.language) !== language) {
        continue;
      }
      const entry = await buildHuntMapEntry(hunt, userId, latitude, longitude);
      if (entry) items.push(entry);
    }
    items.sort((a, b) => a.distance_km - b.distance_km);

    return apiResponse.successResponseWithData(res, "Data Found", {
      count: items.length,
      items,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/mission/get_all
 */
const getMissionsV2 = async (req, res, next) => {
  try {
    if (req.body.latitude === undefined || req.body.longitude === undefined) {
      return apiResponse.ErrorResponse(res, "Lat, Long is required");
    }
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const language = normalizeLanguage(req.body.language || "german");
    const userId = req.user.id;

    const missions = await MissionModel.find({ status: "active" }).populate(
      "mythica_ID"
    );
    const items = [];
    for (const mission of missions) {
      if (normalizeLanguage(mission.language) !== language) {
        continue;
      }
      const entry = await buildMissionMapEntry(
        mission,
        userId,
        latitude,
        longitude
      );
      if (entry) items.push(entry);
    }
    items.sort((a, b) => a.distance_km - b.distance_km);

    return apiResponse.successResponseWithData(res, "Data Found", {
      count: items.length,
      items,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/hunt/start/:id
 * Starts hunt; pauses any other in-progress hunt/mission. Progress kept.
 */
const startHuntV2 = async (req, res, next) => {
  try {
    const id = req.params.id;
    const hunt = await TreasureHuntModel.findOne({ _id: new ObjectId(id) });
    if (!hunt) {
      return apiResponse.notFoundResponse(res, "Hunt Not found with this ID!");
    }

    if (hunt.premium_hunt) {
      const purchase = await HuntPurchaseModel.findOne({
        user_id: new ObjectId(req.user.id),
        hunt_id: new ObjectId(id),
      });
      if (!purchase) {
        return apiResponse.ErrorResponse(
          res,
          "Purchase required to start this treasure hunt"
        );
      }
    }

    const paused = await pauseInProgressAdventures(req.user.id, {
      exceptHuntId: id,
    });

    let userHunt = await UserTreasureHuntModel.findOne({
      user_id: new ObjectId(req.user.id),
      treasure_hunt_id: new ObjectId(id),
    });

    if (userHunt) {
      if (userHunt.status === "completed" || userHunt.status === "claimed") {
        return apiResponse.ErrorResponse(res, "This treasure hunt is already completed");
      }
      userHunt.status = "inprogress";
      await userHunt.save();
    } else {
      userHunt = await UserTreasureHuntModel.create({
        user_id: req.user._id || req.user.id,
        treasure_hunt_id: id,
        status: "inprogress",
        quiz_answers: [],
      });
    }

    return apiResponse.successResponseWithData(res, "Started successfully", {
      hunt_id: id,
      type: "treasure_hunt",
      user_status: "inprogress",
      paused,
      paused_hint:
        paused.length > 0
          ? {
              type: paused[0].type,
              id: paused[0].id,
              name: paused[0].name,
            }
          : null,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/mission/start/:id
 */
const startMissionV2 = async (req, res, next) => {
  try {
    const id = req.params.id;
    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(res, "Not found!");
    }

    const paused = await pauseInProgressAdventures(req.user.id, {
      exceptMissionId: id,
    });

    let userMission = await UserMissionModel.findOne({
      user_id: new ObjectId(req.user.id),
      mission_id: new ObjectId(id),
    });

    if (userMission) {
      if (
        userMission.status === "completed" ||
        userMission.status === "claimed"
      ) {
        return apiResponse.ErrorResponse(res, "This mission is already completed");
      }
      userMission.status = "inprogress";
      await userMission.save();
    } else {
      userMission = await UserMissionModel.create({
        user_id: req.user._id || req.user.id,
        mission_id: id,
        status: "inprogress",
        quiz_answers: [],
      });
    }

    return apiResponse.successResponseWithData(res, "Started successfully", {
      mission_id: id,
      type: "mission",
      user_status: "inprogress",
      paused,
      paused_hint:
        paused.length > 0
          ? {
              type: paused[0].type,
              id: paused[0].id,
              name: paused[0].name,
            }
          : null,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/hunt/purchase/:id
 * Body (optional): { purchase_token, store_product_id }
 * Unlocks hunt on account; no technical ID popup (client responsibility).
 */
const purchaseHuntV2 = async (req, res, next) => {
  try {
    const id = req.params.id;
    const hunt = await TreasureHuntModel.findOne({ _id: new ObjectId(id) });
    if (!hunt) {
      return apiResponse.notFoundResponse(res, "Not found!");
    }
    if (!hunt.premium_hunt) {
      return apiResponse.ErrorResponse(res, "This is not a premium hunt");
    }

    const priceLevel = normalizePriceLevel(hunt.price_level);
    if (!priceLevel) {
      return apiResponse.ErrorResponse(
        res,
        "Hunt has no valid price_level configured"
      );
    }
    const expectedProductId = storeProductIdForPriceLevel(priceLevel);
    const clientProductId = req.body?.store_product_id;
    if (clientProductId && clientProductId !== expectedProductId) {
      return apiResponse.ErrorResponse(
        res,
        "store_product_id does not match hunt price level"
      );
    }

    const existing = await HuntPurchaseModel.findOne({
      user_id: new ObjectId(req.user.id),
      hunt_id: new ObjectId(id),
    });
    if (existing) {
      return apiResponse.successResponseWithData(res, "Already purchased", {
        hunt_id: id,
        already_purchased: true,
        price_level: existing.price_level || priceLevel,
        store_product_id: existing.store_product_id || expectedProductId,
        list_state: "unlocked",
        badge: "unlocked",
        button: "start",
      });
    }

    const created = await HuntPurchaseModel.create({
      user_id: req.user.id,
      hunt_id: id,
      package: hunt.hunt_package || "Bronze",
      price_level: priceLevel,
      store_product_id: expectedProductId,
      purchase_token: req.body?.purchase_token || undefined,
      status: "active",
    });

    // Unlock record for the user (do not auto-start)
    const userHunt = await UserTreasureHuntModel.findOne({
      user_id: new ObjectId(req.user.id),
      treasure_hunt_id: new ObjectId(id),
    });
    if (!userHunt) {
      await UserTreasureHuntModel.create({
        user_id: req.user._id || req.user.id,
        treasure_hunt_id: id,
        status: "purchased",
        quiz_answers: [],
      });
    } else if (userHunt.status === "open") {
      userHunt.status = "purchased";
      await userHunt.save();
    }

    return apiResponse.successResponseWithData(res, "Hunt purchased", {
      hunt_id: id,
      already_purchased: false,
      purchase_id: created._id,
      price_level: priceLevel,
      store_product_id: expectedProductId,
      list_state: "unlocked",
      badge: "unlocked",
      button: "start",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

/**
 * POST /api/v2/hunt/unlock — QR unlock with pause (not terminate)
 * Body: { qr_code }
 */
const unlockHuntByQrV2 = async (req, res, next) => {
  try {
    const qr_code = req.body.qr_code;
    if (!qr_code) {
      return apiResponse.notFoundResponse(res, "QR Code Not found!");
    }
    const hunt = await TreasureHuntModel.findOne({ qr_code });
    if (!hunt) {
      return apiResponse.notFoundResponse(
        res,
        "Hunt Not found with this QR Code!"
      );
    }

    if (hunt.premium_hunt) {
      const purchase = await HuntPurchaseModel.findOne({
        user_id: new ObjectId(req.user.id),
        hunt_id: new ObjectId(hunt._id),
      });
      if (!purchase) {
        return apiResponse.ErrorResponse(
          res,
          "Purchase required to start this treasure hunt"
        );
      }
    }

    const paused = await pauseInProgressAdventures(req.user.id, {
      exceptHuntId: hunt._id,
    });

    let userHunt = await UserTreasureHuntModel.findOne({
      user_id: new ObjectId(req.user.id),
      treasure_hunt_id: new ObjectId(hunt._id),
    });

    if (userHunt) {
      if (userHunt.status === "completed" || userHunt.status === "claimed") {
        return apiResponse.ErrorResponse(
          res,
          "This treasure hunt is already completed"
        );
      }
      userHunt.status = "inprogress";
      await userHunt.save();
    } else {
      userHunt = await UserTreasureHuntModel.create({
        user_id: req.user._id || req.user.id,
        treasure_hunt_id: hunt._id,
        status: "inprogress",
        quiz_answers: [],
      });
    }

    return apiResponse.successResponseWithData(res, "Started successfully", {
      hunt_id: hunt._id,
      type: "treasure_hunt",
      user_status: "inprogress",
      paused,
      paused_hint:
        paused.length > 0
          ? {
              type: paused[0].type,
              id: paused[0].id,
              name: paused[0].name,
            }
          : null,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

module.exports = {
  getMapHuntList,
  getAdventureMeta,
  getHuntsV2,
  getMissionsV2,
  startHuntV2,
  startMissionV2,
  purchaseHuntV2,
  unlockHuntByQrV2,
};
