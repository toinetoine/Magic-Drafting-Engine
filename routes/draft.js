var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');

var Accounts = require('../models/account');
var Player = require('../models/player');
var Draft = require('../models/draft');
var Sets = require('../models/set');

const utils = require('./utils');

// Create a draft (Host)
router.post('/create', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }

  var userId = mongoose.Types.ObjectId(req.user._id);
  Draft.create({host: userId, passcode: utils.generateNumber(5)}, function (err, draft) {
    if (err) {
      res.status(400).json({success: false, info: err.toString()});
    } else {
      res.status(200).json({success: true, id: draft._id, passcode: draft.passcode});

      // var result = draft.addPlayer(userId);
      // if (result.success) {
      //   res.status(200).json({success: true, id: draft._id, passcode: draft.passcode});
      // } else {
      //   res.status(200).json({success: false, info: result.info});
      // }
    }
  });
});

// Choose the draft's set (Host)
router.post('/choose_set', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }
  
  var params = utils.getRequiredParams('body', req.body, ['set', 'draft_id']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }
  
  Sets.findOne({$or: [
    {code: params.data['set']},
    {name: params.data['set']}
  ]}, function (err, set) {
    if (err) {
      console.log(err);
      res.status(500).json({success: false, info: err.toString()});
    } else {
      if (set == null) {
        res.status(200).json({success: false, info: 'Set with name or code \'' + 
          params.data['set'] + '\' not found'});
      } else {
        getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
          if (!success) {
            res.status(httpStatus).json({success: false, info: info});
          } else {
            if (draft.host._id.toString() == req.user._id) {
              draft.set = mongoose.Types.ObjectId(set._id);
              draft.save();
              res.status(200).json({success: true});
            } else {
              res.status(401).json({success: false, 
                info: 'Only the host may choose the set to draft'});
            }
          }
        });
      }
    }
  });
});

// Join a draft (non-host, the host will auto-join on create)
router.post('/join', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }

  var userId = mongoose.Types.ObjectId(req.user._id);

  var params = utils.getRequiredParams('body', req.body, ['draft_id', 'passcode']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
    if (!success) {
      res.status(httpStatus).json({success: false, info: info});
    } else {
      if (draft.passcode == params.data['passcode']) {
        draft.addPlayer(userId, function(result) {
          res.status(200).json(result);
        });
      } else {
        res.status(401).json({success: false, 
          info: 'Draft passcode provided is not correct'});
      }
    }
  });
});

/**
 * Toggle the player's ready state
 */
router.post('/ready', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }

  var params = utils.getRequiredParams('body', req.body, ['draft_id']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
    if (!success) {
      res.status(httpStatus).json({success: false, info: info});
    } else {
      var result = draft.toggleReady(req.user._id);
      res.status(200).json(result);
    }
  });
});

// start the draft (host)
router.post('/start', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }
  
  var params = utils.getRequiredParams('body', req.body, ['draft_id']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }
 
  getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
    if (!success) {
      res.status(httpStatus).json({success: false, info: info});
    } else {
      if (draft.host['_id'].toString() == req.user['_id'].toString()) {
        draft.start(function(result) {
          res.status(200).json(result);
        });
      } else {
        res.status(401).json({success: false, info: 'Only ' + draft.host['username'] + 
          ' (the host) can start the draft'});
      }
    }
  });
});

router.get('/info', function(req, res) {
  var params = utils.getRequiredParams('URL params', req.query, ['draft_id']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
    var result = {success: success};
    if (success) {
      result.draft = draft.sanitize(req.isAuthenticated() && 
        draft.host['_id'].toString() == req.user['_id'].toString());
    } else {
      result.info = info;
    }
    res.status(httpStatus).json(result);
  });
});

/**
 * @param {String} draftId
 * @param {String} username the user who's assigned packs you want to retreive
 */
router.get('/get_my_packs', function(req, res) {
  if (!req.isAuthenticated()) {
    res.status(401).json({success: false, info: 'Not logged in'});
    return;
  }
  
  var params = utils.getRequiredParams('URL params', req.query, ['draft_id']);
  if (!params.success) {
    res.status(500).json({success: false, info: params.info});
    return;
  }

  getDraft(params.data['draft_id'], function(draft, success, info, httpStatus) {
    if (success) {
      draft.getPacks(req.user._id).then((response) => {
        res.status(200).json(response);
      });
    } else {
      res.status(httpStatus).json({success: false, info: info});
    }
  });
});

/**
 * @param  {String} draftId
 * @param  {[Function]} callback expects callback to accept params: 
 *      draft (Mongoose object), success (bool), 
 *      info (String, null if success = true), httpStatus (Number)
 */
async function getDraft(draftId, callback) {

  Draft.findById(draftId).populate(['set', 'host', 'players.$*.account']).exec(function (err, draft) {
    if (err) {
      if (err.name === 'CastError') {
        callback(null, false, 'No draft found with given id. Draft id ' + 
          draftId + ' provided not a valid mongoose ObjectId', 200);
      } else {
        callback(null, false, err.toString(), 500);
      }
    } else {
      if (draft == null) {
        callback(draft, false, 'No draft found with given id', 200);
      } else {
        // Don't need now that populate is working for player.account
        // var ids = Array.from(draft.players.keys()).map(key => {return {_id: mongoose.Types.ObjectId(key)}});
        // Accounts.find({$or: ids}).exec(function (err, users) {
        //   if (err) {
        //     callback(draft, false, err.string(), 200);
        //   } else {
        //     users.forEach((user) => {
        //       draft.players.set(user._id.toString(), user);
        //     });
        //     callback(draft, true, 'Success', 200);
        //   }
        // })
        callback(draft, true, 'Success', 200);
      }
    }
  });
}

module.exports = router;