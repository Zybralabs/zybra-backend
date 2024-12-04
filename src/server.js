import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan"; // For request logging
import dotenv from "dotenv"; // For environment variable management

// Route imports
import AuthRouter from "./routes/auth.routes.js";
import UserRouter from "./routes/user.routes.js"; // Import user routes
import AdminRouter from "./routes/admin.routes.js"; // Import user routes

// Load environment variables
dotenv.config();

/**
 * Initialize express app
 */
const app = express();

/**
 * CORS setup
 */
const whitelist = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  process.env.FRONTEND_URL, // Allow dynamic frontend URL via env variable
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));

/**
 * Middleware for parsing requests
 */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Security headers using Helmet
 */
if (process.env.NODE_ENV === "production") {
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
}

/**
 * Logger setup
 */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // Log requests in development mode
}

/**
 * Health check route
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    message: "Server is running smoothly",
  });
});

/**
 * Register API routes
 */
app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/users", UserRouter); // User-related endpoints
app.use("/api/v1/admin", AdminRouter); // User-related endpoints

/**
 * Base route
 */
app.get("/", (req, res) =>
  res.status(200).send("Welcome to the Application Server")
);

/**
 * Catch 404 errors
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

/**
 * Centralized error handling
 */
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  const status = err.status || 500;
  const message = err.message || "Something went wrong!";
  res.status(status).json({
    status: "error",
    message,
  });
});

/**
 * Export express app instance
 */
export default app;
