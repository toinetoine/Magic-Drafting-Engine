var express = require('express');
var Account = require('../models/account');
var router = express.Router();
const utils = require('./utils');

router.post('/register', function(req, res) {
  var params = utils.getRequiredParams('body', req.body, ['username', 'password']);
  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  Account.register(new Account({ username: params.data.username }),
    params.data.password, function(err) {
    if (err) {
      res.status(401).json({success: false, info: err.toString()})
    } else {
      res.status(200).json({success: true, username: params.data.username});
    }
  });
});

router.post('/login', function(req, res) {
  var params = utils.getRequiredParams('body', req.body, ['username', 'password']);

  if (!params.success) {
    res.status(400).json({success: false, info: params.info});
    return;
  }

  Account.authenticate()(params.data.username, params.data.password, 
    function(err, result, info) {
      if (err) {
        res.status(401).json({success: false, info: err});
        return;
      }

      if (!result) {
        res.status(401).json({success: false, info: info});
        return;
      }

      req.logIn(result, function(err) {
        if (err) {
          res.status(500).json({success: false, info: err});
        } else {
          res.status(200).json({success: true, username: result.username, info: info});
        }
      });
    });
});

router.get('/info', function(req, res) {
  var response = {authenticated: req.isAuthenticated()};
  if (response.authenticated) {
    response.username = req.user.username;
  }
  res.status(200).json(response);
});

router.post('/logout', function(req, res) {
  if (req.isAuthenticated()) {
    req.logout();
  }
  res.status(200).json({success: true});
});

module.exports = router;