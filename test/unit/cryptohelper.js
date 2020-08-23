const test = require('tape');
const CryptoHelper = require('../../lib/helper');

const PIN = '123456';
const PIN_KEY = '0EeMOVtm5YihUYzdCNgleqIUWkwgvNBcRmr7M0t9GOc=';
const CLEARTEXT = 'I\'m a little tea pot short and stout';
const CIPHERTEXT = '7HTfNBYJjq09+vi8hTQhy6lCp3IHv5rztNnKCJ5RB7cSL+NjHrFVv1jl7qkxJsOg';

test('Deriving a PIN into an AES key', t => {
  t.plan(2);

  t.doesNotThrow(() => {
    const key = CryptoHelper.pinToKey(PIN);
    t.equal(key, PIN_KEY, 'must return the correct derived key');
  }, undefined, 'must not throw any Errors');

});

test('Encrypting some data', t => {
  t.plan(2);

  let enc;
  t.doesNotThrow(() => {
    enc = CryptoHelper.encrypt(CLEARTEXT, PIN_KEY);
    t.equal(enc, CIPHERTEXT, 'must return the correct ciphertext');
  }, undefined, 'does not throw any Errors');

  test('Decrypting the encrypted data', t => {
    t.plan(2);
    t.doesNotThrow(() => {
      const dec = CryptoHelper.decrypt(enc, PIN_KEY)
      t.equal(dec, CLEARTEXT, 'must return the correct cleartext');
    }, undefined, 'does not throw any Errors');

  });

});
