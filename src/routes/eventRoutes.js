const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const { createEventSchema, updateEventSchema, updateEventStatusSchema } = require("../validators/eventValidator");

router.post("/", verifyToken, authorizeRoles("admin", "editor", "member"), validate(createEventSchema), eventController.createEvent);
router.get("/", verifyToken, eventController.listEvents);
router.get("/:id", verifyToken, eventController.getEvent);
router.put("/:id", verifyToken, authorizeRoles("admin", "editor", "member"), validate(updateEventSchema), eventController.updateEvent);
router.put("/:id/status", verifyToken, authorizeRoles("admin", "editor"), validate(updateEventStatusSchema), eventController.updateEventStatus);
router.delete("/:id", verifyToken, authorizeRoles("admin", "editor", "member"), eventController.deleteEvent);

// Registration routes
router.post("/:id/register", verifyToken, authorizeRoles("admin", "editor", "member"), eventController.registerForEvent);
router.put("/:id/participants/:userId/status", verifyToken, authorizeRoles("admin", "editor", "member"), eventController.updateParticipantStatus);

module.exports = router;
