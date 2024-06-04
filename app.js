/* eslint-disable no-console */
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");

const { rateLimiter } = require("./middlewares/rateLimiter");
const { sanitize } = require("./middlewares/sanitizerMiddleware");

const app = express();


// Apply the rate limiting middleware to all requests
//app.use(rateLimiter);

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({
    extended: false
}));

// Apply security headers using helmet middleware
// app.use(
//   helmet({
//     xssFilter: true,
//   })
// );

// Middleware to remove excessive headers
// app.use((req, res, next) => {
//   res.removeHeader("Server");
//   res.removeHeader("X-Powered-By");
//   res.removeHeader("X-RateLimit-Limit");
//   res.removeHeader("X-RateLimit-Remaining");
//   res.removeHeader("X-RateLimit-Reset");
//   next();
// });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.json({limit: '300mb', extended: true}));
app.use(express.urlencoded({limit: '250mb', extended: true }));

// Attach sanitizer middleware
//app.use(sanitize);

// app.use(express.static(path.join(__dirname, 'public')));
app.use("/public", express.static(path.join(__dirname, "public")));


const { connectDB } = require("./config/connectDB.config");
const indexRouter = require("./src/v1/routes");
const apiRouter = require("./src/v1/routes/api");
const apiResponse = require("./helpers/apiResponse");

connectDB();


app.use("/", indexRouter);
app.use("/api/v1/", apiRouter);


app.all("*", (req, res) =>
  apiResponse.notFoundResponse(res, "Route Not found", "Route not found")
);



const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
