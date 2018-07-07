var request = require('request');
var qs = require('querystring');
var pkgMeta = require('../package.json');

var helper = require('./helper');
var ECKey = require('./key');

var BlockIo = module.exports = function (config, pin, version, options) {

  this.options = {
    allowNoPin: false
  };

  if (typeof(config) === 'string') {

    this.key = config;
    this.version = version || BlockIo.DEFAULT_VERSION;
    this.server = BlockIo.DEFAULT_SERVER;
    this.port = BlockIo.DEFAULT_PORT;

    if (pin) {
      this.pin = pin;
      this.aesKey = helper.pinToKey(this.pin);
    }

    if (options && typeof(options) == 'object') this._cloneOptions(options);

  } else if (config && typeof(config) == 'object') {
    this.key = config.api_key;
    this.version = config.version || BlockIo.DEFAULT_VERSION;
    this.server = config.server || BlockIo.DEFAULT_SERVER;
    this.port = config.port || BlockIo.DEFAULT_PORT;

    if (config.pin) {
      this.pin = config.pin;
      this.aesKey = helper.pinToKey(this.pin);
    }

    if (config.options) this._cloneOptions(config.options);
  }
};

// link submodules / subclasses
BlockIo.ECKey = ECKey;
BlockIo.helper = helper;

BlockIo.DEFAULT_VERSION = 2;
BlockIo.DEFAULT_SERVER = '';
BlockIo.DEFAULT_PORT = '';
BlockIo.HOST = 'block.io';


// Error messages
var ERR_KEY_INV = 'Error occurred validating key';
var ERR_PIN_MIS = 'Missing "pin", please supply as argument';
var ERR_PIN_INV = 'Public key mismatch. Invalid Secret PIN detected.';
var ERR_PK_EXTR = 'Could not extract privkey';
var ERR_WIF_MIS = 'Missing mandatory private_key argument';
var ERR_WIF_INV = 'Could not parse private_key as WIF';
var ERR_DEST_MIS = 'Missing mandatory to_address argument';
var ERR_UNKNOWN = 'Unknown error occured';

// IF YOU EDIT THIS LIB, PLEASE BE A DARLING AND CHANGE THE USER AGENT :)
BlockIo.USER_AGENT = ['npm','block_io', pkgMeta.version].join(':');

// simple uniform methods that do not need special processing
BlockIo.PASSTHROUGH_METHODS = [
  'get_balance', 'get_new_address', 'get_my_addresses', 'get_address_received',
  'get_address_by_label', 'get_address_balance', 'create_user', 'get_users',
  'get_user_balance', 'get_user_address', 'get_user_received',
  'get_current_price', 'is_green_address', 'is_green_transaction',
  'get_transactions', 'sign_and_finalize_withdrawal', 'get_new_dtrust_address',
  'get_my_dtrust_addresses', 'get_dtrust_address_by_label',
  'get_dtrust_transactions', 'get_dtrust_address_balance',
  'get_network_fee_estimate', 'archive_address', 'unarchive_address',
  'get_my_archived_addresses', 'archive_dtrust_address',
  'unarchive_dtrust_address', 'get_my_archived_dtrust_addresses',
  'get_dtrust_network_fee_estimate', 'create_notification', 'disable_notification',
  'enable_notification', 'get_notifications', 'get_recent_notification_events',
  'delete_notification', 'validate_api_key', 'sign_transaction', 'finalize_transaction',
  'get_my_addresses_without_balances', 'get_raw_transaction', 'get_dtrust_balance',
  'archive_addresses', 'unarchive_addresses', 'archive_dtrust_addresses', 'unarchive_dtrust_addresses'
];

// withdrawal methods that need local signing
BlockIo.WITHDRAWAL_METHODS = [
  'withdraw', 'withdraw_from_user', 'withdraw_from_label',
  'withdraw_from_address', 'withdraw_from_labels', 'withdraw_from_addresses',
  'withdraw_from_users', 'withdraw_from_dtrust_address', 'withdraw_from_dtrust_addresses',
  'withdraw_from_dtrust_labels'
];

BlockIo.SWEEP_METHODS = ['sweep_from_address'];

BlockIo.prototype._withdraw = function (method, path, args, cb) {
  if (!args || typeof(args) !== 'object') args = {};

  // check for pin
  var pin = null;
  var pinSupplied = (typeof(args.pin) !== 'undefined');

  if (pinSupplied || typeof(this.pin) != 'undefined')
    pin = pinSupplied ? args.pin : this.pin;


  // add pin to args for v1, remove for v2;
  if (this.version == 1) {
    if (!pin) return cb(new Error(ERR_PIN_MIS));
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
    if (!res.data.encrypted_passphrase ||
      !res.data.encrypted_passphrase.passphrase)
        return cb(e, res);

    // if no pin was supplied and allowNoPin flag was set,
    // return the response for signing asynchronously,
    // else return pin error
    if (!pin)
      return (self.options.allowNoPin) ? cb(e, res) : cb(new Error(ERR_PIN_INV));

    // If we get here, Block.io's asking us to provide client-side signatures
    var encrypted_passphrase = res.data.encrypted_passphrase.passphrase;
    var aesKey = self.aesKey || helper.pinToKey(pin);
    var privkey = helper.extractKey(encrypted_passphrase, aesKey);

    if (!(privkey instanceof ECKey))
      return cb(new Error(ERR_PK_EXTR));

    var pubkey = privkey.pub.toHex();
    if (pubkey != res.data.encrypted_passphrase.signer_public_key)
      return cb(new Error(ERR_PIN_INV));

    res.data.inputs = helper.signInputs(privkey, res.data.inputs);

    aesKey = '';
    privkey = null;

    self._request(method, 'sign_and_finalize_withdrawal', {
      signature_data: JSON.stringify(res.data)
    }, cb);

  });

};

BlockIo.prototype._sweep = function (method, path, args, cb) {
  var key = null;

  if (!args || typeof(args) !== 'object' || typeof(args.private_key) !== 'string')
    return cb(new Error(ERR_WIF_MIS), args);

  if (!args.to_address) return cb(new Error(ERR_DEST_MIS));

  try {
    key = ECKey.fromWIF(args.private_key);
  } catch (ex) {
    return cb(ex);
  }

  if (!(key instanceof ECKey)) return cb(new Error(ERR_WIF_INV));

  args.public_key = key.pub.toHex();
  delete args.private_key;

  var self = this;
  this._request(method, path, args, function (e, res) {
    if (e) return cb(e, res);

    if (typeof(res) !== 'object' ||
      typeof(res.data) !== 'object' ||
      !res.data.hasOwnProperty('reference_id')) return cb(e, res);

    res.data.inputs = helper.signInputs(key, res.data.inputs);

    key = null;

    self._request(method, 'sign_and_finalize_sweep', {
      signature_data: JSON.stringify(res.data)
    }, cb);

  });

};

BlockIo.prototype._constructURL = function (path, query) {
  return [
    'https://',
    this.server, (this.server) ? '.' : '',            // eg: 'dev.'
    BlockIo.HOST,                                     // block.io
    (this.port) ? ':' : '', this.port,                // eg: :80
    '/api/v', (this.version).toString(10), '/',       // eg: /api/v1/
    path,                                             // eg: get_balance
    query ? ['?', qs.stringify(query)].join('') : ''  // eg: ?api_key=abc
  ].join('');
};

BlockIo.prototype._request = function (method, path, args, cb) {
  var opts = {
    method: method,
    secureProtocol: 'TLSv1_2_method',
    headers: { 'User-Agent': BlockIo.USER_AGENT }
  };

  switch (method) {
    case 'POST':
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.url = this._constructURL(path, {api_key: this.key}),
      opts.body = qs.stringify(args);
      break;
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
    var errMsg = ERR_UNKNOWN;
    var data = null;

    try {
      data = JSON.parse(body);
    } catch (ex) {
      errOut = ex;
    }

    if (data !== null && (typeof(data) !== 'object' || data.status !== 'success')) {
      if (data.error_message) errMsg = data.error_message;
      if (data.data && typeof(data.data) === 'object' &&
        data.data.error_message) errMsg = data.data.error_message;
      errOut = new Error(errMsg);
    }

    return cb(errOut, data);
  };

};

BlockIo.prototype.validate_key = function (cb) {
  // Test if the key is valid by doing a simple balance check

  this._request('GET', 'get_balance', {}, function (err, doc) {
    var errOut = err ||
      (doc.status === 'success') ? null : new Error(ERR_KEY_INV);
    return cb(errOut, (errOut === null));
  });

};

BlockIo.prototype._cloneOptions = function (options) {
  var self = this;
  Object.keys(options).forEach(function (k) {
    self.options[k] = options[k];
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

BlockIo.SWEEP_METHODS.forEach(function (method) {
  BlockIo.prototype[method] = BlockIo._constructMethod('sweep', method);
});
