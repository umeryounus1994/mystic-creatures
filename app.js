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

// Configure CORS with explicit origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'https://app.mycrebooking.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      // Add other allowed origins here
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In production, you might want to be more strict
      // For now, allow all origins (you can change this)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

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

// Additional CORS headers (backup - cors middleware should handle this, but keeping for compatibility)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://app.mycrebooking.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  if (origin && (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development')) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Expose-Headers", "Authorization");
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
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
