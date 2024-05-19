const express = require("express");

const app = express();
const userRoute = require("./user.route");
const adminRoute = require("./admin.route");
const questRoute = require("./quest.route");
const missionRoute = require("./mission.route");
const huntRoute = require("./hunt.route");
const skillRoute = require("./skill.route");
const creatureRoute = require("./creature.route");
const dropRoute = require("./drop.route");

const filehandlingRoute = require("./filehandling.route");

// End Points of Api
app.use("/user/", userRoute);
app.use("/admin/", adminRoute);
app.use("/quest/", questRoute);
app.use("/mission/", missionRoute);
app.use("/hunt/", huntRoute);
app.use("/skill/", skillRoute);
app.use("/creature/", creatureRoute);
app.use("/drop/", dropRoute);
app.use("/fileupload/", filehandlingRoute);

module.exports = app;
