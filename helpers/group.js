const ObjectID = require('mongodb').ObjectId;
const GroupUserModel = require("../src/v1/models/groupusers.model");
const UserModel = require("../src/v1/models/user.model");

module.exports.getAllMyGroups = async function (groupusers) {
    try{
        const promises = groupusers.map(async element => {
            let groups = await GroupUserModel.find({ group_id: new ObjectID(element?.group_id?._id) })
                .populate([
                    {
                        path: 'friend_id',
                        select: { username: 1, image: 1 }
                    }
                ]);
                let group_admin = await UserModel.findOne({ _id: new ObjectID(element?.group_id?.group_creater) });
            var group_members = [];
            groups.forEach(el => {
                var gp = {
                    member_id: el?.friend_id?._id,
                    member_username: el?.friend_id?.username,
                    member_image: el?.friend_id?.image
                }
                group_members.push(gp);
            });
            return {
                group_id: element?.group_id?._id,
                group_name: element?.group_id?.group_name,
                group_icon: element?.group_id?.group_icon,
                group_admin: element?.group_id?.group_creater,
                group_admin_name: group_admin?.username,
                members: group_members
            };
        });
        // Resolving all promises
        const result = await Promise.all(promises);
        return result;
    } catch(ex){
        console.log(ex)
    }
  
}