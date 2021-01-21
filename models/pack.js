var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Pack = new Schema({
  set: { type: Schema.Types.ObjectId, ref: 'Set', required: true },
  remaining: Schema.Types.Number,
  cards: [{
    card: { type: Schema.Types.ObjectId, ref: 'Card' }, 
    taken: { type: Schema.Types.Boolean, default: false },
    pickNumber: Schema.Types.Number
  }],
  player: { type: Schema.Types.ObjectId, ref: 'Account' },
  packNumber: Schema.Types.Number
});

module.exports = mongoose.model('Pack', Pack);