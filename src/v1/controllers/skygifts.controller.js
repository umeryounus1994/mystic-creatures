/* eslint-disable no-param-reassign */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const SkyGiftModel = require("../models/skygifts.model");
const logger = require('../../../middlewares/logger');
const UserSkyGiftModel = require("../models/userskygifts.model");
const TransactionModel = require("../models/transactions.model");
const haversine = require('haversine');

const createSkyGift = async (req, res, next) => {
  try {
    const { ...giftDetails } = req.body;

    var location = { type: 'Point', coordinates: [req.body?.latitude, req.body?.longitude] };
    giftDetails.location = location;
    giftDetails.reward_file = req.files['reward'] ? req.files['reward'][0].location : ""
    giftDetails.created_by = req.user.id;
    
    const createdGift = new SkyGiftModel(giftDetails);

    createdGift.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Sky gift created successfully",
        createdGift
      );
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const editSkyGift = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ...giftDetails } = req.body;
        
        const existingGift = await SkyGiftModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingGift) {
            return apiResponse.notFoundResponse(res, "Sky gift not found or unauthorized!");
        }
        
        if (req.body.latitude && req.body.longitude) {
            giftDetails.location = { 
                type: 'Point', 
                coordinates: [req.body.latitude, req.body.longitude] 
            };
        }
        
        if (req.files && req.files['reward']) {
            giftDetails.reward_file = req.files['reward'][0].location;
        }
        
        const updatedGift = await SkyGiftModel.findByIdAndUpdate(
            id,
            giftDetails,
            { new: true }
        );
        
        return apiResponse.successResponseWithData(
            res,
            "Sky gift updated successfully",
            updatedGift
        );
    } catch (err) {
        logger.error(err);
        next(err);
    }
};

const getAllSkyGifts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const skyGifts = await SkyGiftModel.find({status: 'active'})
    .populate([
      {
          path: 'mythica_reward', select: { creature_name: 1 }
      }
    ])
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await SkyGiftModel.countDocuments({status: 'active'});
    
    return apiResponse.successResponseWithData(
        res,
        "Sky gifts retrieved successfully",
        {
            gifts: skyGifts,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        }
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const deleteSkyGift = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        const existingGift = await SkyGiftModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingGift) {
            return apiResponse.notFoundResponse(res, "Sky gift not found or unauthorized!");
        }
        
        await SkyGiftModel.findByIdAndUpdate(
            id,
            { status: 'deleted' },
            { new: true }
        );
        
        return apiResponse.successResponse(
            res,
            "Sky gift deleted successfully"
        );
    } catch (err) {
        logger.error(err);
        next(err);
    }
};

const getSingleSkyGift = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        const skyGift = await SkyGiftModel.findOne({ 
            _id: new ObjectId(id),
            status: 'active'
        }).populate([
            {
                path: 'mythica_reward', select: { creature_name: 1 }
            },
            {
                path: 'created_by', select: { username: 1 }
            }
        ]);
        
        if (!skyGift) {
            return apiResponse.notFoundResponse(res, "Sky gift not found!");
        }
        
        return apiResponse.successResponseWithData(
            res,
            "Sky gift retrieved successfully",
            skyGift
        );
    } catch (err) {
        logger.error(err);
        next(err);
    }
};

const claimSkyGift = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        const skyGift = await SkyGiftModel.findOne({ 
            _id: new ObjectId(id),
            status: 'active'
        });
        
        if (!skyGift) {
            return apiResponse.notFoundResponse(res, "Sky gift not found!");
        }
        
        // Check if user already claimed this sky gift
        const existingClaim = await UserSkyGiftModel.findOne({ 
            user_id: new ObjectId(req.user.id), 
            sky_gift_id: new ObjectId(id) 
        });
        
        if (existingClaim) {
            return apiResponse.ErrorResponse(res, "Sky gift already claimed");
        }
        
        // Create user sky gift entry
        const userSkyGift = new UserSkyGiftModel({
            sky_gift_id: id,
            user_id: req.user.id,
            status: 'claimed'
        });
        
        await userSkyGift.save();
        
        // Create transaction entry
        const transaction = new TransactionModel({
            user_id: req.user.id,
            sky_gift_id: id,
            mythica_distinguisher: generateUniqueID()
        });
        
        await transaction.save();
        
        const reward = {
            gift_name: skyGift.gift_name,
            gift_description: skyGift.gift_description,
            reward_file: skyGift.reward_file || "",
            no_of_xp: skyGift.no_of_xp || 0,
            sponsor_name: skyGift.sponsor_name || "",
            mythica_reward: skyGift.mythica_reward
        };
        
        return apiResponse.successResponseWithData(
            res,
            "Sky gift claimed successfully",
            reward
        );
    } catch (err) {
        logger.error(err);
        next(err);
    }
};
function generateUniqueID() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 6; // You can adjust the length as needed
  let uniqueID = '';
  
  for (let i = 0; i < length; i++) {
    uniqueID += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return uniqueID;
}

const getNearbySkygifts = async (req, res, next) => { 
    try {
        if (req.body.latitude == undefined || req.body.longitude == undefined) {
            return apiResponse.ErrorResponse(
                res,
                "Lat, Long is required"
            );
        }
        
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
        
        const skyGifts = await SkyGiftModel.find({status: 'active'})
            .populate([
                {
                    path: 'mythica_reward', select: { creature_name: 1, creature_id: 1 }
                },
                {
                    path: 'created_by', select: { username: 1 }
                }
            ])
            .sort({ created_at: -1 });
        
        const nearbyGifts = [];
        
        for (const gift of skyGifts) {
            const giftLocation = {
                latitude: gift.location.coordinates[0],
                longitude: gift.location.coordinates[1]
            };
            
            const userLocation = {
                latitude: latitude,
                longitude: longitude
            };
            
            const distance = haversine(userLocation, giftLocation, { unit: 'km' });
            
            if (distance <= 10) {
                // Check if user already claimed this gift
                const userClaim = await UserSkyGiftModel.findOne({ 
                    sky_gift_id: new ObjectId(gift._id), 
                    user_id: new ObjectId(req.user.id) 
                });
                
                const giftData = {
                    id: gift._id,
                    gift_name: gift.gift_name,
                    gift_description: gift.gift_description,
                    gift_type: gift.gift_type,
                    location: gift.location,
                    reward_file: gift.reward_file,
                    mythica_reward_name: gift.mythica_reward?.creature_name,
                    mythica_reward_ID: gift.mythica_reward?.creature_id,
                    status: gift.status,
                    claim_status: userClaim ? 'claimed' : 'available',
                    distance: Math.round(distance * 100) / 100,
                    created_at: gift.created_at
                };
                
                nearbyGifts.push(giftData);
            }
        }
        
        return res.json({
            status: nearbyGifts.length > 0 ? true : false,
            message: nearbyGifts.length > 0 ? "Nearby sky gifts found" : "No sky gifts found nearby",
            data: nearbyGifts
        });
    } catch (err) {
        logger.error(err);
        next(err);
    }
};

module.exports = {
    createSkyGift,
    editSkyGift,
    getAllSkyGifts,
    deleteSkyGift,
    getSingleSkyGift,
    claimSkyGift,
    getNearbySkygifts
};
