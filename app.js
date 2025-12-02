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

// Configure body parser with increased limits and error handling
// Use express.json() OR bodyParser.json(), not both (express.json() is recommended)
app.use(express.json({ 
  limit: '300mb',
  verify: (req, res, buf) => {
    // Only parse if Content-Type is JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        JSON.parse(buf);
      } catch (e) {
        // If JSON is invalid, don't throw here - let it be handled by error middleware
      }
    }
  }
}));

app.use(express.urlencoded({ 
  limit: '250mb', 
  extended: true 
}));

// Remove bodyParser.json() - express.json() already handles this
// Only keep bodyParser.urlencoded if you need it for form submissions
// app.use(bodyParser.json({ limit: '300mb' }));
// app.use(bodyParser.urlencoded({
//     extended: true,
//     limit: '250mb'
// }));

// Error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: false,
      message: 'Invalid JSON in request body',
      error: err.message
    });
  }
  next(err);
});

app.use(cors());

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
