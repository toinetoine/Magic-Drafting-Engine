var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');

var Sets = require('../models/set');

const filter = require('filter-anything');
const utils = require('./utils');


// list the available sets
router.get('/available', function(req, res) {
  Sets.find({}).maxTimeMS(10).exec(function (err, sets) {
    if (err) {
      res.status(500).json({success: false, info: err.toString()});
    } else {
      var sanitizedSets = [];
      for (var i = 0; i < sets.length; i++) {
        var set = JSON.parse(JSON.stringify(sets[i]));
        sanitizedSets.push(filter.omit(set, ['_id']));
      }
      res.status(200).json({success: true, sets: sanitizedSets});
    }
  });
});

module.exports = router;