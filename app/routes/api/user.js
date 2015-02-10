var express = require('express');
var user = require('../../controllers/user');
var ensureAdmin = require('../helpers').ensureAdmin;

var router = express.Router();

router.route('/')
    .get(ensureAdmin, user.list)
    .post(ensureAdmin, user.create);

module.exports = router;