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
const friendRoute = require("./friend.route");
const groupRoute = require("./group.route");
const pictureRoute = require("./picturemystery.route");
const mysteryBagRoute = require("./mysterybag.route");
const skyGiftRoute = require("./skygifts.route");
const activityRoute = require("./activity.routes");
const bookingRoute = require("./booking.routes");
// Add these route imports
const paymentRoutes = require('./payment.route');
const webhookRoutes = require('./webhook.route');
const activityDropRoutes = require("./activitydrop.route");

const partnerEarningRoutes = require("./partner-earnings.route");

const filehandlingRoute = require("./filehandling.route");
const modelBagRoutes = require('./modelbag.route');
const stripeConnectRoutes = require('./stripeConnect.route');
const paypalPayoutRoutes = require('./paypalPayout.route');
const payoutRoutes = require('./payout.route');
const commissionRoutes = require('./commission.routes');

// End Points of Api
app.use("/user/", userRoute);
app.use("/admin/", adminRoute);
app.use("/quest/", questRoute);
app.use("/mission/", missionRoute);
app.use("/hunt/", huntRoute);
app.use("/skill/", skillRoute);
app.use("/creature/", creatureRoute);
app.use("/drop/", dropRoute);
app.use("/friend/", friendRoute);
app.use("/group/", groupRoute);
app.use("/pictureMystery/", pictureRoute);
app.use("/fileupload/", filehandlingRoute);
app.use("/mysteryBag/", mysteryBagRoute);
app.use("/skyGift/", skyGiftRoute);
app.use("/activity/", activityRoute);
app.use("/booking/", bookingRoute);
app.use("/activity-drop/", activityDropRoutes);


// Add these route handlers
app.use('/payment/', paymentRoutes);
app.use('/webhook/', webhookRoutes);

// Earning Routes
app.use('/partner-earnings/', partnerEarningRoutes);

// Model Bag Routes
app.use('/model-bag/', modelBagRoutes);

// Payout Routes
app.use('/stripe-connect/', stripeConnectRoutes);
app.use('/paypal-payout/', paypalPayoutRoutes);
app.use('/payout/', payoutRoutes);

// Commission Routes
app.use('/commission/', commissionRoutes);

module.exports = app;
