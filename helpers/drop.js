const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const haversine = require('haversine');
const UserDropModel = require("../src/v1/models/userdrop.model");

module.exports.getAllDrops = async function (data, user_id, latitude, longitude) {
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
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 10) {
                        const userDrops = await UserDropModel.findOne({ drop_id: new ObjectID(element?._id), user_id: new ObjectID(user_id) });
                        var el = {
                            id: element._id,
                            drop_name: element.drop_name,
                            location: element.location,
                            drop_description: element.drop_description,
                            mythica_ID: element.mythica_ID?.creature_name,
                            mythica_reward: element.mythica_reward?.creature_name,
                            status: element.status,
                            drop_status: userDrops ? userDrops?.status : 'open'
                        }

                        result.push(el)
                    }

                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}
