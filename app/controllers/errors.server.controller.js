'use strict';

var _ = require('lodash');

var getUniqueErrMsg = function(err) {
  var output;

  if (!!~err.err.indexOf('duplicate key error index') && !!~err.err.indexOf('users.$')) {
    return 'Sorry, given username is already taken';
  }

  try {
    var fieldName = err.err.substring(err.err.lastIndexOf('.$') + 2, err.err.lastIndexOf('_1'));
    output = 'Sorry, given ' + fieldName + ' is already taken';

  } catch (ex) {
    output = 'Sorry, this value is already taken';
  }

  return output;
};

exports.getErrMsg = function(err) {
  var message = '';

  if (err.code) {
    switch (err.code) {
      case 11000:
      case 11001:
        message = getUniqueErrMsg(err);
        break;
    }
  } else if (!_.isEmpty(err.errors)) {
    message = err.errors[_.keys(err.errors)[0]].message;
  } else if (err.message) {
    message = err.message;
  }

  return {message : message};
};
