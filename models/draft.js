let mongoose = require('mongoose');
const { exists, schema } = require('../models/card');
let Schema = mongoose.Schema;
const utils = require('../routes/utils');
const filter = require('filter-anything');

let Card = require('../models/card');
let Pack = require('../models/pack');
var Account = require('../models/account');

var Player = new Schema({
  account: { type: Schema.Types.ObjectId, ref: 'Account' },
  deck: [{ type: Schema.Types.ObjectId, ref: 'Card' }],
  ready: {type: Schema.Types.Boolean, default: false},
  seatNumber: Schema.Types.Number
}, {_id: false});

const Draft = new Schema({
  maxCapacity: { type: Schema.Types.Number, default: '8' },
  host: { type: Schema.Types.ObjectId, ref: 'Account' },
  packs: [{ type: Schema.Types.ObjectId, ref: 'Pack' }],
  players: {type: Map, of: Player, default: {} },
  set: { type: Schema.Types.ObjectId, ref: 'Set', default: null },
  createdTime: { type: Schema.Types.Date, default: Date.now },
  startedTime: { type: Schema.Types.Date, default: null },
  passcode: Schema.Types.String, // used by players to join the draft,
  state: {
    type: Schema.Types.String,
    enum: ['CREATED', 'STARTED', 'PAUSED', 'ENDED'],
    default: 'CREATED'
  },
  round: {type: Schema.Types.Number, default: 1}
});

Draft.pre('save', function (next) {
  if (this.isNew) {
    this.wasNew = this.isNew;
  }
  next();
});

Draft.post('save', function (doc) {
  if (this.wasNew) {
    delete this.wasNew;
    this.addPlayer(this.host, function(result) {
      if (!result.success) {
        throw Error('Error on adding host as player in draft: ' + result.info);
      }
    });
  }
});

async function getPlayerBySeat(seatNumber) {
  for (const player of Object.values(this.players)) {
    if (player.seatNumber == seatNumber) {
      return player;
    }
  }

  return null;
}

Draft.methods.enforceStatus = function(allowedStatuses) {
  let result = {success: false}
  for(let i = 0; i < allowedStatuses.length; i++) {
    if (this.state == allowedStatuses[i]) {
      result.success = true;
      return result;
    }
  }

  if (this.state == 'CREATED') {
    result.info = 'Draft has not yet been started by the host.';
  } else if (this.state == 'STARTED') {
    result.info = 'Draft has already been started by the host.';
  } else if (this.state == 'PAUSED') {
    result.info = 'Draft has been paused by the host.';
  } else if (this.state == 'ENDED') {
    result.info = 'Draft has already ended.';
  } else {
    result.info = 'Unidentified state.';
  }

  return result;
}
/**
 * Get the pack assigned
 * @param  {String} playerId
 */
Draft.methods.getPacks = async function(playerId) {
  let result = this.enforceStatus(['STARTED', 'PAUSED']);
  if (!result.success) { return result; }

  if (!this.players[playerId]) {
    return {success: false, info: 'No player in this draft found with matching ID'};
  }
  
  let packs = await Pack.find().where('_id').in(this.packs).exec();

  console.log(this.round);

  // get packs assigned to this player
  let assignedPacks = packs.filter(function(pack) {
    // console.log(pack.packNumber);
    console.log(pack.packNumber);
    console.log(this.round);
    // pack.packNumber == this.round;
    
    return mongoose.Types.ObjectId(pack.player).toString() == playerId.toString()
  });

  // sort packs by remaining cards (more first)
  assignedPacks.sort((packA, packB) => (packA.remaining < packB.remaining) ? 1 : -1);
  return {success: true, packs: assignedPacks};
}

// Draft.methods.pickCard = async function(playerId, cardIndex) {
//   let assignedPacks



//   let player = await getIdFromUsername(username);
//   if (player == null) {
//     return {success: false, info: 'No account found with username ' + username}
//   }

//   let playerIndex;
//   for(let i = 0; i < this.players.length; playerIndex++) {
//     if (this.players[i].account == playerIndex) {
//       playerIndex = i;
//     }
//   }

//   this.players.map(player => player.account)
// }

Draft.methods.sanitize = function(isHost) {
  const fieldsToRemove = [
    '__v', 'set._id', 'host._id', 'host.__v', 'host.created', 'host.updated',
  ];
  let filteredDraft = JSON.parse(JSON.stringify(this));
  filteredDraft = filter.omit(filteredDraft, fieldsToRemove);
  
  if (!isHost) { // filter aditional fields only viewable by the host
    filteredDraft = filter.omit(filteredDraft, ['passcode']);
  }
    
  // filter-anything doesn't support arrays of objects, have to individually delete 
  // the mongoose fields from each player object
  if (filteredDraft.players) {
    for (const username of Object.keys(filteredDraft.players)) {
      delete filteredDraft.players[username].account['_id'];
      delete filteredDraft.players[username].account['__v'];
    }
  }

  // Rename draft mongoose '_id' field to 'id'
  filteredDraft['id'] = filteredDraft._id;
  delete filteredDraft._id;
  
  return filteredDraft;
};

Draft.methods.toggleReady = function(playerId) {
  var player = this.players.get(playerId.toString());
  if (player) {
    var wasReady = player.ready;
    player.ready = !wasReady;
    player.save();
    // this.players.set(playerId.toString(), player);
    this.save();
    return {success: true, ready: !wasReady};
  } else {
    return {success: false, info: 'User is not a player in this draft'};
  }
}

Draft.methods.addPlayer = async function(rawUserId, cb) {
  let userId = mongoose.Types.ObjectId(rawUserId);
  // Account.findById({_id: userId}, ()
  // Account.findById(userId).populate(['cards.card']).maxTimeMS(1).exec(function (err, pack) {
  // var account =  await Account.findById({_id: userId});
  try {
    var account = await Account.findById(userId);
  } catch(err) {
    cb({
      success: false,
      info: 'Unable to fetch account assosiated with ' + userId.toString() + 
        '\t' + err.toString()
    });
  }

  if (account) {
    if (this.players.get(account.username)) {
      cb({success: false, info: 'User is already a player in this draft'});
    } else {
      if (this.players.size == this.maxCapacity) {
        cb({success : false, 
          info: `Number of players already at maximum capacity ${maxCapacity}`});
      } else {
        this.players.set(account.username, {
          ready: false,
          deck: [],
          account: mongoose.Types.ObjectId(userId)
        });
        this.save();

        cb({success: true});
      }
    }
  } else {
    cb({
      success: false,
      info: 'Unable to find account assosiated with id ' + userId.toString()
    });
  }
  Account.findById(userId).exec(function (err, account) {
    if (err) {
      return ;
    } else {
      // if (this.players == undefined) {
      //   this.players = new Map();
      // }

      
    }
  });
}

Draft.methods.start = async function(cb) {
  var result  = this.enforceStatus(['CREATED']);
  if (!result.success) {
    cb(result);
    return;
  }

  if (this.set == null) {
    cb({
      success: false, 
      info: 'The draft can\'t be started because no set has been specified'
    });
    return;
  }

  // 1. Add this draft to each user's draft history
  var playerIds = Object.keys(this.players);
  // let playerAccounts = this.players.map(p => mongoose.Types.ObjectId(p.account._id));
  console.log(playerIds);
  var result = await Account.updateMany(
    {_id: {$in: mongoose.Types.ObjectId(playerIds)}}, 
    {$push: {drafts: this._id}}
  );
  if (result.nModified != this.players.length) {
    cb({success: false, info: 'Issue adding started draft to players\' draft history'});
    return;
  }

  // 2. Generate 3 packs for each player
  try {
    let cardsWithBasicLands = await Card.find({'set': this.set.code});
    // filter out basic lands
    let cards = cardsWithBasicLands.filter(function(card) {
      return !(card.types.includes('Basic Land'));
    });

    let commons = cards.filter(function(card) {
      return card.rarity == 'common';
    });
    let uncommons = cards.filter(function(card) {
      return card.rarity == 'uncommon';
    });
    let rares = cards.filter(function(card) {
      return card.rarity == 'rare';
    });
    let mythics = cards.filter(function(card) {
      return card.rarity == 'mythic';
    });

    // create 3 packs for each player
    let packs = [];
    for (const playerId of Object.keys(this.players)) {
      for (let packI = 0; packI < 3; packI++) {
        let cards = [];
        // 10 common slots
        let remainingCommons = [...commons];
        for (let i = 0; i < 10; i++) {
          let cardIndex = utils.randomNumber(0, remainingCommons.length - 1);
          let card = remainingCommons.splice(cardIndex, 1)[0];
          console.log(card.oracle_id + '|' + card.name + '|' + card.rarity)
          cards.push({card: mongoose.Types.ObjectId(card._id)});
        }
        // 3 uncommon slots
        let remainingUncommons = [...uncommons];
        for (let i = 0; i < 3; i++) {
          let cardIndex = utils.randomNumber(0, remainingUncommons.length - 1);
          let card = remainingUncommons.splice(cardIndex, 1)[0];
          console.log(card.name + '|' + card.rarity);
          cards.push({card: mongoose.Types.ObjectId(card._id)});
        }
        // rare slot (1 in 8 packs have a mythic in the rare slot)
        let rareSlotCards;
        if (utils.randomNumber(0, 8) == 0) {
          rareSlotCards = mythics;
        } else {
          rareSlotCards = rares;
        }
        let card = rareSlotCards[utils.randomNumber(0, rareSlotCards.length)];
        console.log(card.name + '|' + card.rarity);
        cards.push({card: mongoose.Types.ObjectId(card._id)});
        
        packs.push(new Pack({
          cards: cards,
          set: this.set,
          player: this.players[playerId].account,
          packNumber: packI + 1
        }));
      }
    }

    let savedPacks = await Pack.create(packs);
    this.packs = savedPacks.map(pack => mongoose.Types.ObjectId(pack._id));
    
    this.state = 'STARTED';
    this.startedTime = Date();
    this.round = 1;

    this.save(function(err) {
      if (err) {
        cb({success: false, info: err.toString()});
      } else {
        cb({success: true});
      }
    });
  } catch(err) {
    cb({success: false, info: err.toString()});
  }
};

module.exports = mongoose.model('Draft', Draft);