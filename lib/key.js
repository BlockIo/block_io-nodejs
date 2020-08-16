var crypto = require('crypto');
var util = require('util');
var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');

function Key (d, compressed) {
	const pair = Buffer.isBuffer(d) ?
		new Bitcoin.ECPair(d, undefined, { compressed: compressed }) : d;

	Object.defineProperty(this, 'ecpair', { value: pair, writable: false });

	Object.defineProperty(this, 'pub', { get: () => this.ecpair.publicKey });
	Object.defineProperty(this, 'priv', { get: () => this.ecpair.privateKey });

};

// inherit factory ECKey.makeRandom();
Key.makeRandom = function () {
	const pair = Bitcoin.ECPair.makeRandom.apply(Bitcoin.ECKey, arguments);
	return new Key(pair);
};

// inherit factory ECKey.makeRandom();
Key.fromWIF = function () {
	const pair = Bitcoin.ECPair.fromWIF.apply(Bitcoin.ECKey, arguments);
	return new Key(pair);
};

Key.prototype.signHex = function (hexData) {
	const buf = Buffer.from(hexData, 'hex');
	const sig = this.ecpair.sign(buf)
	const scriptSig = Bitcoin.script.signature.encode(sig, 0x01);
	return scriptSig.slice(0, scriptSig.length-1).toString('hex');
};

Key.fromBuffer = function (buf) {
	//assert(Buffer.isBuffer(buf));
	const pair = Bitcoin.ECPair.fromPrivateKey(buf, {compressed: true});
	return new Key(pair);
};

Key.fromHex = function (hexKey) {
	return this.fromBuffer(Buffer.from(hexKey, 'hex'));
};

Key.fromPassphrase = function(pass) {
	const buf = Buffer.isBuffer(pass) ? pass : Buffer.from(pass, 'hex');
	const hash = crypto.createHash('sha256').update(buf).digest();
	return this.fromBuffer(hash);
};

Key.fromPassphraseString = function(pass) {
	return this.fromPassphrase(Buffer.from(pass));
};

module.exports = Key;
