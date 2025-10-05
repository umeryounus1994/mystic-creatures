const ObjectID = require('mongodb').ObjectId;
const haversine = require('haversine');
const UserMysteryBagModel = require("../src/v1/models/usermysterybag.model");

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
                    
                    if (locationDistance < element.visibility_radius) {
                        const userInteraction = await UserMysteryBagModel.findOne({ 
                            mystery_bag_id: new ObjectID(element._id), 
                            user_id: new ObjectID(user_id) 
                        });
                        
                        var bagData = {
                            id: element._id,
                            bag_title: element.bag_title,
                            bag_description: element.bag_description,
                            bag_type: element.bag_type,
                            location: element.location,
                            created_by: element.created_by?.username,
                            distance: Math.round(locationDistance * 100) / 100,
                            interaction_status: userInteraction ? userInteraction.status : null,
                            can_interact: !userInteraction
                        };
                        
                        result.push(bagData);
                    }
                    resolvve();
                })
            );
        });
        
        Promise.all(promiseArr).then(() => {
            resolve(result);
        });
    });
};