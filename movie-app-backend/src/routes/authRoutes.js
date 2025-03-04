const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { checkNotAuthenticated } = require("../middlewares/authMiddleware");

router.post("/register", checkNotAuthenticated, authController.register);
router.post("/login", checkNotAuthenticated, authController.login);

module.exports = router;
