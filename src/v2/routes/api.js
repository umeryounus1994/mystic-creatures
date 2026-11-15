const express = require("express");

const app = express();
const adventureRoute = require("./adventure.route");
const huntRoute = require("./hunt.route");
const missionRoute = require("./mission.route");

app.use("/adventure/", adventureRoute);
app.use("/hunt/", huntRoute);
app.use("/mission/", missionRoute);

module.exports = app;
