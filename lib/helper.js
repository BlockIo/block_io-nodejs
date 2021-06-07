const crypto = require('crypto');
const pkbdf2 = require('pbkdf2');
const ECKey = require('./key');
const Bitcoin = require('bitcoinjs-lib');

const Helper = Object.create(null);

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

Helper.encrypt = function (data, key, iv, cipher_type, auth_data) {

    if (!Buffer.isBuffer(key)) key = Buffer.from(key, 'base64');
    if (!iv) iv = '';
    if (!cipher_type) cipher_type = "AES-256-ECB"; // legacy
    if (!auth_data) auth_data = "";
    
    const cipher = crypto.createCipheriv(cipher_type.toLowerCase(), key, Buffer.from(iv, 'hex'));

    if (cipher_type === "AES-256-GCM") cipher.setAAD(Buffer.from(auth_data, 'hex'));
    
    const bufs = [];
    bufs.push(cipher.update(data, 'utf-8'));
    bufs.push(cipher.final());
    
    const ctLength = bufs[0].length + bufs[1].length;
    const ciphertext = Buffer.concat(bufs, ctLength);

    // the response will contain information about how this encryption was done
    let response = {};
    response.aes_iv = iv;
    response.aes_cipher_text = ciphertext.toString('base64');
    response.aes_auth_tag = null;
    response.aes_auth_data = null;
    response.aes_cipher = cipher_type;
    if (cipher_type === "AES-256-GCM") {
	response.aes_auth_tag = cipher.getAuthTag().toString('hex');
	response.aes_auth_data = auth_data;
    }
    
    return response;
};

Helper.decrypt = function (ciphertext, key, iv, cipher_type, auth_tag, auth_data) {

    if (!Buffer.isBuffer(key)) key = Buffer.from(key, 'base64');
    if (!iv) iv = '';
    if (!cipher_type) cipher_type = "AES-256-ECB"; // legacy
    if (!auth_data) auth_data = "";
    
    const cipher = crypto.createDecipheriv(cipher_type.toLowerCase(), key, Buffer.from(iv, 'hex'));
    
    if (cipher_type === "AES-256-GCM") {
	// set the auth tag and auth data for GCM

	if (auth_tag.length !== 32) throw new Error("Auth tag must be 16 bytes exactly.");
	
	cipher.setAuthTag(Buffer.from(auth_tag, 'hex'));
	cipher.setAAD(Buffer.from(auth_data, 'hex'));
    }
    
    const bufs = [];
    bufs.push(cipher.update(ciphertext, 'base64'));
    bufs.push(cipher.final());
    
    const tLength = bufs[0].length + bufs[1].length;
    const text = Buffer.concat(bufs, tLength);
    
    return text.toString('utf-8');
};

Helper.pinToKey = function (pin, salt, iterations, hash_function, phase1_key_length, phase2_key_length) {
	if (!salt) salt = '';
        if (!iterations) iterations = 2048;
        if (!phase1_key_length) phase1_key_length = 16;
        if (!phase2_key_length) phase2_key_length = 32;
        if (!hash_function) hash_function = 'sha256';

        if (hash_function.toLowerCase() !== "sha256")
           throw(new Error("Unknown hash function specified. Are you using current version of this library?"));
    
	let buf;
        buf = pkbdf2.pbkdf2Sync(pin, salt, iterations / 2, phase1_key_length, hash_function);
        buf = pkbdf2.pbkdf2Sync(buf.toString('hex'), salt, iterations / 2, phase2_key_length, hash_function);

	return buf.toString('base64');
};

Helper.dynamicExtractKey = function (user_key, pin) {
    // uses the appropriate algorithm to decrypt user's private key

    // legacy
    let algorithm = JSON.parse("{\"pbkdf2_salt\":\"\",\"pbkdf2_iterations\":2048,\"pbkdf2_hash_function\":\"SHA256\",\"pbkdf2_phase1_key_length\":16,\"pbkdf2_phase2_key_length\":32,\"aes_iv\":null,\"ae\
s_cipher\":\"AES-256-ECB\",\"aes_auth_tag\":null,\"aes_auth_data\":null}");

    // we got the algorithm, so use that instead
    if (user_key.algorithm) algorithm = user_key.algorithm;
    
    const aes_key = this.pinToKey(pin, algorithm.pbkdf2_salt, algorithm.pbkdf2_iterations, algorithm.pbkdf2_hash_function, algorithm.pbkdf2_phase1_key_length,
                                  algorithm.pbkdf2_phase2_key_length);
    const decrypted = this.decrypt(user_key.encrypted_passphrase, aes_key,
                                   algorithm.aes_iv, algorithm.aes_cipher,
                                   algorithm.aes_auth_tag,
                                   algorithm.aes_auth_data);
    
    return ECKey.fromPassphrase(decrypted);
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
