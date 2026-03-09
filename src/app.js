const express = require("express"); // Trigger nodemon restart after DB logic fixes
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

// 1. Basic configuration & logging
app.set("trust proxy", 1);
app.use(morgan("dev"));
console.log("--- IDENTIFICATION: READY TO RUN SERVER IS ACTIVE ---");

// 2. CORS (Preflight should be handled ASAP)
// 2. CORS (Preflight should be handled ASAP)
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [];
console.log(">>> ALLOWED ORIGINS:", allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        console.log(`>>> Incoming CORS Request from: "${origin}"`);
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.trim().toLowerCase().replace(/\/$/, "");
        const cleanAllowed = allowedOrigins.map(o => o.trim().toLowerCase().replace(/\/$/, ""));

        if (cleanAllowed.length === 0 || cleanAllowed.includes(cleanOrigin) || cleanAllowed.includes("*")) {
            console.log(`>>> CORS APPROVED for: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`>>> CORS REJECTED for: ${origin}. Allowed:`, cleanAllowed);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "ngrok-skip-browser-warning"],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Manual logger for all requests to see the flow
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// 3. Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 4. Rate Limiting (Applied to /api/)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { success: false, message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 500,
    message: { success: false, message: "Too many login attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// 5. Parsers & Sanitization
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Custom NoSQL Injection sanitizer compatible with Express 5
// (express-mongo-sanitize v2.x is not compatible with Express 5)
function sanitizeValue(val) {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        for (const key of Object.keys(val)) {
            if (key.startsWith("$")) {
                delete val[key];
            } else {
                sanitizeValue(val[key]);
            }
        }
    } else if (Array.isArray(val)) {
        val.forEach(sanitizeValue);
    }
    return val;
}
app.use((req, res, next) => {
    if (req.body) sanitizeValue(req.body);
    if (req.params) sanitizeValue(req.params);
    next();
});

// Note: hpp was removed - incompatible with Express 5 (also reads req.query)

// 6. Static Files - serve uploaded media
const storageDir = path.join(__dirname, "..", "storage");
app.use("/storage", express.static(storageDir));

// Routes
const notificationRoutes = require("./routes/notificationRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const branchRoutes = require("./routes/branchRoutes");
const personRoutes = require("./routes/personRoutes");
const relationshipRoutes = require("./routes/relationshipRoutes");
const eventRoutes = require("./routes/eventRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const searchRoutes = require("./routes/searchRoutes");
const auditRoutes = require("./routes/auditRoutes");
const systemRoutes = require("./routes/systemRoutes");
const postRoutes = require("./routes/postRoutes");
const moderationRoutes = require("./routes/moderationRoutes");

app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/persons", personRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/medias", mediaRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/calendar", require("./routes/calendarRoutes"));
app.use("/api/audit", auditRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api", systemRoutes); // For /api/health

const { success } = require("./utils/responseHandler");
app.get("/", (req, res) => success(res, { ok: true, server: "READY_TO_RUN_FINAL" }));

// Error Handler
const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);

module.exports = app;
