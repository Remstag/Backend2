const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

// Admin broadcast
router.post("/broadcast", verifyToken, authorizeRoles("admin"), notificationController.broadcast);

// IMPORTANT: Specific routes MUST come before parameterized routes (:id)
// User: get unread count
router.get("/unread-count", verifyToken, notificationController.getUnreadCount);
// User: mark all as read
router.put("/mark-all-read", verifyToken, notificationController.markAllRead);
// User: mark one as read
router.put("/:id/read", verifyToken, notificationController.markRead);
// User: get my notifications
router.get("/", verifyToken, notificationController.getMyNotifications);

module.exports = router;
