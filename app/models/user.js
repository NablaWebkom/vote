var _ = require('lodash');
var Bluebird = require('bluebird');
var passportLocalMongoose = require('passport-local-mongoose');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: {
        type: String,
        index: true,
        required: true,
        unique: true
    },
    active: {
        type: Boolean,
        default: true
    },
    admin: {
        type: Boolean,
        default: false
    }
});

userSchema.methods.getCleanUser = function() {
    var user = _.omit(this.toObject(), 'password', 'hash', 'salt');
    return user;
};

if (['test', 'development'].indexOf(process.env.NODE_ENV) !== -1) {
    userSchema.plugin(passportLocalMongoose, {
        iterations: 1
    });
} else {
    userSchema.plugin(passportLocalMongoose);
}

module.exports = Bluebird.promisifyAll(mongoose.model('User', userSchema));
