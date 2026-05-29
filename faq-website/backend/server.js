const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const discussionRoutes = require("./routes/discussionRoutes");
const answerRoutes = require("./routes/answerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();
const server = http.createServer(app);

// ── Socket.IO setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// Inject io into notification service
try {
  const notificationService = require("./services/notification.service");
  notificationService.setSocketIO(io);
} catch (e) {
  console.error("[Socket.IO] Could not inject io into notification service:", e.message);
}

// Track online users (socketId → userId)
const onlineUsers = new Map(); // socketId → userId

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // User joins their personal notification room
  socket.on("user:join", ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    onlineUsers.set(socket.id, userId.toString());
    console.log(`[Socket.IO] User ${userId} joined room user:${userId}`);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

/* =========================
   MIDDLEWARE
========================= */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log(`[STARTUP] Configured Allowed Origins:`, allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[CORS FAILURE] Origin not allowed: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
  })
);

app.options(/.*/, cors()); // Enable pre-flight for all routes

app.use(express.json());

/* =========================
   ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/faqs", require("./routes/faqRoutes"));
app.use("/api/discussions", discussionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/golden-tickets", require("./routes/goldenTicketRoutes"));
app.use("/api/personal-issues", require("./routes/personalIssueRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/intelligence", require("./routes/intelligenceRoutes"));
app.use("/api/notifications", notificationRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use(errorMiddleware);

/* =========================
   DATABASE CONNECTION
========================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    /* =========================
       FAQ WORDCOUNT MIGRATION
    ========================= */

    try {
      const FAQ = require("./models/FAQ");

      const faqsToMigrate = await FAQ.find({
        wordCount: { $exists: false },
      });

      if (faqsToMigrate.length > 0) {
        console.log(
          `[MIGRATION] Migrating ${faqsToMigrate.length} legacy FAQs...`
        );

        for (const faq of faqsToMigrate) {
          await faq.save();
        }

        console.log("[MIGRATION] FAQ migration complete.");
      }
    } catch (migErr) {
      console.error("[MIGRATION ERROR] FAQ migration failed:", migErr);
    }

    /* =========================
       PIZZA SLICES MIGRATION
    ========================= */

    try {
      const User = require("./models/User");

      const usersToMigrate = await User.find({
        pizzas: { $gt: 0 },
        pizzaSlices: 0,
      });

      if (usersToMigrate.length > 0) {
        console.log(
          `[MIGRATION] Migrating ${usersToMigrate.length} users...`
        );

        for (const user of usersToMigrate) {
          user.pizzaSlices = (user.pizzas || 0) * 6;
          user.pizzas = 0;

          await user.save();
        }

        console.log("[MIGRATION] Pizza slice migration complete.");
      }
    } catch (migErr) {
      console.error(
        "[MIGRATION ERROR] Pizza slice migration failed:",
        migErr
      );
    }

    /* =========================
       CATEGORY SYNC
    ========================= */

    try {
      const Category = require("./models/Category");
      const { FAQ_CATEGORIES } = require("./utils/constants");

      for (const name of FAQ_CATEGORIES) {
        await Category.findOneAndUpdate(
          { name },
          { name, isActive: true },
          { upsert: true }
        );
      }

      console.log("[MIGRATION] Categories synced.");
    } catch (migErr) {
      console.error("[MIGRATION ERROR] Category sync failed:", migErr);
    }

    /* =========================
       HASHTAG BACKFILL
    ========================= */

    try {
      const runBackfill = require("./scripts/backfillHashtags");

      await runBackfill();

      console.log("[MIGRATION] Hashtag backfill complete.");
    } catch (migErr) {
      console.error("[MIGRATION ERROR] Hashtag backfill failed:", migErr);
    }

    /* =========================
       START SERVER
    ========================= */

    const PORT = process.env.PORT || 3001;

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });

module.exports = { io }; // exported for testing/admin use