var Bluebird = require('bluebird');
var mongoose = require('mongoose');
var User = require('../models/user');
var errors = require('../errors');
var errorChecks = require('../errors/error-checks');
var AuthenticationError = require('passport-local-mongoose').errors.AuthenticationError;

var authenticate = Bluebird.promisify(User.authenticate());

exports.count = function(req, res, next) {
    var query = { admin:false };
    if (req.query.active === 'true') {
        query.active = true;
    } else if (req.query.active === 'false') {
        query.active = false;
    }

    return User.count(query)
        .then(function(count) {
            return res.json({
                users: count
            });
        })
        .catch(next);
};

exports.list = function(req, res, next) {
    return User.find({}, 'username admin active')
        .then(function(users) {
            return res.json(users);
        })
        .catch(next);
};

exports.create = function(req, res, next) {
    var user = new User(req.body);
    User.register(user, req.body.password)
        .then(function(createdUser) {
            return res.status(201).json(createdUser.getCleanUser());
        })
        .catch(mongoose.Error.ValidationError, function(err) {
            console.log('catcha ja', err);
            throw new errors.ValidationError(err.errors);
        })
        .catch(errorChecks.DuplicateError, function(err) {
            throw new errors.DuplicateCardError();
        })
        .catch(errorChecks.BadRequestError, function(err) {
            throw new errors.InvalidRegistrationError(err.message);
        })
        .catch(AuthenticationError, function(err) {
            err.status = 400;
            throw err;
        })
        .catch(next);
};

exports.toggleActive = function(req, res, next) {
    User.findOne({cardKey: req.params.cardKey})
        .then(function(user) {
            if (!user) {
                throw new errors.NotFoundError('user');
            }
            user.active = !user.active;
            return user.save();
        })
        .then(function(user) {
            return res.json(user);
        })
        .catch(next);
};

exports.changeCard = function(req, res, next) {
    authenticate(req.params.username, req.body.password)
        .then(function(user) {
            // User.authenticate returns a [false, { message: 'errmessage' }] when
            // bad credentials are given
            if (Array.isArray(user)) {
                throw new errors.InvalidRegistrationError('Incorrect username and/or password.');
            }

            user.cardKey = req.body.cardKey;
            return user.save();
        })
        .then(function(user) {
            res.json(user);
        })
        .catch(errorChecks.DuplicateError, function() {
            throw new errors.DuplicateCardError();
        })
        .catch(next);
};

exports.deleteAllNonAdmin = function(req, res, next) {
    return User.remove({admin: false})
        .then(function(result) {
            return res.json({
                status: 200,
                message: 'All users have been deleted!'
            });
        })
        .catch(next);
};
