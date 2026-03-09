const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const { verifyToken } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const { searchSchema } = require("../validators/searchValidator");

router.get("/persons", verifyToken, validate(searchSchema, "query"), searchController.searchPersons);
router.get("/events", verifyToken, validate(searchSchema, "query"), searchController.searchEvents);
router.get("/branches", verifyToken, validate(searchSchema, "query"), searchController.searchBranches);

module.exports = router;
