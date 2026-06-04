const express = require('express');
const router  = express.Router();
const { performSearch, getSuggestions, getPopularSearches } = require('../controllers/searchController');

router.get('/',            performSearch);
router.get('/suggest',     getSuggestions);
router.get('/popular',     getPopularSearches);

module.exports = router;