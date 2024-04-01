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
app.use(rateLimiter);

app.disable("x-powered-by");

// Apply security headers using helmet middleware
app.use(
  helmet({
    xssFilter: true,
  })
);

// Middleware to remove excessive headers
app.use((req, res, next) => {
  res.removeHeader("Server");
  res.removeHeader("X-Powered-By");
  res.removeHeader("X-RateLimit-Limit");
  res.removeHeader("X-RateLimit-Remaining");
  res.removeHeader("X-RateLimit-Reset");
  next();
});


// Increase the request body size limit
app.use(bodyParser.urlencoded({ extended: true, limit: "16mb" }));

// Parse request body as JSON
app.use(bodyParser.json());

// Attach sanitizer middleware
app.use(sanitize);

// app.use(express.static(path.join(__dirname, 'public')));
app.use("/public", express.static(path.join(__dirname, "public")));

const corsConfig = {
  credentials: true,
  origin: true,
  exposedHeaders: ["Authorization"],
};
app.use(cors(corsConfig));

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
