var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Set = new Schema({
  name: String,
  code: String
});

module.exports = mongoose.model('Set', Set);