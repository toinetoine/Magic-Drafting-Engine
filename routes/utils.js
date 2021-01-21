var mongoose = require('mongoose')

function getRequiredParams(paramLocation = 'request', params, fields) {
  var result = {
    success: true, 
    data: {}
  };
  for (let field of fields) {
    if (params && params[field]) {
      result.data[field] = params[field];
    } else {
      result.info = '\'' + field + '\' field missing in ' + paramLocation + '.';
      result.success = false;
      return result;
    }
  }
  return result;
}

function isValidMongooseObjectId(potentialId) {
  var objectId = new mongoose.ObjectId(potentialId);
  var a = objectId.toString();
  return objectId.toString() == potentialId;
}

/**
 * @param  {Number} min (inclusive)
 * @param  {Number} max (inclusive)
 */
function randomNumber(min, max) {  
  return Math.floor(Math.random() * (max - min)) + min; 
}

function generateNumber(digits) {
  var min = Math.pow(10, digits - 1);
  var max = Math.pow(10, digits);
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = { getRequiredParams, isValidMongooseObjectId, generateNumber, randomNumber };
