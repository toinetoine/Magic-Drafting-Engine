var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Pick = new Schema({
  pack: { type: Schema.Types.ObjectId, ref: 'Pack' },
  pickNumber: Schema.Types.Number,
  card: { type: Schema.Types.ObjectId, ref: 'Card' },
  autoPick: Schema.Types.Boolean
});

module.exports = mongoose.model('Pick', Pick);