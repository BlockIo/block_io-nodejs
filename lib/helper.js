const crypto = require('crypto');
const pkbdf2 = require('pbkdf2');
const ECKey = require('./key');
const Bitcoin = require('bitcoinjs-lib');

const Helper = Object.create(null);

const NULL_IV = Buffer.from('');

Helper.get_redeem_script = function(required_signatures, public_keys, network_params) {
    // returns the appropriate redeem script
    let redeem_script = Bitcoin.payments.p2ms({m: required_signatures,
                                               pubkeys: public_keys.map(function(p){ return Buffer.from(p, 'hex'); }),
                                               network: network_params});
    return redeem_script;
};

Helper.from_satoshis = function(num) {
    // return a human readable string (8 decimal places) given value in satoshis

    if (num >= Number.MAX_SAFE_INTEGER)
	throw(new Error("Number exceeds or equals MAX_SAFE_INTEGER"));

    let sat_str = ["000000000", num.toString()].join("");
    let fraction_str = sat_str.slice(-8);
    let whole_str = sat_str.slice(0, -1 * fraction_str.length).replace(/^(0)+/,'');

    if (whole_str.length === 0)
	whole_str = '0';
    
    let response = [whole_str, fraction_str].join('.');

    if (num !== Helper.to_satoshis(response))
	throw(new Error("Expected to_satoshis=" + num.toString() + " but got " + Helper.to_satoshis(response).toString()));

    return response;
    
};

Helper.to_satoshis = function (num_str) {
    let splits = num_str.split(".");

    if (splits.length !== 2 || splits[1].length !== 8) {
	throw(new Error("All numbers must be 8 decimal places exactly"));
    }

    let num = parseInt(splits.join(""));

    if (num >= Number.MAX_SAFE_INTEGER)
	throw(new Error("Number exceeds or equals MAX_SAFE_INTEGER"));

    return num;

};

Helper.encrypt = function (data, key) {

	if (!Buffer.isBuffer(key)) key = Buffer.from(key, 'base64');

	const cipher = crypto.createCipheriv('aes-256-ecb', key, NULL_IV);

	const bufs = [];
	bufs.push(cipher.update(data, 'utf-8'));
	bufs.push(cipher.final());

	const ctLength = bufs[0].length + bufs[1].length;
	const ciphertext = Buffer.concat(bufs, ctLength);

	return ciphertext.toString('base64');
};

Helper.decrypt = function (ciphertext, key) {

	if (!Buffer.isBuffer(key)) key = Buffer.from(key, 'base64');

	const cipher = crypto.createDecipheriv('aes-256-ecb', key, NULL_IV);

	const bufs = [];
	bufs.push(cipher.update(ciphertext, 'base64'));
	bufs.push(cipher.final());

	const tLength = bufs[0].length + bufs[1].length;
	const text = Buffer.concat(bufs, tLength);

	return text.toString('utf-8');
};

Helper.pinToKey = function (pin, salt, iterations) {
	if (!salt) salt = '';
	if (!iterations) iterations = 2048;

	let buf;
	buf = pkbdf2.pbkdf2Sync(pin, salt, iterations / 2, 16, 'sha256');
	buf = pkbdf2.pbkdf2Sync(buf.toString('hex'), salt, iterations / 2, 32, 'sha256');

	return buf.toString('base64');
};

Helper.extractKey = function (encrypted_data, b64_enc_key) {
	const decrypted = this.decrypt(encrypted_data, b64_enc_key);
	return ECKey.fromPassphrase(decrypted);
};

Helper.signInputs = function (privkey, inputs) {
	if (!(privkey instanceof ECKey)) return inputs;

	const pubkey = privkey.pub.toString('hex');

    inputs.forEach(function (input) {
      input.signers.forEach(function (signer) {

        if (signer.signer_public_key !== pubkey) return;
        signer.signed_data = privkey.signHex(input.data_to_sign);

      });
    });

    return inputs;
};

module.exports = Helper;
