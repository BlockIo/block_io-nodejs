const test = require('tape');
const CryptoHelper = require('../../lib/helper');

const PIN = '123456';
const PIN_KEY = '0EeMOVtm5YihUYzdCNgleqIUWkwgvNBcRmr7M0t9GOc=';
const CLEARTEXT = 'I\'m a little tea pot short and stout';
const CIPHERTEXT = '7HTfNBYJjq09+vi8hTQhy6lCp3IHv5rztNnKCJ5RB7cSL+NjHrFVv1jl7qkxJsOg';
const PIN_KEY_500000 = CryptoHelper.pinToKey("deadbeef", "922445847c173e90667a19d90729e1fb", 500000);

test('Deriving a PIN into an AES key', t => {
  t.plan(2);

  t.doesNotThrow(() => {
    const key = CryptoHelper.pinToKey(PIN);
    t.equal(key, PIN_KEY, 'must return the correct derived key');
  }, undefined, 'must not throw any Errors');

});

test('Deriving a PIN into an AES key with Salt', t => {
  t.plan(2);

    t.doesNotThrow(() => {
	t.equal(Buffer.from(PIN_KEY_500000, "base64").toString("hex"), "f206403c6bad20e1c8cb1f3318e17cec5b2da0560ed6c7b26826867452534172", 'must return the correct derived key');
  }, undefined, 'must not throw any Errors');

});

test('Encrypt using AES-256-ECB', t => {
  t.plan(2);

  let enc;
  t.doesNotThrow(() => {
    enc = CryptoHelper.encrypt(CLEARTEXT, PIN_KEY);
    t.equal(enc.aes_cipher_text, CIPHERTEXT, 'must return the correct ciphertext');
  }, undefined, 'does not throw any Errors');

  test('Decrypt using AES-256-ECB', t => {
    t.plan(2);
    t.doesNotThrow(() => {
      const dec = CryptoHelper.decrypt(enc.aes_cipher_text, PIN_KEY)
      t.equal(dec, CLEARTEXT, 'must return the correct cleartext');
    }, undefined, 'does not throw any Errors');

  });

});

test('Encrypt using AES-256-CBC', t => {
  t.plan(2);

  let enc;
  t.doesNotThrow(() => {
      enc = CryptoHelper.encrypt("beadbeef", PIN_KEY_500000, "11bc22166c8cf8560e5fa7e5c622bb0f", "AES-256-CBC");
    t.equal(enc.aes_cipher_text, "LExu1rUAtIBOekslc328Lw==", 'must return the correct ciphertext');
  }, undefined, 'does not throw any Errors');

  test('Decrypt using AES-256-CBC', t => {
    t.plan(2);
    t.doesNotThrow(() => {
	const dec = CryptoHelper.decrypt(enc.aes_cipher_text, PIN_KEY_500000, "11bc22166c8cf8560e5fa7e5c622bb0f", "AES-256-CBC")
      t.equal(dec, "beadbeef", 'must return the correct cleartext');
    }, undefined, 'does not throw any Errors');

  });

});

test('Encrypt using AES-256-GCM', t => {
  t.plan(3);

  let enc;
  t.doesNotThrow(() => {
      enc = CryptoHelper.encrypt("beadbeef", PIN_KEY_500000, "a57414b88b67f977829cbdca", "AES-256-GCM");
    t.equal(enc.aes_cipher_text, "ELV56Z57KoA=", 'must return the correct ciphertext');
    t.equal(enc.aes_auth_tag, "adeb7dfe53027bdda5824dc524d5e55a", 'must return the correct auth_tag');
  }, undefined, 'does not throw any Errors');

  test('Decrypt using AES-256-GCM', t => {
    t.plan(2);
    t.doesNotThrow(() => {
	const dec = CryptoHelper.decrypt(enc.aes_cipher_text, PIN_KEY_500000, "a57414b88b67f977829cbdca", "AES-256-GCM", enc.aes_auth_tag, enc.aes_auth_data)
      t.equal(dec, "beadbeef", 'must return the correct cleartext');
    }, undefined, 'does not throw any Errors');

  });

  test('Decrypt using AES-256-GCM with small auth tag', t => {
    t.plan(1);
    t.throws(() => {
	CryptoHelper.decrypt(enc.aes_cipher_text, PIN_KEY_500000, "a57414b88b67f977829cbdca", "AES-256-GCM", enc.aes_auth_tag.slice(0,30), enc.aes_auth_data);
    }, "Auth tag must be 16 bytes exactly.", 'throws an Error');

  });

});

test("DynamicExtractKey using AES-256-ECB", t => {
    t.plan(2)

    let user_key = JSON.parse('{"encrypted_passphrase":"3wIJtPoC8KO6S7x6LtrN0g==","public_key":"02f87f787bffb30396984cb6b3a9d6830f32d5b656b3e39b0abe4f3b3c35d99323","algorithm":{"pbkdf2_salt":"","pbkdf2_iterations":2048,"pbkdf2_hash_function":"SHA256","pbkdf2_phase1_key_length":16,"pbkdf2_phase2_key_length":32,"aes_iv":null,"aes_cipher":"AES-256-ECB","aes_auth_tag":null,"aes_auth_data":null}}');
    
    t.doesNotThrow(() => {
	let key = CryptoHelper.dynamicExtractKey(user_key, "deadbeef");
	t.equal(key.pub.toString('hex'), user_key.public_key, 'must return correct public key');
    }, undefined, 'does not throw any Errors');
});

test("DynamicExtractKey using AES-256-CBC", t => {
    t.plan(2)

    let user_key = JSON.parse('{"encrypted_passphrase":"LExu1rUAtIBOekslc328Lw==","public_key":"02f87f787bffb30396984cb6b3a9d6830f32d5b656b3e39b0abe4f3b3c35d99323","algorithm":{"pbkdf2_salt":"922445847c173e90667a19d90729e1fb","pbkdf2_iterations":500000,"pbkdf2_hash_function":"SHA256","pbkdf2_phase1_key_length":16,"pbkdf2_phase2_key_length":32,"aes_iv":"11bc22166c8cf8560e5fa7e5c622bb0f","aes_cipher":"AES-256-CBC","aes_auth_tag":null,"aes_auth_data":null}}');
    
    t.doesNotThrow(() => {
	let key = CryptoHelper.dynamicExtractKey(user_key, "deadbeef");
	t.equal(key.pub.toString('hex'), user_key.public_key, 'must return correct public key');
    }, undefined, 'does not throw any Errors');
});

test("DynamicExtractKey using AES-256-GCM", t => {
    t.plan(2)

    let user_key = JSON.parse('{"encrypted_passphrase":"ELV56Z57KoA=","public_key":"02f87f787bffb30396984cb6b3a9d6830f32d5b656b3e39b0abe4f3b3c35d99323","algorithm":{"pbkdf2_salt":"922445847c173e90667a19d90729e1fb","pbkdf2_iterations":500000,"pbkdf2_hash_function":"SHA256","pbkdf2_phase1_key_length":16,"pbkdf2_phase2_key_length":32,"aes_iv":"a57414b88b67f977829cbdca","aes_cipher":"AES-256-GCM","aes_auth_tag":"adeb7dfe53027bdda5824dc524d5e55a","aes_auth_data":""}}');
    
    t.doesNotThrow(() => {
	let key = CryptoHelper.dynamicExtractKey(user_key, "deadbeef");
	t.equal(key.pub.toString('hex'), user_key.public_key, 'must return correct public key');
    }, undefined, 'does not throw any Errors');
});

test('Satoshis from value string', t => {
  t.plan(4);

  t.equal(CryptoHelper.to_satoshis("1.00000000"), 100000000);
  t.equal(CryptoHelper.to_satoshis("1.12345678"), 112345678);
  t.equal(CryptoHelper.to_satoshis("0.00000001"), 1);
  t.equal(CryptoHelper.to_satoshis("0.00112500"), 112500);
});

test('Value string from Satoshis', t => {
  t.plan(4);

  t.equal(CryptoHelper.from_satoshis(100000000), "1.00000000");
  t.equal(CryptoHelper.from_satoshis(112345678), "1.12345678");
  t.equal(CryptoHelper.from_satoshis(1), "0.00000001");
  t.equal(CryptoHelper.from_satoshis(112500), "0.00112500");
});
