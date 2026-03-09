const express = require("express");
const router = express.Router();
const moderationController = require("../controllers/moderationController");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");

// Tất cả endpoints moderation dành cho Admin/Editor
router.use(verifyToken);
router.use(authorizeRoles("admin", "editor"));

router.get("/pending", moderationController.getPending);
router.put("/:id", moderationController.updateStatus);

module.exports = router;
