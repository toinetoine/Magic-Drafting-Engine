var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
  username: String,
  password: String,
  drafts: [{ type: Schema.Types.ObjectId, ref: 'Draft' }],
});

var options = {
  errorMessages: {
    MissingPasswordError: 'No password was given',
    AttemptTooSoonError: 'Account is currently locked. Try again later',
    TooManyAttemptsError: 'Account locked due to too many failed login attempts',
    NoSaltValueStoredError: 'Authentication not possible. No salt value stored',
    IncorrectPasswordError: 'Password provided is incorrect',
    IncorrectUsernameError: 'Username provided doesn\'t exist',
    MissingUsernameError: 'No username was given',
    UserExistsError: 'A user with the given username is already registered'
  }
};


Account.plugin(passportLocalMongoose, options);

module.exports = mongoose.model('Account', Account);