const ObjectID = require('mongodb').ObjectId;
const haversine = require('haversine');
const UserMysteryBagModel = require("../src/v1/models/usermysterybag.model");
const MysteryBagQuizModel = require("../src/v1/models/mysterybagquiz.model");

module.exports.getNearbyMysteryBags = async function (data, user_id, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.location.coordinates[0],
                        longitude: element.location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' });
                    
                    if (locationDistance <= element.visibility_radius) {
                        // Check if user already interacted
                        const userInteraction = await UserMysteryBagModel.findOne({ 
                            mystery_bag_id: new ObjectID(element._id),
                            user_id: new ObjectID(user_id) 
                        });
                        
                        // Get quiz questions
                        const quizQuestions = await MysteryBagQuizModel.find({ 
                            mystery_bag_id: new ObjectID(element._id) 
                        });
                        
                        var el = {
                            id: element._id,
                            bag_title: element.bag_title,
                            bag_description: element.bag_description,
                            drawing_file: element.drawing_file,
                            reward_file: element.reward_file,
                            bag_type: element.bag_type,
                            location: element.location,
                            visibility_radius: element.visibility_radius,
                            created_by: element.created_by?.username,
                            created_at: element.created_at,
                            interaction_status: userInteraction ? userInteraction.status : null,
                            can_interact: !userInteraction,
                            distance: locationDistance,
                            clues: quizQuestions
                        };
                        
                        result.push(el);
                    }
                    
                    resolvve(result);
                })
            );
        });
        
        return Promise.all(promiseArr).then(ress => {
            resolve(result);
        });
    });
};
