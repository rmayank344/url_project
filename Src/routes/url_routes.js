const express = require("express");
const router = new express.Router();

const {
  create_short_url,
  redirect_short_url,
  get_url_analytics,
  get_topic_based_analytics,
  get_overall_analytics
} = require('../controller/create_short_url');

router.post('/shorten', create_short_url);
router.get('/shorten/:alias', redirect_short_url);
router.get('/analytics/:alias', get_url_analytics);
router.get('/analytics/topic/:topic', get_topic_based_analytics);
router.get('/analytics/overall/:userId', get_overall_analytics);

module.exports = router;