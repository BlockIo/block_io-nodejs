const HttpsClient = require('./httpsclient');
const qs = require('querystring');
const pkgMeta = require('../package.json');

const helper = require('./helper');
const ECKey = require('./key');
const networks = require('./networks');

function BlockIo (config, pin, version, options) {

  this.options = {
    allowNoPin: false,
    lowR: true,
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

  const client = new HttpsClient(undefined, BlockIo.USER_AGENT);
  Object.defineProperty(this, 'client', {value: client, writeable: false});
}

// link submodules / subclasses
BlockIo.ECKey = ECKey;
BlockIo.helper = helper;

BlockIo.DEFAULT_VERSION = 2;
BlockIo.DEFAULT_SERVER = '';
BlockIo.DEFAULT_PORT = '';
BlockIo.HOST = 'block.io';


// Error messages
const ERR_PIN_INV = 'Public key mismatch. Invalid Secret PIN detected.';
const ERR_PK_EXTR = 'Could not extract privkey';
const ERR_WIF_MIS = 'Missing mandatory private_key argument';
const ERR_WIF_INV = 'Could not parse private_key as WIF';
const ERR_DEST_MIS = 'Missing mandatory to_address argument';
const ERR_UNKNOWN = 'Unknown error occured';
const ERR_NET_UNK = 'Unknown network';

// IF YOU EDIT THIS LIB, PLEASE BE A DARLING AND CHANGE THE USER AGENT :)
BlockIo.USER_AGENT = ['npm','block_io', pkgMeta.version].join(':');

// simple uniform methods that do not need special processing
BlockIo.PASSTHROUGH_METHODS = [
  'get_balance', 'get_new_address', 'get_my_addresses', 'get_address_received',
  'get_address_by_label', 'get_address_balance', 'create_user', 'get_users',
  'get_user_balance', 'get_user_address', 'get_user_received',
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
  'archive_addresses', 'unarchive_addresses', 'archive_dtrust_addresses', 'unarchive_dtrust_addresses',
  'is_valid_address', 'get_current_price', 'get_account_info', 'list_notifications'
];

// withdrawal methods that need local signing
BlockIo.WITHDRAWAL_METHODS = [
  'withdraw', 'withdraw_from_user', 'withdraw_from_label',
  'withdraw_from_address', 'withdraw_from_labels', 'withdraw_from_addresses',
  'withdraw_from_users', 'withdraw_from_dtrust_address', 'withdraw_from_dtrust_addresses',
  'withdraw_from_dtrust_labels'
];

BlockIo.SWEEP_METHODS = ['sweep_from_address'];

BlockIo.prototype._withdraw = function (path, args, cb) {
  if (!args || typeof(args) !== 'object') args = {};
  const pinSupplied = (typeof args.pin != 'undefined');

  const promise = new Promise((f,r) => {
    let pin = null;
    if (pinSupplied || typeof(this.pin) != 'undefined')
      pin = pinSupplied ? args.pin : this.pin;
    delete args.pin;

    this._request(path, args).then(res => {

      if (typeof(res) !== 'object' ||
          typeof(res.data) !== 'object' ||
          !Object.prototype.hasOwnProperty.call(res.data, 'reference_id')) {

        return r(new Error('Invalid response from ' + path));

      }

      //dtrust request, return for signing
      if (!res.data.encrypted_passphrase ||
          !res.data.encrypted_passphrase.passphrase) {

        return f(res);

      }

      // if no pin was supplied and allowNoPin flag was set,
      // return the response for signing asynchronously,
      // else return pin error
      if (!pin)
        return (this.options.allowNoPin) ? f(res) : r(new Error(ERR_PIN_INV));

      // If we get here, Block.io's asking us to provide client-side signatures
      const encrypted_passphrase = res.data.encrypted_passphrase.passphrase;
      let aesKey = this.aesKey || helper.pinToKey(pin);
      let privkey = helper.extractKey(encrypted_passphrase, aesKey);

      if (!(privkey instanceof ECKey))
        return r(new Error(ERR_PK_EXTR));

      // honor lowR option
      privkey.lowR = this.lowR;

      const pubkey = privkey.pub.toString('hex');
      if (pubkey != res.data.encrypted_passphrase.signer_public_key)
        return r(new Error(ERR_PIN_INV));

      res.data.inputs = helper.signInputs(privkey, res.data.inputs);

      // remove key material from memory
      aesKey = '';
      privkey = null;

      this._request('sign_and_finalize_withdrawal', {
        signature_data: JSON.stringify(res.data)
      }).then(f).catch(r);

    }).catch(r);

  });

  return cbPromiseHelper(promise, cb);

};

BlockIo.prototype._sweep = function (path, args, cb) {
  const promise = new Promise((f,r) => {

    if (!args || typeof(args) !== 'object' ||
        typeof(args.private_key) !== 'string') {

      return r(new Error(ERR_WIF_MIS));

    }

    if (!args.to_address) {
      return r(new Error(ERR_DEST_MIS));
    }

    this.getNetworkParams().then(network => {

      let key = null;
      try {
        key = ECKey.fromWIF(args.private_key, network);
      } catch (ex) {
        return r(ex);
      }

      if (!(key instanceof ECKey)) {
        r(new Error(ERR_WIF_INV))
      }

      // honor lowR option
      key.lowR = this.lowR;

      args.public_key = key.pub.toString('hex');
      delete args.private_key;

      this._request(path, args).then(res => {

        if (typeof(res) !== 'object' ||
          typeof(res.data) !== 'object' ||
          !Object.prototype.hasOwnProperty.call(res.data, 'reference_id')) {

            return r(new Error('Invalid response from ' + path));

        }

        res.data.inputs = helper.signInputs(key, res.data.inputs);

        key = null;

        this._request('sign_and_finalize_sweep', {
          signature_data: JSON.stringify(res.data)
        }).then(f).catch(r);

      }).catch(r);

    }).catch(r);

  });

  return cbPromiseHelper(promise, cb);

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

BlockIo.prototype._request = function (path, args, cb) {
  const url = this._constructURL(path, {api_key: this.key});
  const method = BlockIo.decideRequestMethod(args);

  const promise = new Promise((f,r) => {
    const next = BlockIo.parseResponse(function (e, d) {
      if (e) return r(e);
      f(d);
    });

    this.client.request(method, url, args)
      .then(data => next(null, data.res, data.body))
      .catch(r);
  });

  return cbPromiseHelper(promise, cb);
};

BlockIo.decideRequestMethod = function (data) {
  return (typeof data != 'object' || data === null ||
          Object.keys(data).length === 0) ? 'GET' : 'POST';
}

BlockIo.parseResponse = function (cb) {

  return function (err, res, body) {
    if (err) return cb(err);

    let errOut = null;
    let errMsg = ERR_UNKNOWN;
    let data = null;

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
  const promise = new Promise((f,r) => {
    this._request('get_balance', {}).then(() => f(true)).catch(r);
  });

  return cbPromiseHelper(promise, cb);
};

BlockIo.prototype.get_network = function (cb) {
  // Get the network name from 'get_balance' endpoint
  const promise = new Promise((f,r) => {
    this._request('get_balance', {}).then(res => {
      return res.data.network && f(res.data.network) || r(new Error(ERR_UNKNOWN));
    }).catch(r);
  });

  return cbPromiseHelper(promise, cb);
};

BlockIo.prototype.getNetworkParams = function (cb) {
  const promise = new Promise((f,r) => {
    this.get_network().then(res => {
      const params = networks.getNetwork(res);
      return params && f(params) || r(new Error(ERR_NET_UNK));
    }).catch(r);
  });

  return cbPromiseHelper(promise, cb);
}

BlockIo.prototype._cloneOptions = function (options) {
  Object.keys(options).forEach( (k) => this.options[k] = options[k]);
};

BlockIo._constructMethod = function (type, callMethod) {
  const fn = ['_', type].join('');
  return function (args, cb) {

    // handle overload for function (cb), without args
    if (!cb && typeof(args) === 'function') {
      cb = args;
      args = {};
    }

    return this[fn](callMethod, args, cb);
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

function cbPromiseHelper(promise, cb) {
  if (typeof cb == 'function') {
    promise.then(d => cb(null, d)).catch(e => cb(e));
  } else {
    return promise;
  }
}

module.exports = BlockIo;
