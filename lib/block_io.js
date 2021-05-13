/*eslint no-mixed-spaces-and-tabs: ["error", "smart-tabs"]*/

const HttpsClient = require('./httpsclient');
const qs = require('querystring');
const pkgMeta = require('../package.json');

const Bitcoin = require('bitcoinjs-lib');
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
    this.keys = {}; // we will store keys for use in between calls here
    
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
  'get_transactions', 'get_new_dtrust_address',
  'get_my_dtrust_addresses', 'get_dtrust_address_by_label',
  'get_dtrust_transactions', 'get_dtrust_address_balance',
  'get_network_fee_estimate', 'archive_address', 'unarchive_address',
  'get_my_archived_addresses', 'archive_dtrust_address',
  'unarchive_dtrust_address', 'get_my_archived_dtrust_addresses',
  'get_dtrust_network_fee_estimate', 'create_notification', 'disable_notification',
  'enable_notification', 'get_notifications', 'get_recent_notification_events',
  'delete_notification',
  'get_my_addresses_without_balances', 'get_raw_transaction', 'get_dtrust_balance',
  'archive_addresses', 'unarchive_addresses', 'archive_dtrust_addresses', 'unarchive_dtrust_addresses',
  'is_valid_address', 'get_current_price', 'get_account_info', 'list_notifications',
  'decode_raw_transaction', 'prepare_transaction', 'prepare_dtrust_transaction',
  'submit_transaction'
];

BlockIo.SWEEP_METHODS = ['prepare_sweep_transaction'];

BlockIo.prototype.create_and_sign_transaction = function (args, cb) {

    const data = args.data;
    const keys = args.keys;
    
    const promise = new Promise((f,r) => {
	
	// record the keys provided by the user
	if (keys !== undefined) {
	    if (keys instanceof Array) {
		for(let curKey in keys) {
		    if (typeof(curKey) == 'string' && curKey.length === 64) {
			// keys must be strings of 64 char hex
			// TODO add regex for hex
			
			let keyObj = new ECKey(Buffer.from(curKey, 'hex'), {compressed: true});
			// honor lowR option
			keyObj.lowR = this.lowR;
			this.keys[keyObj.pub.toString('hex')] = keyObj;
		    }
		}
	    } else {
		return r(new Error("keys must be an array of hex strings")); // TODO make this a constant
	    }
	}
	
	if (Object.prototype.hasOwnProperty.call(data.data, 'user_key')) {
	    if (this.keys[data.data.user_key.public_key] === undefined) {
		if (this.aesKey === undefined) {
		    throw("Must instantiate object with a PIN to decrypt private key");
		} else {
		    // If we get here, Block.io's asking us to provide client-side signatures
		    const encrypted_passphrase = data.data.user_key.encrypted_passphrase;
		    let aesKey = this.aesKey;
		    let privkey = helper.extractKey(encrypted_passphrase, aesKey);
		    
		    if (!(privkey instanceof ECKey))
			return r(new Error(ERR_PK_EXTR));
		    
		    // honor lowR option
		    privkey.lowR = this.lowR;
		    
		    const pubkey = privkey.pub.toString('hex');
		    if (pubkey !== data.data.user_key.public_key)
			return r(new Error(ERR_PIN_INV));
		    
		    // store this key for later use
		    this.keys[pubkey] = privkey;
		}
	    }
	}

	// we're done with the keys

	// index address data for inputs so we can use it later
	let input_address_data = {};

	for (let curAddressData of data.data.input_address_data) {
	    input_address_data[curAddressData.address] = curAddressData;
	}
	
	// create the unsigned transaction

	const network_params = networks.getNetwork(data.data.network);
	let can_fully_sign_tx = true; // we will update this as we parse through the inputs
	
	let psbt = new Bitcoin.Psbt({network: network_params});
	psbt.setVersion(1);
	psbt.setLocktime(0);

	// for each input
	for(let curInput of data.data.inputs) {

	    let address_data = input_address_data[curInput.spending_address];

	    let psbt_input = {
                hash: curInput.previous_txid,
                index: curInput.previous_output_index,
                sequence: 0xffffffff,
            };
	    
	    // TODO get raw tx data to suppress bitcoinjs-lib warnings here for Psbt
	    if (["P2SH", "P2WSH-over-P2SH", "WITNESS_V0"].includes(address_data.address_type)) {

		let redeem_script = Bitcoin.payments.p2ms({m: address_data.required_signatures,
							   pubkeys: address_data.public_keys.map(function(p){ return Buffer.from(p, 'hex'); }),
							   network: network_params});

		if (address_data.address_type === "P2SH") {
		    psbt_input['witnessUtxo'] = {script: redeem_script.output, value: helper.to_satoshis(curInput.input_value)};
                    psbt_input['redeemScript'] = redeem_script.output;
		} else if (address_data.address_type === "P2WSH-over-P2SH") {
		    psbt_input['witnessUtxo'] = {script: Bitcoin.payments.p2wsh({redeem: redeem_script}).output, value: helper.to_satoshis(curInput.input_value)};
		    psbt_input['witnessScript'] = redeem_script.output;
		    psbt_input['redeemScript'] = Bitcoin.payments.p2sh({redeem: Bitcoin.payments.p2wsh({redeem: redeem_script})}).output;
		} else {
		    // P2WSH (WITNESS_V0)
		    psbt_input['witnessUtxo'] = {script: Bitcoin.payments.p2wsh({redeem: redeem_script}), value: helper.to_satoshis(curInput.input_value)};
		    psbt_input['witnessScript'] = redeem_script.output;
		}

	    } else if (["P2PKH", "P2WPKH-over-P2SH", "P2WPKH"].includes(address_data.address_type)) {
		let pkh_pubkey = Buffer.from(address_data.public_keys[0], 'hex');
		let p2pkh_address = Bitcoin.payments.p2pkh({pubkey: pkh_pubkey, network: network_params});
		
		if (address_data.address_type === "P2PKH") {
		    // TODO get raw tx to suppress bitcoinjs-lib warnings
		    psbt_input['witnessUtxo'] = {script: p2pkh_address.output, value: helper.to_satoshis(curInput.input_value)};
		} else if (address_data.address_type === "P2WPKH") {
		    psbt_input['witnessUtxo'] = {script: Bitcoin.payments.p2wpkh({pubkey: pkh_pubkey, network: network_params}).output, value: helper.to_satoshis(curInput.input_value)};		
		} else if (address_data.address_type === "P2WPKH-over-P2SH") {
		    let p2wpkh_address = Bitcoin.payments.p2wpkh({pubkey: pkh_pubkey, network: network_params});
		    psbt_input['witnessUtxo'] = {script: Bitcoin.payments.p2sh({redeem: p2wpkh_address}).output, value: helper.to_satoshis(curInput.input_value)};
		    psbt_input['redeemScript'] = p2wpkh_address.output;
		}
	    } else {
		return r(new Error("Unknown address type: " + address_data.address_type));
	    }

	    // add the input to psbt
	    psbt.addInput(psbt_input);
	    
	    // record whether we can fully sign all inputs or not
	    let can_sign = 0;

	    for (let curPubKey of address_data.public_keys) {
		if (this.keys[curPubKey] !== undefined) {
		    can_sign += 1;
		}
	    }

	    can_fully_sign_tx = (can_fully_sign_tx && (address_data.required_signatures <= can_sign));
	}

	// add the outputs to Psbt
	for (let curOutput of data.data.outputs) {
	    psbt.addOutput({
		address: curOutput.receiving_address,
		value: helper.to_satoshis(curOutput.output_value),
	    });
	}
	
	// if we have an expected unsigned txid, ensure our unsigned transaction matches it
	if (Object.prototype.hasOwnProperty.call(data.data, 'expected_unsigned_txid') && psbt.__CACHE.__TX.getId() !== data.data.expected_unsigned_txid) {
	    return r(new Error("Expected unsigned txid did not match. Please report this error to support@block.io."));
	}

	// this will cause warnings where we haven't provided full tx hex for non-segwit inputs
	// the console.warn messages will only be when using psbt.signInput
	psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
	let res = {tx_type: data.data.tx_type, tx_hex: null, signatures: null}; // using null here so JSON.stringify preserves the signatures key when tx is fully signed
	
	if (can_fully_sign_tx) {
	    // we can sign this transaction, so do it and serialize the final transaction

	    for (let curInput of data.data.inputs) {
		let address_data = input_address_data[curInput.spending_address];
		let keys_signed = 0;

		for (let pubkey of address_data.public_keys) {
		    if (this.keys[pubkey] !== undefined) {
			psbt.signInput(curInput.input_index, this.keys[pubkey].ecpair);
			keys_signed += 1;
		    }
		    if (keys_signed === address_data.required_signatures) {
			// we have all the signatures for this input
			break;
		    }
		}
	    }

	    // prepare the final transaction and record its serialized hex
	    // disable fee check (litecoin+dogecoin)
	    res.tx_hex = psbt.finalizeAllInputs().extractTransaction(true).toHex();
	    
	} else {
	    // we can't sign the full transaction, so we will return our signatures and the unsigned tx hex to Block.io
	    // Block.io will then append its signatures to the transaction to finalize and broadcast it
	    
	    for (let curInput of data.data.inputs) {
		// for each input, generate the sig hashes and signatures

		let address_data = input_address_data[curInput.spending_address];
		let sigHash = null;	    

		if (["P2SH", "P2WPKH-over-P2SH", "WITNESS_V0"].includes(address_data.address_type)) {

		    // TODO unify get_redeem_script
		    let redeem_script = Bitcoin.payments.p2ms({m: address_data.required_signatures,
                                                               pubkeys: address_data.public_keys.map(function(p){ return Buffer.from(p, 'hex'); }),
							       network: network_params});

		    if (address_data.address_type === "P2SH") {
			sigHash = psbt.__CACHE.__TX.hashForSignature(curInput.input_index, redeem_script.output, Bitcoin.Transaction.SIGHASH_ALL).toString('hex');
		    } else if (address_data.address_type === "P2WSH-over-P2SH") {
			sigHash = psbt.__CACHE.__TX.hashForWitnessV0(curInput.input_index, redeem_script.output,
								     helper.to_satoshis(curInput.input_value), Bitcoin.Transaction.SIGHASH_ALL).toString('hex');
		    }
		    
		} else {
		    // P2WPKH, P2PKH, P2WPKH-over-P2SH won't get here, so if they do, it's an error
		    return r(new Error("Cannot have partial signatures for address_type=" + address_data.address_type));
		}

		// sign all we can
		res.signatures = [];
		for (let pubkey of address_data.public_keys) {
		    if (this.keys[pubkey] !== undefined) {
			let sig = this.keys[pubkey].signHex(sigHash);
			res.signatures.push({input_index: curInput.input_index, public_key: pubkey, signature: sig});
		    }
		}
	    }

	    // the unsigned transaction we just signed
	    res.tx_hex = psbt.__CACHE.__TX.getHex();
	}

	// remove all stored keys
	this.keys = [];
	
	// return tx_type, tx_hex, signatures
	return f(res);
    });
    
    return cbPromiseHelper(promise, cb);
    
};

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
      this.keys[args.public_key] = key; // store for later
      delete args.private_key;

      this._request(path, args).then(res => {

        if (typeof(res) !== 'object' ||
          typeof(res.data) !== 'object' ||
          !Object.prototype.hasOwnProperty.call(res.data, 'inputs')) {

            return r(new Error('Invalid response from ' + path));

        }

      }).then(f).catch(r);

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
      if (e) {
        if (d) {
          e.data = d;
        }
        return r(e);
      }
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
