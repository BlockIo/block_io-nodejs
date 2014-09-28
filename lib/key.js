var crypto = require('crypto');
var util = require('util');

var Bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bigi');

var ecurve = require('ecurve');
var curve = ecurve.getCurveByName('secp256k1');

var Key = module.exports = function (d, compressed) {
	if (d) {
		Bitcoin.ECKey.call(this, d, compressed);
	} else {
		var newKey = Bitcoin.ECKey.makeRandom();
		Bitcoin.ECKey.call(this, newKey.d, true);
	}
};

util.inherits(Key, Bitcoin.ECKey);

Key.prototype.signHex = function (hexData) {
	var buf = new Buffer(hexData, 'hex');
	return Bitcoin.ecdsa.sign(curve, buf, this.d).toDER().toString('hex');
};

Key.fromHex = function (hexKey) {
	var buf = new Buffer(hexKey, 'hex');
	var d = BigInteger.fromBuffer(buf);
	return new Key(d, true);
};

Key.fromPassphrase = function(hexPass) {
	var buf = new Buffer(hexPass, 'hex');

	// take the sha256 hex of the passphrase
	buf = crypto.createHash('sha256').update(buf).digest();

	var d = BigInteger.fromBuffer(buf);
	d = d.mod(curve.n);

	return new Key(d, true);
};
