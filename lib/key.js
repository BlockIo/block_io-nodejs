const crypto = require('crypto');
const Bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const ecpair = require('ecpair');
const ecpairFactory = ecpair.ECPairFactory(ecc);

function fixed_size_low_r_sign(d, hash, lowR) {
    // forces low R signatures so 3rd byte of DER sig (size of R) is 0x20 exactly
    // our tests use this because our other libraries use fixed size R values
    if (!d) throw new Error('Missing private key');
    if (lowR === undefined) lowR = true;
    if (lowR === false) {
      return Buffer.from(ecc.sign(hash, d).buffer);
    } else {
	let sig = Buffer.from(ecc.sign(hash, d).buffer);
	const extraData = Buffer.alloc(32, 0);
	let counter = 0;
	// if first try is lowR, skip the loop
	// for second try and on, add extra entropy counting up
	while (Bitcoin.script.signature.encode(sig, Bitcoin.Transaction.SIGHASH_ALL)[3] !== 0x20 || sig[0] > 0x7f) {
            counter++;
            extraData.writeUIntLE(counter, 0, 6);
            sig = Buffer.from(ecc.sign(hash, d, extraData).buffer);
	}
	return sig;
    }
    
}

function Key (d, compressed) {
     const pair = Buffer.isBuffer(d) ? ecpairFactory.fromPrivateKey(d, {compressed: compressed}) : d;

     Object.defineProperty(this, 'ecpair', { value: pair, writable: false });

     Object.defineProperty(this, 'pub', { get: () => this.ecpair.publicKey });
     Object.defineProperty(this, 'priv', { get: () => this.ecpair.privateKey });
     Object.defineProperty(this, 'lowR', {
       get: () => this.ecpair.lowR,
       set: val => { this.ecpair.lowR = !!val },
     });

    // lowR is default
    this.lowR = true;

}

// inherit factory ECKey.makeRandom();
Key.makeRandom = function () {
    const pair = ecpairFactory.makeRandom.apply(ecpair.ECPairAPI, arguments);
    return new Key(pair);
};

// inherit factory ECKey.makeRandom();
Key.fromWIF = function () {
	const pair = ecpairFactory.fromWIF.apply(ecpair.ECPairAPI, arguments);
	return new Key(pair);
};

Key.prototype.signHex = function (hexData) {
	const buf = Buffer.from(hexData, 'hex');
        const sig = fixed_size_low_r_sign(this.ecpair.__D, buf, this.lowR); //Buffer.from(this.ecpair.sign(buf.buffer)
        const scriptSig = Bitcoin.script.signature.encode(sig, Bitcoin.Transaction.SIGHASH_ALL);
	return scriptSig.slice(0, scriptSig.length-1).toString('hex');
};

Key.fromBuffer = function (buf) {
	//assert(Buffer.isBuffer(buf));
	const pair = ecpairFactory.fromPrivateKey(buf, {compressed: true});
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
