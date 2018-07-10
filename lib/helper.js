var crypto = require('crypto');
var pkbdf2 = require('pbkdf2');
var ECKey = require('./key');

var Helper = module.exports = {};

var NULL_IV = new Buffer(0);

Helper.encrypt = function (data, key) {

	if (!Buffer.isBuffer(key)) key = new Buffer(key, 'base64');

	var cipher = crypto.createCipheriv('aes-256-ecb', key, NULL_IV);

	var bufs = [];
	bufs.push(cipher.update(data, 'utf-8'));
	bufs.push(cipher.final());

	var ctLength = bufs[0].length + bufs[1].length;
	var ciphertext = Buffer.concat(bufs, ctLength);

	return ciphertext.toString('base64');
};

Helper.decrypt = function (ciphertext, key) {

	if (!Buffer.isBuffer(key)) key = new Buffer(key, 'base64');

	var cipher = crypto.createDecipheriv('aes-256-ecb', key, NULL_IV);

	var bufs = [];
	bufs.push(cipher.update(ciphertext, 'base64'));
	bufs.push(cipher.final());

	var tLength = bufs[0].length + bufs[1].length;
	var text = Buffer.concat(bufs, tLength);

	return text.toString('utf-8');
};

Helper.pinToKey = function (pin, salt, iterations) {
	if (!salt) salt = '';
	if (!iterations) iterations = 2048;

       var buf = pkbdf2.pbkdf2Sync(pin, salt, iterations / 2, 16, 'sha256');
       buf = pkbdf2.pbkdf2Sync(buf.toString('hex'), salt, iterations / 2, 32, 'sha256');

	return buf.toString('base64');
};

Helper.extractKey = function (encrypted_data, b64_enc_key) {
	var decrypted = this.decrypt(encrypted_data, b64_enc_key);
	return ECKey.fromPassphrase(decrypted);
};

Helper.signInputs = function (privkey, inputs) {
	if (!(privkey instanceof ECKey)) return inputs;

	var pubkey = privkey.pub.toHex();

    inputs.forEach(function (input) {
      input.signers.forEach(function (signer) {

        if (signer.signer_public_key !== pubkey) return;
        signer.signed_data = privkey.signHex(input.data_to_sign);

      });
    });

    return inputs;
};
