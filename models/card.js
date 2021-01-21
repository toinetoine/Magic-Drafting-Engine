var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Card = new Schema({
  name: String,
  rarity: String,
  mana_cost: String,
  types: [String],
  set: String,
  scryfall_ruling: String,
  oracle_id: String
});

module.exports = mongoose.model('Card', Card);