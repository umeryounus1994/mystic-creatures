const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const haversine = require('haversine');
const UserDropModel = require("../src/v1/models/userdrop.model");
const DropQuizModel = require("../src/v1/models/dropquiz.model");

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
                    if (locationDistance < 2) {
                        const userDrops = await UserDropModel.findOne({ drop_id: new ObjectID(element?._id), user_id: new ObjectID(user_id) });
                        var findDropQuiz = await DropQuizModel.find({drop_id: new ObjectID(element._id)})
                        var el = {
                            id: element._id,
                            drop_name: element.drop_name,
                            location: element.location,
                            drop_description: element.drop_description,
                            reward_file: element.reward_file,
                            mythica_ID_name: element.mythica_ID?.creature_name,
                            mythica_ID: element.mythica_ID?.creature_id,
                            mythica_reward_name: element.mythica_reward?.creature_name,
                            mythica_reward_ID: element.mythica_reward?.creature_id,
                            status: element.status,
                            drop_status: userDrops ? userDrops?.status : 'open',
                            quiz_options: findDropQuiz
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
