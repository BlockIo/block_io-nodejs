var vows = require('vows');
var assert = require('assert');

var CryptoHelper = require('../lib/helper');

var PIN = '123456';
var PIN_KEY = '0EeMOVtm5YihUYzdCNgleqIUWkwgvNBcRmr7M0t9GOc=';
var CLEARTEXT = 'I\'m a little tea pot short and stout';
var CIPHERTEXT = '7HTfNBYJjq09+vi8hTQhy6lCp3IHv5rztNnKCJ5RB7cSL+NjHrFVv1jl7qkxJsOg';

vows.describe("Block.io CryptoHelper").addBatch({
  "Given a PIN": {
    topic: PIN,
    "when derived into an AES key": {
      topic: function (pin) {
        return CryptoHelper.pinToKey(pin);
      },
      "must not throw any errors": function (e, k) {
        assert.isNull(e);
      },
      "must return the correct derived key": function (k) {
        assert.strictEqual(k, PIN_KEY);
      }
    }
  }
}).addBatch({
  "Given some data": {
    topic: CLEARTEXT,
    "when encrypted": {
      topic: function (ct) {
        return CryptoHelper.encrypt(ct, PIN_KEY);
      },
      "must not throw any errors": function (e, xt) {
        assert.isNull(e);
      },
      "must return the correct ciphertext": function (xt) {
        assert.strictEqual(xt, CIPHERTEXT);
      },
      "and decrypted": {
        topic: function (xt) {
          return CryptoHelper.decrypt(xt, PIN_KEY);
        },
        "must not throw any errors": function (e, ct) {
          assert.isNull(e);
        },
        "must return the correct cleartext": function (ct) {
          assert.strictEqual(ct, CLEARTEXT);
        }
      }
    }
  }
}).export(module);
