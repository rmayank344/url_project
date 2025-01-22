const express = require("express");
const router = new express.Router();

const {register_route, login_route} = require('../controller/authentication');

// Register Routes
router.post('/register', register_route);

// Login Routes
router.post('/login', login_route);

module.exports = router;