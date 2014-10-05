var request = require('request');
var qs = require('querystring');
var pkgMeta = require('../package.json');

var helper = require('./helper');
var ECKey = require('./key');

var BlockIo = module.exports = function (config, pin, version) {
  if (typeof(config) === 'string') {

    this.key = config;
    this.version = version || BlockIo.DEFAULT_VERSION;
    this.server = BlockIo.DEFAULT_SERVER;
    this.port = BlockIo.DEFAULT_PORT;

    if (pin) {
      this.pin = pin;
      this.aesKey = helper.pinToKey(this.pin);
    }

  } else if (config && typeof(config) == 'object') {
    this.key = config.api_key;
    this.version = config.version || BlockIo.DEFAULT_VERSION;
    this.server = config.server || BlockIo.DEFAULT_SERVER;
    this.port = config.port || BlockIo.DEFAULT_PORT;

    if (config.pin) {
      this.pin = config.pin;
      this.aesKey = helper.pinToKey(this.pin);
    }
  }
};

// link submodules / subclasses
BlockIo.ECKey = ECKey;
BlockIo.helper = helper;

BlockIo.DEFAULT_VERSION = 2;
BlockIo.DEFAULT_SERVER = '';
BlockIo.DEFAULT_PORT = '';
BlockIo.HOST = 'block.io';


// IF YOU EDIT THIS LIB, PLEASE BE A DARLING AND CHANGE THE USER AGENT :)
BlockIo.USER_AGENT = ['npm','block_io', pkgMeta.version].join(':');

BlockIo.PASSTHROUGH_METHODS = [
  'get_balance', 'get_new_address', 'get_my_addresses', 'get_address_received',
  'get_address_by_label', 'get_address_balance', 'create_user', 'get_users',
  'get_user_balance', 'get_user_address', 'get_user_received', 'get_current_price',
  'is_green_address', 'is_green_transaction', 'get_transactions', 'sign_and_finalize_withdrawal',
  'get_new_dtrust_address', 'get_my_dtrust_addresses', 'get_dtrust_address_by_label', 'get_dtrust_transactions',
  'get_dtrust_address_balance'
];

BlockIo.WITHDRAWAL_METHODS = [
  'withdraw', 'withdraw_from_user', 'withdraw_from_label', 'withdraw_from_address', 'withdraw_from_labels',
  'withdraw_from_addresses', 'withdraw_from_users', 'withdraw_from_dtrust_address', 'withdraw_from_dtrust_labels'
];

BlockIo.prototype._withdraw = function (method, path, args, cb) {
  if (!args || typeof(args) !== 'object') args = {};

  // check for pin
  var pin;
  var pinSupplied = (typeof(args.pin) !== 'undefined');
  if (!pinSupplied && typeof(this.pin) === 'undefined') {
    return cb(new Error('Missing "pin", please supply as argument or at initialization time.'));
  } else {
    pin = pinSupplied ? args.pin : this.pin;
  }

  // add pin to args for v1, remove for v2;
  if (this.version === 1) {
    args.pin = pin;
  } else {
    delete args.pin;
  }

  var self = this;
  return this._request(method, path, args, function (e, res) {

    if (e) return cb(e, res);

    if (typeof(res) !== 'object' ||
      typeof(res.data) !== 'object' ||
      !res.data.hasOwnProperty('reference_id')) return cb(e, res);

    //if we're doing dtrust, return the intermediate object for manual signing.
    if (!res.data.encrypted_passphrase || !res.data.encrypted_passphrase.passphrase)
      return cb(e, res);

    // If we get here, Block.io's asking us to provide some client-side signatures, let's get to it
    var encrypted_passphrase = res.data.encrypted_passphrase.passphrase;
    var aesKey = self.aesKey || helper.pinToKey(pin);
    var privkey = helper.extractKey(encrypted_passphrase, aesKey);

    if (!(privkey instanceof ECKey))
      return cb(new Error('Could not extract privkey'));

    var pubkey = privkey.pub.toHex();
    if (pubkey != res.data.encrypted_passphrase.signer_public_key)
      return cb(new Error('Public key mismatch for requested signer and ourselves. Invalid Secret PIN detected.'));

    res.data.inputs = helper.signInputs(privkey, res.data.inputs);

    aesKey = '';
    privkey = null;

    self._request(method, 'sign_and_finalize_withdrawal', {signature_data: JSON.stringify(res.data)}, cb);

  });

};

BlockIo.prototype._constructURL = function (path, query) {
  return [
    'https://',
    this.server, (this.server) ? '.' : '', // eg: 'dev.'
    BlockIo.HOST, // block.io
    (this.port) ? ':' : '', this.port, // eg: :80
    '/api/v', (this.version).toString(10), '/', // eg: /api/v1/
    path,
    query ? ['?', qs.stringify(query)].join('') : ''
  ].join('');
};

BlockIo.prototype._request = function (method, path, args, cb) {

  var opts = {
    method: method,
    headers: {
      'User-Agent': BlockIo.USER_AGENT
    }
  };

  switch (method) {
    case 'POST':
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.url = this._constructURL(path, {api_key: this.key}),
      opts.body = qs.stringify(args);
      break;
    case 'GET':
    default:
      opts.url = this._constructURL(path),
      args.api_key = this.key;
      opts.qs = args;
  }

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

BlockIo._constructMethod = function (type, callMethod) {
  var fn = ['_', type].join('');
  return function (args, cb) {

    // handle overload for function (cb), without args
    if (!cb && typeof(args) === 'function') {
      cb = args;
      args = {};
    }

    this[fn]('POST', callMethod, args, cb);
  };
};

// generate methods for each valid call method
BlockIo.PASSTHROUGH_METHODS.forEach(function (method) {
  BlockIo.prototype[method] = BlockIo._constructMethod('request', method);
});

BlockIo.WITHDRAWAL_METHODS.forEach(function (method) {
  BlockIo.prototype[method] = BlockIo._constructMethod('withdraw', method);
});
