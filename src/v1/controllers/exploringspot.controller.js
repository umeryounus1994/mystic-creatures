const { ObjectId } = require("mongodb");
const haversine = require("haversine");
const apiResponse = require("../../../helpers/apiResponse");
const ExploringSpotModel = require("../models/exploringspot.model");
const UserExploringSpotModel = require("../models/userexploringspot.model");
const logger = require("../../../middlewares/logger");

const NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000;

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
      city: req.body.city || "",
      radius_meters: Number.isFinite(radius) && radius > 0 ? radius : 100,
      no_of_points: Number.isFinite(points) && points > 0 ? points : 1,
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

const createExploringSpotByUser = async (req, res, next) => {
  try {
    const built = buildSpotFromBody(req, "user");
    if (built.error) {
      return apiResponse.validationErrorWithData(res, built.error);
    }
    if (!built.spot.spot_name) {
      return apiResponse.validationErrorWithData(res, "Spot name is required");
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
    if (req.body.city !== undefined) update.city = req.body.city;
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
          should_notify:
            !visit?.last_notified_at || Date.now() - lastNotified >= NOTIFY_COOLDOWN_MS,
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

    if (visit?.status === "checked_in") {
      return apiResponse.successResponseWithData(res, "Already checked in", {
        ...serializeSpot(spot, { distance_km: km, checked_in: true }),
        points_awarded: visit.points_awarded,
      });
    }

    if (!visit) {
      visit = new UserExploringSpotModel({
        user_id: req.user.id,
        exploring_spot_id: spot._id,
      });
    }
    visit.status = "checked_in";
    visit.checked_in_at = new Date();
    visit.last_entered_at = new Date();
    visit.points_awarded = spot.no_of_points || 0;
    await visit.save();

    return apiResponse.successResponseWithData(res, "Checked in to exploring spot", {
      ...serializeSpot(spot, { distance_km: km, checked_in: true }),
      points_awarded: visit.points_awarded,
    });
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
};
