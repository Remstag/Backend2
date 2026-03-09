const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const { registerSchema, loginSchema, changePasswordSchema } = require("../validators/authValidator");

router.post("/register", verifyToken, authorizeRoles("admin"), validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/change-password", verifyToken, validate(changePasswordSchema), authController.changePassword);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
