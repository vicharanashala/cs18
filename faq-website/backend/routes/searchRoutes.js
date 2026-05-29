const express = require('express');
const router  = express.Router();
const { performSearch, getSuggestions } = require('../controllers/searchController');

router.get('/',         performSearch);
router.get('/suggest',  getSuggestions);

module.exports = router;