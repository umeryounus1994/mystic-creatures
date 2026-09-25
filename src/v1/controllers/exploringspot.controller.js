const { ObjectId } = require("mongodb");
const haversine = require("haversine");
const apiResponse = require("../../../helpers/apiResponse");
const ExploringSpotModel = require("../models/exploringspot.model");
const UserExploringSpotModel = require("../models/userexploringspot.model");
const UserModel = require("../models/user.model");
const RewardModel = require("../models/reward.model");
const UserRewardModel = require("../models/userreward.model");
const logger = require("../../../middlewares/logger");
const { sendPushToAllUsers, sendPushToUser } = require("../../../helpers/push");

const NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000;

const parseBool = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value).toLowerCase() === "true" ||
  String(value).toLowerCase() === "on" ||
  String(value).toLowerCase() === "yes";

const parseLocation = (body) => {
  const lat = parseFloat(body?.latitude);
  const lng = parseFloat(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { type: "Point", coordinates: [lng, lat] };
};

const distanceKm = (spot, latitude, longitude) => {
  const [lng, lat] = spot.location?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return haversine(
    { latitude, longitude },
    { latitude: lat, longitude: lng },
    { unit: "km" }
  );
};

const serializeSpot = (spot, extras = {}) => ({
  id: spot._id,
  spot_name: spot.spot_name,
  description: spot.description,
  city: spot.city,
  radius_meters: spot.radius_meters,
  no_of_points: spot.no_of_points,
  is_ar: Boolean(spot.is_ar),
  latitude: spot.location?.coordinates?.[1],
  longitude: spot.location?.coordinates?.[0],
  location: spot.location,
  created_from: spot.created_from,
  created_by: spot.created_by,
  status: spot.status,
  created_at: spot.created_at,
  updated_at: spot.updated_at,
  ...extras,
});

const buildSpotFromBody = (req, createdFrom) => {
  const location = parseLocation(req.body);
  if (!location) {
    return { error: "Valid latitude and longitude are required" };
  }
  const radius = parseFloat(req.body.radius_meters);
  const points = parseInt(req.body.no_of_points, 10);
  return {
    spot: {
      spot_name: req.body.spot_name,
      description: req.body.description || "",
      city: String(req.body.city || "").trim(),
      radius_meters: Number.isFinite(radius) && radius > 0 ? radius : 100,
      no_of_points: Number.isFinite(points) && points > 0 ? points : 1,
      is_ar: parseBool(req.body.is_ar),
      location,
      created_from: createdFrom,
      created_by: req.user.id,
    },
  };
};

const createExploringSpot = async (req, res, next) => {
  try {
    const built = buildSpotFromBody(req, "admin");
    if (built.error) {
      return apiResponse.validationErrorWithData(res, built.error);
    }
    if (!built.spot.spot_name) {
      return apiResponse.validationErrorWithData(res, "Spot name is required");
    }
    if (!built.spot.city) {
      return apiResponse.validationErrorWithData(res, "City is required");
    }
    const created = await ExploringSpotModel.create(built.spot);
    sendPushToAllUsers({
      title: "New Exploring Spot",
      body: `A new exploring spot "${created.spot_name}" was added in ${created.city}.`,
      data: {
        type: "exploring_spot_created",
        exploring_spot_id: created._id,
        city: created.city,
        is_ar: Boolean(created.is_ar),
        latitude: created.location?.coordinates?.[1],
        longitude: created.location?.coordinates?.[0],
      },
    }).catch((err) => logger.error(err));
    return apiResponse.successResponseWithData(
      res,
      "Exploring spot created successfully",
      serializeSpot(created)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createExploringSpotByUser = async (req, res, next) => {
  try {
    const built = buildSpotFromBody(req, "user");
    if (built.error) {
      return apiResponse.validationErrorWithData(res, built.error);
    }
    if (!built.spot.spot_name) {
      return apiResponse.validationErrorWithData(res, "Spot name is required");
    }
    if (!built.spot.city) {
      return apiResponse.validationErrorWithData(res, "City is required");
    }
    const created = await ExploringSpotModel.create(built.spot);
    return apiResponse.successResponseWithData(
      res,
      "Exploring spot created successfully",
      serializeSpot(created)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const editExploringSpot = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid exploring spot id");
    }
    const existing = await ExploringSpotModel.findById(id);
    if (!existing || existing.status === "deleted") {
      return apiResponse.notFoundResponse(res, "Exploring spot not found");
    }

    const update = {};
    if (req.body.spot_name !== undefined) update.spot_name = req.body.spot_name;
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.city !== undefined) update.city = String(req.body.city || "").trim();
    if (req.body.is_ar !== undefined) update.is_ar = parseBool(req.body.is_ar);
    const radius = parseFloat(req.body.radius_meters);
    if (Number.isFinite(radius) && radius > 0) update.radius_meters = radius;
    const points = parseInt(req.body.no_of_points, 10);
    if (Number.isFinite(points) && points > 0) update.no_of_points = points;
    const location = parseLocation(req.body);
    if (location) update.location = location;

    const updated = await ExploringSpotModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    return apiResponse.successResponseWithData(
      res,
      "Exploring spot updated successfully",
      serializeSpot(updated)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const deleteExploringSpot = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid exploring spot id");
    }
    const updated = await ExploringSpotModel.findByIdAndUpdate(
      id,
      { status: "deleted" },
      { new: true }
    );
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Exploring spot not found");
    }
    return apiResponse.successResponse(res, "Exploring spot deleted");
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAllExploringSpots = async (req, res, next) => {
  try {
    const filter = { status: "active" };
    if (req.query.city) {
      filter.city = new RegExp(String(req.query.city), "i");
    }
    const spots = await ExploringSpotModel.find(filter).sort({ created_at: -1 });
    return res.json({
      status: true,
      message: spots.length ? "Data Found" : "No exploring spots found",
      data: spots.map((spot) => serializeSpot(spot)),
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getExploringSpotById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid exploring spot id");
    }
    const spot = await ExploringSpotModel.findById(id);
    if (!spot || spot.status === "deleted") {
      return apiResponse.notFoundResponse(res, "Exploring spot not found");
    }
    return apiResponse.successResponseWithData(
      res,
      "Exploring spot found",
      serializeSpot(spot)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const findNearbySpotsForUser = async (userId, latitude, longitude) => {
  const spots = await ExploringSpotModel.find({ status: "active" });
  const nearby = [];
  for (const spot of spots) {
    const km = distanceKm(spot, latitude, longitude);
    if (km == null) continue;
    const radiusKm = (spot.radius_meters || 100) / 1000;
    if (km <= radiusKm) {
      const visit = await UserExploringSpotModel.findOne({
        user_id: new ObjectId(userId),
        exploring_spot_id: spot._id,
      });
      const lastNotified = visit?.last_notified_at
        ? new Date(visit.last_notified_at).getTime()
        : 0;
      nearby.push(
        serializeSpot(spot, {
          distance_km: km,
          in_radius: true,
          checked_in: visit?.status === "checked_in",
          collected: visit?.status === "checked_in",
          should_notify:
            visit?.status !== "checked_in" &&
            (!visit?.last_notified_at || Date.now() - lastNotified >= NOTIFY_COOLDOWN_MS),
          last_notified_at: visit?.last_notified_at || null,
        })
      );
    }
  }
  return nearby.sort((a, b) => a.distance_km - b.distance_km);
};

const getNearbyExploringSpots = async (req, res, next) => {
  try {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return apiResponse.validationErrorWithData(res, "Valid latitude and longitude are required");
    }

    const nearby = await findNearbySpotsForUser(req.user.id, latitude, longitude);
    return res.json({
      status: nearby.length > 0,
      message: nearby.length ? "Nearby exploring spots found" : "No exploring spots nearby",
      data: nearby,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const serializeReward = (reward) => ({
  id: reward._id,
  reward_id: reward._id,
  city: reward.city || "",
  spots_required: reward.spots_required || reward.reward_name || 0,
  points_required: reward.points_required || 0,
  reward_name: reward.reward_name,
  reward_crypes: reward.reward_crypes || 0,
  reward_file: reward.reward_file || "",
  reward_type: reward.reward_type || "exploring",
});

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cityFilter = (city) => ({
  $regex: `^${escapeRegex(String(city || "").trim())}$`,
  $options: "i",
});

const getUniqueCities = async () => {
  const spots = await ExploringSpotModel.find({
    status: "active",
    city: { $exists: true, $nin: [null, ""] },
  }).select("city");
  const seen = {};
  const cities = [];
  spots.forEach((spot) => {
    const name = String(spot.city || "").trim();
    const key = name.toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    cities.push(name);
  });
  return cities.sort((a, b) => a.localeCompare(b));
};

const resolveCanonicalCity = async (city) => {
  const trimmed = String(city || "").trim();
  if (!trimmed) return "";
  const match = await ExploringSpotModel.findOne({
    status: "active",
    city: cityFilter(trimmed),
  }).select("city");
  return match?.city ? String(match.city).trim() : "";
};

const getCollectedCountInCity = async (userId, city) => {
  if (!String(city || "").trim()) return 0;
  const spots = await ExploringSpotModel.find({
    status: "active",
    city: cityFilter(city),
  }).select("_id");
  if (!spots.length) return 0;
  return UserExploringSpotModel.countDocuments({
    user_id: new ObjectId(userId),
    status: "checked_in",
    exploring_spot_id: { $in: spots.map((spot) => spot._id) },
  });
};

const getCollectedByCity = async (userId) => {
  const visits = await UserExploringSpotModel.find({
    user_id: new ObjectId(userId),
    status: "checked_in",
  }).populate("exploring_spot_id");
  const byCity = {};
  visits.forEach((visit) => {
    const cityName = String(visit.exploring_spot_id?.city || "").trim();
    if (!cityName) return;
    const key = cityName.toLowerCase();
    if (!byCity[key]) {
      byCity[key] = { city: cityName, collected_spots: 0 };
    }
    byCity[key].collected_spots += 1;
  });
  return Object.values(byCity);
};

const getSpotsRequired = (reward) =>
  Number(reward.spots_required || reward.reward_name || 0);

const unlockExploringRewards = async (userId, city, previousCount, newCount) => {
  if (!String(city || "").trim() || newCount <= previousCount) return [];
  const rewards = await RewardModel.find({
    status: "active",
    reward_type: "exploring",
    city: cityFilter(city),
  }).sort({ spots_required: 1, reward_name: 1 });
  const unlocked = [];
  for (const reward of rewards) {
    const required = getSpotsRequired(reward);
    if (required <= 0 || required <= previousCount || required > newCount) {
      continue;
    }
    const existing = await UserRewardModel.findOne({
      reward_id: reward._id,
      user_id: new ObjectId(userId),
    });
    if (existing) continue;
    await new UserRewardModel({
      reward_id: reward._id,
      user_id: userId,
    }).save();
    unlocked.push(serializeReward(reward));
  }
  return unlocked;
};

const getUserExploringTotal = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) return { user: null, total_points: 0 };
  let total = Number(user.exploring_points || 0);
  if (total === 0) {
    const visits = await UserExploringSpotModel.find({
      user_id: new ObjectId(userId),
      status: "checked_in",
    });
    const summed = visits.reduce(
      (sum, visit) => sum + Number(visit.points_awarded || 0),
      0
    );
    if (summed > 0) {
      user.exploring_points = summed;
      await user.save();
      total = summed;
    }
  }
  return { user, total_points: total };
};

const checkInExploringSpot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    if (!ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid exploring spot id");
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return apiResponse.validationErrorWithData(res, "Valid latitude and longitude are required");
    }

    const spot = await ExploringSpotModel.findById(id);
    if (!spot || spot.status !== "active") {
      return apiResponse.notFoundResponse(res, "Exploring spot not found");
    }

    const km = distanceKm(spot, latitude, longitude);
    const radiusKm = (spot.radius_meters || 100) / 1000;
    if (km == null || km > radiusKm) {
      return apiResponse.forbiddenResponse(
        res,
        "You are not inside this exploring spot radius"
      );
    }

    let visit = await UserExploringSpotModel.findOne({
      user_id: new ObjectId(req.user.id),
      exploring_spot_id: spot._id,
    });
    const { user, total_points: currentTotal } = await getUserExploringTotal(req.user.id);
    if (!user) {
      return apiResponse.unauthorizedResponse(res, "User not found");
    }

    const collectedInCity = await getCollectedCountInCity(req.user.id, spot.city);
    if (visit?.status === "checked_in") {
      return apiResponse.successResponseWithData(res, "Spot already collected", {
        ...serializeSpot(spot, {
          distance_km: km,
          checked_in: true,
          collected: true,
        }),
        already_collected: true,
        points_awarded: 0,
        points_from_spot: visit.points_awarded || 0,
        total_points: currentTotal,
        city: spot.city || "",
        collected_in_city: collectedInCity,
        unlocked_rewards: [],
      });
    }

    const pointsFromSpot = spot.no_of_points || 0;
    if (!visit) {
      visit = new UserExploringSpotModel({
        user_id: req.user.id,
        exploring_spot_id: spot._id,
      });
    }
    visit.status = "checked_in";
    visit.checked_in_at = new Date();
    visit.last_entered_at = new Date();
    visit.points_awarded = pointsFromSpot;
    await visit.save();

    const previousCount = collectedInCity;
    const newCount = previousCount + 1;
    user.exploring_points = currentTotal + pointsFromSpot;
    await user.save();

    const unlockedRewards = await unlockExploringRewards(
      req.user.id,
      spot.city,
      previousCount,
      newCount
    );

    return apiResponse.successResponseWithData(res, "Exploring spot collected", {
      ...serializeSpot(spot, {
        distance_km: km,
        checked_in: true,
        collected: true,
      }),
      already_collected: false,
      points_awarded: pointsFromSpot,
      points_from_spot: pointsFromSpot,
      total_points: user.exploring_points,
      city: spot.city || "",
      collected_in_city: newCount,
      unlocked_rewards: unlockedRewards,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getMapExploringSpots = async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.latitude ?? req.body?.latitude);
    const longitude = parseFloat(req.query.longitude ?? req.body?.longitude);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
    const spots = await ExploringSpotModel.find({ status: "active" }).sort({
      created_at: -1,
    });
    const visits = await UserExploringSpotModel.find({
      user_id: new ObjectId(req.user.id),
    });
    const visitBySpot = {};
    visits.forEach((visit) => {
      visitBySpot[String(visit.exploring_spot_id)] = visit;
    });

    const data = spots.map((spot) => {
      const visit = visitBySpot[String(spot._id)];
      const collected = visit?.status === "checked_in";
      const km = hasCoords ? distanceKm(spot, latitude, longitude) : null;
      const radiusKm = (spot.radius_meters || 100) / 1000;
      const inRadius = km != null && km <= radiusKm;
      return serializeSpot(spot, {
        distance_km: km,
        in_radius: inRadius,
        collected,
        checked_in: collected,
        can_collect: inRadius && !collected,
      });
    });

    data.sort((a, b) => {
      if (a.distance_km == null && b.distance_km == null) return 0;
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      return a.distance_km - b.distance_km;
    });

    return apiResponse.successResponseWithData(
      res,
      data.length ? "Exploring spots found" : "No exploring spots found",
      data
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getMyExploringPoints = async (req, res, next) => {
  try {
    const { total_points } = await getUserExploringTotal(req.user.id);
    const collectedCount = await UserExploringSpotModel.countDocuments({
      user_id: new ObjectId(req.user.id),
      status: "checked_in",
    });
    const by_city = await getCollectedByCity(req.user.id);
    return apiResponse.successResponseWithData(res, "Exploring points found", {
      total_points,
      collected_spots: collectedCount,
      by_city,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getMyExploringRewards = async (req, res, next) => {
  try {
    const { total_points } = await getUserExploringTotal(req.user.id);
    const claimed = await UserRewardModel.find({
      user_id: new ObjectId(req.user.id),
    }).populate("reward_id");
    const rewards = claimed
      .map((item) => item.reward_id)
      .filter((reward) => reward && reward.reward_type === "exploring")
      .map(serializeReward);
    return apiResponse.successResponseWithData(res, "Exploring rewards found", {
      total_points,
      by_city: await getCollectedByCity(req.user.id),
      rewards,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getExploringRewards = async (req, res, next) => {
  try {
    const rewards = await RewardModel.find({
      status: "active",
      reward_type: "exploring",
    }).sort({ city: 1, spots_required: 1, reward_name: 1, created_at: -1 });
    return apiResponse.successResponseWithData(
      res,
      "Exploring rewards found",
      rewards
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createExploringReward = async (req, res, next) => {
  try {
    const canonicalCity = await resolveCanonicalCity(req.body.city);
    const spotsRequired = parseInt(
      req.body.spots_required || req.body.reward_limit,
      10
    );
    if (!canonicalCity) {
      return apiResponse.validationErrorWithData(
        res,
        "Select a city from existing exploring spots"
      );
    }
    if (!Number.isFinite(spotsRequired) || spotsRequired <= 0) {
      return apiResponse.validationErrorWithData(
        res,
        "spots_required is required"
      );
    }
    const crypes = parseInt(req.body.reward_crypes, 10);
    const createdItem = new RewardModel({
      city: canonicalCity,
      spots_required: spotsRequired,
      reward_name: spotsRequired,
      points_required: 0,
      reward_crypes: Number.isFinite(crypes) ? crypes : 0,
      reward_file: req.files?.reward_file ? req.files.reward_file[0].location : "",
      reward_type: "exploring",
    });
    await createdItem.save();
    return apiResponse.successResponseWithData(
      res,
      "Created successfully",
      createdItem
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getExploringCities = async (req, res, next) => {
  try {
    const cities = await getUniqueCities();
    return apiResponse.successResponseWithData(
      res,
      cities.length ? "Cities found" : "No exploring spot cities yet",
      cities
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getExploringRewardRules = async (req, res, next) => {
  try {
    const { total_points } = await getUserExploringTotal(req.user.id);
    const byCity = await getCollectedByCity(req.user.id);
    const collectedByCity = {};
    byCity.forEach((item) => {
      collectedByCity[item.city.toLowerCase()] = item.collected_spots;
    });
    const rewards = await RewardModel.find({
      status: "active",
      reward_type: "exploring",
    }).sort({ city: 1, spots_required: 1, reward_name: 1 });
    const rules = rewards.map((reward) => {
      const required = getSpotsRequired(reward);
      const collected =
        collectedByCity[String(reward.city || "").trim().toLowerCase()] || 0;
      return {
        id: reward._id,
        city: reward.city || "",
        spots_required: required,
        collected_in_city: collected,
        remaining: Math.max(required - collected, 0),
        unlocked: collected >= required,
      };
    });
    const cities = await getUniqueCities();
    return apiResponse.successResponseWithData(res, "Exploring reward rules found", {
      total_points,
      by_city: byCity,
      cities,
      rules,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateExploringReward = async (req, res, next) => {
  try {
    const updated = await RewardModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Reward not found");
    }
    return apiResponse.successResponse(res, "Reward updated");
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const notifyNearbyExploringSpots = async (req, res, next) => {
  try {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return apiResponse.validationErrorWithData(res, "Valid latitude and longitude are required");
    }

    const spots = await findNearbySpotsForUser(req.user.id, latitude, longitude);
    const toNotify = [];
    for (const spot of spots) {
      if (!spot.should_notify) continue;
      await UserExploringSpotModel.findOneAndUpdate(
        {
          user_id: new ObjectId(req.user.id),
          exploring_spot_id: spot.id,
        },
        {
          user_id: req.user.id,
          exploring_spot_id: spot.id,
          last_notified_at: new Date(),
          last_entered_at: new Date(),
          status: "notified",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      toNotify.push({
        ...spot,
        push_title: "Exploring Spot nearby",
        push_body: `You are near ${spot.spot_name}${spot.city ? ` in ${spot.city}` : ""}.`,
      });
    }

    if (toNotify.length) {
      const first = toNotify[0];
      sendPushToUser(req.user.id, {
        title: first.push_title,
        body: first.push_body,
        data: {
          type: "exploring_spot_nearby",
          exploring_spot_id: first.id,
          city: first.city || "",
          is_ar: Boolean(first.is_ar),
          latitude: first.latitude,
          longitude: first.longitude,
        },
      }).catch((err) => logger.error(err));
    }

    return apiResponse.successResponseWithData(
      res,
      toNotify.length ? "Push payloads ready" : "No new nearby notifications",
      toNotify
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

module.exports = {
  createExploringSpot,
  createExploringSpotByUser,
  editExploringSpot,
  deleteExploringSpot,
  getAllExploringSpots,
  getExploringSpotById,
  getNearbyExploringSpots,
  checkInExploringSpot,
  notifyNearbyExploringSpots,
  getMapExploringSpots,
  getMyExploringPoints,
  getMyExploringRewards,
  getExploringRewards,
  getExploringRewardRules,
  getExploringCities,
  createExploringReward,
  updateExploringReward,
};
