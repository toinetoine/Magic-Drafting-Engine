var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');

var Pack = require('../models/pack');

const utils = require('./utils');

// Create a draft (Host)
router.get('/get', function(req, res) {
  var params = utils.getRequiredParams('URL params', req.query, ['pack_id']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  Pack.findById(params.data['pack_id']).populate(['cards.card']).maxTimeMS(1).exec(function (err, pack) {
    if (err) {
      res.status(200).json({success: true, pack: pack});
    } else {
      res.status(200).json({success: true, pack: pack});
    }
  });
});

module.exports = router;