const ObjectID = require('mongodb').ObjectId;
const GroupUserModel = require("../src/v1/models/groupusers.model");


module.exports.getAllMyGroups = async function (groupusers) {
    try{
        var result = [];
        groupusers.forEach(element => {
        //     let groups = await GroupUserModel.find({group_id: new ObjectID(element?.group_id?._id)})
        //   .populate([
        //     {
        //         path: 'friend_id', select: { username: 1, image: 1 }
        //     }
        //   ]);
          console.log(groups)
            var op = {
             group_id: element?.group_id?._id,
             group_name: element?.group_id?.group_name,
             group_icon: element?.group_id?.group_icon,
            // members: groups
            }; 
            result.push(op);
         });
         return result;
    } catch(ex){
        console.log(ex)
    }
  
}