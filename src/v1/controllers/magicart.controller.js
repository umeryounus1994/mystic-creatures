const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const UserMysteryBagModel = require("../models/usermysterybag.model");

/**
 * Personal Magic Art Gallery — drawings the logged-in user collected from the map
 * (other players' mystery bags / drawings), not their own creations.
 */
const getCollectedMagicArt = async (req, res, next) => {
  try {
    const interactions = await UserMysteryBagModel.find({
      user_id: new ObjectId(req.user.id),
      status: "collected",
    })
      .populate({
        path: "mystery_bag_id",
        populate: {
          path: "created_by",
          select: "username",
        },
      })
      .sort({ created_at: -1 })
      .lean();

    const collectedArts = interactions
      .filter((item) => item.mystery_bag_id && item.mystery_bag_id.drawing_file)
      .map((item) => {
        const bag = item.mystery_bag_id;
        return {
          art_id: String(bag._id),
          drawing_file_url: bag.drawing_file || "",
          creator_username: bag.created_by?.username || "",
          collected_at: item.created_at,
          reward_points: bag.reward_points != null ? bag.reward_points : 0,
          reward_file: bag.reward_file || "",
          bag_title: bag.bag_title || "",
          bag_type: bag.bag_type || "collectible",
        };
      });

    return res.status(200).json({
      status: true,
      success: true,
      message:
        collectedArts.length > 0
          ? "Collected magic art retrieved"
          : "No collected magic art found",
      collected_arts: collectedArts,
      data: collectedArts,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCollectedMagicArt,
};
