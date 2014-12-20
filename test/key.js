var vows = require('vows');
var assert = require('assert');

var Key = require('../lib/key');

var HEXDATA_TO_SIGN = 'feedfacedeadbeeffeedfacedeadbeeffeedfacedeadbeeffeedfacedeadbeef';
var PASSPHRASE = 'deadbeeffeedface';

vows.describe("Block IO ECKey Additions").addBatch({
  "Given a key": {
    topic: Key.fromHex('6b0e34587dece0ef042c4c7205ce6b3d4a64d0bc484735b9325f7971a0ead963'),
    "when deriving the pubkey": {
      topic: function (k) {
        return k.pub.toHex();
      },
      "must not throw any errors": function (e, pk) {
        assert.isNull(e);
      },
      "must return the correct pubkey": function (pk) {
        assert.strictEqual(pk, '029c06f988dc6b44696e002e8abf496a13c73c2f1db3bde2dfb69be129f3711b01');
      }
    },
    "when signing hexdata": {
      topic: function (k) {
        return k.signHex(HEXDATA_TO_SIGN);
      },
      "must not throw any errors": function (e, sd) {
        assert.isNull(e);
      },
      "must return the correct signature": function (sd) {
        assert.strictEqual(sd,'3045022100b633aaa7cd5b7af455211531f193b61d34d20fe5ea19d23dd40d6074126150530220676617cd427db7d85923ebe4426ccecc47fb5826e3e24b60e62244e2a4811086');
      }
    }
  }
}).addBatch({
  "Given a passphrase": {
    topic: PASSPHRASE,
    "when deriving a keypair": {
      topic: function (p) {
        var k = Key.fromPassphrase(p);
        return k;
      },
      "must not throw any errors": function (e, k) {
        assert.isNull(e);
      },
      "must return the correct private key": function (k) {
        assert.strictEqual(k.d.toBuffer().toString('hex'),'ae9f07f3d627531db09562bbabad4c5e023f6505b4b06122730744261953e48f');
      },
      "must return the correct public key": function (k) {
        assert.strictEqual(k.pub.toHex(),'029023d9738c623cdd7e5fdd0f41666accb82f21df5d27dc5ef07040f7bdc5d9f5');
      }
    }
  }
}).export(module);
