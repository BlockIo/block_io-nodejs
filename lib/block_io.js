var request = require('request');
var pkgMeta = require('../package.json');

var BlockIo = module.exports = function (key) {
  this.key = key;
};

BlockIo.BASE_URL = 'https://block.io/api/v1/';
BlockIo.USER_AGENT = ['npm','block_io', pkgMeta.version].join(':');

BlockIo.VALID_CALL_METHODS = [
  'get_balance', 'withdraw', 'get_new_address', 'get_my_addresses',
  'get_address_received', 'get_address_by_label', 'get_address_balance', 'create_user',
  'get_users', 'get_user_balance', 'get_user_address',  'get_user_received',  'withdraw_from_user',
  'get_current_price', 'withdraw_from_label', 'withdraw_from_address', 'withdraw_from_labels',
  'withdraw_from_addresses', 'withdraw_from_users'
];

BlockIo.prototype._request = function (method, path, args, cb) {

  // currently only suporting GET
  if (method !== 'GET') return cb(new Error([method, 'not supported'].join(' ')));

  // validate args and add api_key
  if (!args || typeof(args) !== 'object') {
    args = { api_key: this.key };
  } else {
    args.api_key = this.key;
  }

  var opts = {
    method: method,
    url: [BlockIo.BASE_URL, path].join(''),
    qs: args,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BlockIo.USER_AGENT
    }
  };

  return cb ? request(opts, BlockIo.parseResponse(cb)) : request(opts);

};

BlockIo.parseResponse = function (cb) {

  return function (err, res, body) {
    if (err) return cb(err);

    var errOut = null;
    var data = null;

    try {
      data = JSON.parse(body);
    } catch (ex) {
      errOut = ex;
    }

    return cb(errOut, data);
  };

};

BlockIo.prototype.validate_key = function (cb) {
  // Test if the key is valid by doing a simple balance check

  this._request('GET', 'get_balance', {}, function (err, doc) {
    var errOut = err || (doc.status === 'success') ? null : new Error('Error occurred validating key');
    return cb(errOut, (errOut === null));
  });

};

BlockIo._constructCallMethod = function (callMethod) {
  return function (args, cb) {

    // handle overload for function (cb), without args
    if (!cb && typeof(args) === 'function') {
      cb = args;
      args = {};
    }

    this._request('GET', callMethod, args, cb);
  };
};

// generate methods for each valid call method
BlockIo.VALID_CALL_METHODS.forEach(function (method) {
  BlockIo.prototype[method] = BlockIo._constructCallMethod(method);
});
