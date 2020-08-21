const crypto = require('crypto');
const pkbdf2 = require('pbkdf2');
const ECKey = require('./key');

const Helper = Object.create(null);

const NULL_IV = Buffer.from('');

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
