const express = require("express");

const app = express();
const userRoute = require("./user.route");
const adminRoute = require("./admin.route");
const questRoute = require("./quest.route");

const filehandlingRoute = require("./filehandling.route");

// End Points of Api
app.use("/user/", userRoute);
app.use("/admin/", adminRoute);
app.use("/quest/", questRoute);
app.use("/fileupload/", filehandlingRoute);

module.exports = app;
