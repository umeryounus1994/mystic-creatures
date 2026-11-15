const ObjectID = require("mongodb").ObjectId;
const haversine = require("haversine");
const moment = require("moment");
const TreasureHuntQuizModel = require("../src/v1/models/treasurequiz.model");
const MissionQuizModel = require("../src/v1/models/missionquiz.model");
const UserTreasureHuntModel = require("../src/v1/models/usertreasurehunt.model");
const UserMissionModel = require("../src/v1/models/usermission.model");
const HuntPurchaseModel = require("../src/v1/models/huntpurchases.model");
const {
  MAP_HUNT_RADIUS_KM,
  normalizeLanguage,
  normalizeDefaultImage,
  normalizePriceLevel,
  storeProductIdForPriceLevel,
  isCustomImageUrl,
} = require("./mcu10Constants");

function parseCoordinatePair(coordinates) {
  if (!coordinates || coordinates.length < 2) return null;
  const lat = Number(coordinates[0]);
  const lng = Number(coordinates[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function distanceKm(userLat, userLng, location) {
  const end = parseCoordinatePair(location?.coordinates);
  if (!end) return null;
  return haversine(
    { latitude: Number(userLat), longitude: Number(userLng) },
    end,
    { unit: "km" }
  );
}

/**
 * Active when today is within start/end (inclusive). Missing dates = visible.
 * Accepts YYYY-MM-DD and common moment-parseable formats.
 */
function isActiveOnDate(startDate, endDate, now = moment()) {
  const today = moment(now).startOf("day");
  if (startDate) {
    const start = moment(startDate).startOf("day");
    if (start.isValid() && today.isBefore(start)) return false;
  }
  if (endDate) {
    const end = moment(endDate).endOf("day");
    if (end.isValid() && today.isAfter(end)) return false;
  }
  return true;
}

function resolveListImage(customUrl, defaultImage) {
  const hasCustom = isCustomImageUrl(customUrl);
  return {
    image: hasCustom ? customUrl : null,
    default_image: normalizeDefaultImage(defaultImage),
    has_custom_image: hasCustom,
  };
}

function deriveHuntListState({
  premiumHunt,
  purchased,
  userStatus,
  stationsCompleted,
  stationsTotal,
}) {
  if (userStatus === "completed" || userStatus === "claimed") {
    return {
      list_state: "completed",
      badge: "completed",
      button: null,
      stations_completed: stationsCompleted,
      stations_total: stationsTotal,
    };
  }
  if (userStatus === "inprogress" || userStatus === "paused") {
    return {
      list_state: userStatus === "paused" ? "paused" : "started",
      badge: "progress",
      button: "continue",
      stations_completed: stationsCompleted,
      stations_total: stationsTotal,
    };
  }
  if (premiumHunt && !purchased) {
    return {
      list_state: "premium_locked",
      badge: "price",
      button: "buy",
      stations_completed: stationsCompleted,
      stations_total: stationsTotal,
    };
  }
  if (premiumHunt && purchased) {
    return {
      list_state: "unlocked",
      badge: "unlocked",
      button: "start",
      stations_completed: stationsCompleted,
      stations_total: stationsTotal,
    };
  }
  return {
    list_state: "free",
    badge: "free",
    button: "start",
    stations_completed: stationsCompleted,
    stations_total: stationsTotal,
  };
}

async function countHuntStations(huntId) {
  return TreasureHuntQuizModel.countDocuments({
    treasure_hunt_id: new ObjectID(huntId),
  });
}

async function countMissionStations(missionId) {
  return MissionQuizModel.countDocuments({
    mission_id: new ObjectID(missionId),
  });
}

async function huntProgressAnswered(huntId, userId) {
  const userHunt = await UserTreasureHuntModel.findOne({
    user_id: new ObjectID(userId),
    treasure_hunt_id: new ObjectID(huntId),
  });
  if (!userHunt?.quiz_answers?.length) return 0;
  return userHunt.quiz_answers.filter((a) => a?.treasure_hunt_quiz_id).length;
}

async function missionProgressAnswered(missionId, userId) {
  const userMission = await UserMissionModel.findOne({
    user_id: new ObjectID(userId),
    mission_id: new ObjectID(missionId),
  });
  if (!userMission?.quiz_answers?.length) return 0;
  return userMission.quiz_answers.filter((a) => a?.mission_quiz_id).length;
}

async function buildHuntMapEntry(hunt, userId, latitude, longitude) {
  const dist = distanceKm(latitude, longitude, hunt.hunt_location);
  if (dist === null || dist > MAP_HUNT_RADIUS_KM) return null;
  if (
    !isActiveOnDate(hunt.treasure_hunt_start_date, hunt.treasure_hunt_end_date)
  ) {
    return null;
  }

  const stationsTotal = await countHuntStations(hunt._id);
  const stationsCompleted = await huntProgressAnswered(hunt._id, userId);
  const userHunt = await UserTreasureHuntModel.findOne({
    user_id: new ObjectID(userId),
    treasure_hunt_id: new ObjectID(hunt._id),
  });
  const purchase = await HuntPurchaseModel.findOne({
    user_id: new ObjectID(userId),
    hunt_id: new ObjectID(hunt._id),
  });
  const purchased = !!purchase;
  const premium = !!hunt.premium_hunt;
  const priceLevel = premium ? normalizePriceLevel(hunt.price_level) : null;
  const storeProductId = storeProductIdForPriceLevel(priceLevel);
  const images = resolveListImage(hunt.treasure_hunt_image, hunt.default_image);
  const state = deriveHuntListState({
    premiumHunt: premium,
    purchased,
    userStatus: userHunt?.status,
    stationsCompleted,
    stationsTotal,
  });

  return {
    id: hunt._id,
    type: "treasure_hunt",
    name: hunt.treasure_hunt_title,
    language: normalizeLanguage(hunt.language),
    distance_km: Math.round(dist * 10) / 10,
    stations_total: stationsTotal,
    stations_completed: stationsCompleted,
    premium_hunt: premium,
    price_level: priceLevel,
    store_product_id: storeProductId,
    hunt_package: hunt.hunt_package || null,
    purchased,
    user_status: userHunt?.status || (purchased ? "purchased" : "open"),
    ...images,
    ...state,
    start_latitude: hunt.hunt_location?.coordinates?.[0] ?? null,
    start_longitude: hunt.hunt_location?.coordinates?.[1] ?? null,
    have_qr: !!hunt.have_qr,
  };
}

async function buildMissionMapEntry(mission, userId, latitude, longitude) {
  const dist = distanceKm(latitude, longitude, mission.mission_location);
  if (dist === null || dist > MAP_HUNT_RADIUS_KM) return null;
  if (!isActiveOnDate(mission.mission_start_date, mission.mission_end_date)) {
    return null;
  }

  const stationsTotal = await countMissionStations(mission._id);
  const stationsCompleted = await missionProgressAnswered(mission._id, userId);
  const userMission = await UserMissionModel.findOne({
    user_id: new ObjectID(userId),
    mission_id: new ObjectID(mission._id),
  });
  const images = resolveListImage(mission.mission_image, mission.default_image);
  const state = deriveHuntListState({
    premiumHunt: false,
    purchased: false,
    userStatus: userMission?.status,
    stationsCompleted,
    stationsTotal,
  });

  return {
    id: mission._id,
    type: "mission",
    name: mission.mission_title,
    language: normalizeLanguage(mission.language),
    distance_km: Math.round(dist * 10) / 10,
    stations_total: stationsTotal,
    stations_completed: stationsCompleted,
    premium_hunt: false,
    price_level: null,
    store_product_id: null,
    hunt_package: null,
    purchased: false,
    user_status: userMission?.status || "open",
    ...images,
    ...state,
    start_latitude: mission.mission_location?.coordinates?.[0] ?? null,
    start_longitude: mission.mission_location?.coordinates?.[1] ?? null,
    have_qr: false,
  };
}

/**
 * Pause any in-progress hunt or mission for this user (MCU-10).
 * Returns names of items that were paused.
 */
async function pauseInProgressAdventures(userId, { exceptHuntId, exceptMissionId } = {}) {
  const paused = [];

  const huntQuery = {
    user_id: new ObjectID(userId),
    status: "inprogress",
  };
  if (exceptHuntId) {
    huntQuery.treasure_hunt_id = { $ne: new ObjectID(exceptHuntId) };
  }
  const inProgressHunts = await UserTreasureHuntModel.find(huntQuery).populate(
    "treasure_hunt_id"
  );
  for (const uh of inProgressHunts) {
    uh.status = "paused";
    await uh.save();
    paused.push({
      type: "treasure_hunt",
      id: uh.treasure_hunt_id?._id || uh.treasure_hunt_id,
      name: uh.treasure_hunt_id?.treasure_hunt_title || "",
    });
  }

  const missionQuery = {
    user_id: new ObjectID(userId),
    status: "inprogress",
  };
  if (exceptMissionId) {
    missionQuery.mission_id = { $ne: new ObjectID(exceptMissionId) };
  }
  const inProgressMissions = await UserMissionModel.find(missionQuery).populate(
    "mission_id"
  );
  for (const um of inProgressMissions) {
    um.status = "paused";
    await um.save();
    paused.push({
      type: "mission",
      id: um.mission_id?._id || um.mission_id,
      name: um.mission_id?.mission_title || "",
    });
  }

  return paused;
}

module.exports = {
  MAP_HUNT_RADIUS_KM,
  distanceKm,
  isActiveOnDate,
  resolveListImage,
  deriveHuntListState,
  buildHuntMapEntry,
  buildMissionMapEntry,
  pauseInProgressAdventures,
  countHuntStations,
  countMissionStations,
  huntProgressAnswered,
  missionProgressAnswered,
};
