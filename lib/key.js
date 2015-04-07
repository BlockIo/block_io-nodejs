var crypto = require('crypto');
var util = require('util');
var assert = require('assert');

var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');

var Key = module.exports = function (d, compressed) {
	if (d) {
		Bitcoin.ECKey.call(this, d, compressed);
	} else {
		var newKey = Bitcoin.ECKey.makeRandom();
		Bitcoin.ECKey.call(this, newKey.d, true);
	}
};

// inherit prototype
util.inherits(Key, Bitcoin.ECKey);

// inherit static properties
Key.curve = Bitcoin.ECKey.curve;

// helper to cast static ECKey factories
Key._fromSuper = function (key) {
	if (!(key instanceof Bitcoin.ECKey)) return key;
	return new Key(key.d, key.pub.compressed);
};

// inherit factory ECKey.makeRandom();
Key.makeRandom = function () {
	var key = Bitcoin.ECKey.makeRandom.apply(Bitcoin.ECKey, arguments);
	return this._fromSuper(key);
};

// inherit factory ECKey.makeRandom();
Key.fromWIF = function () {
	var key = Bitcoin.ECKey.fromWIF.apply(Bitcoin.ECKey, arguments);
	return this._fromSuper(key);
};

Key.prototype.signHex = function (hexData) {
	var buf = new Buffer(hexData, 'hex');
	return this.sign(buf).toDER().toString('hex');
};

Key.prototype.sign = function (buf) {
	return Bitcoin.ecdsa.sign(Bitcoin.ECKey.curve, buf, this.d);
};

Key.fromBuffer = function (buf) {
	assert(Buffer.isBuffer(buf));
	var d = BigInteger.fromBuffer(buf);
	return new Key(d, true);
};

Key.fromHex = function (hexKey) {
	return this.fromBuffer(new Buffer(hexKey, 'hex'));
};

Key.fromPassphrase = function(pass) {
	var buf = Buffer.isBuffer(pass) ? pass : new Buffer(pass, 'hex');
	buf = crypto.createHash('sha256').update(buf).digest();
	return this.fromBuffer(buf);
};

Key.fromPassphraseString = function(pass) {
	return this.fromPassphrase(new Buffer(pass));
};
