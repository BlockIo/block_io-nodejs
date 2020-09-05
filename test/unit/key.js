const test = require('tape');
const Key = require('../../lib/key');

const PRIVKEY = '6b0e34587dece0ef042c4c7205ce6b3d4a64d0bc484735b9325f7971a0ead963';
const PUBKEY = '029c06f988dc6b44696e002e8abf496a13c73c2f1db3bde2dfb69be129f3711b01';

const HEXDATA_TO_SIGN = 'feedfacedeadbeeffeedfacedeadbeeffeedfacedeadbeeffeedfacedeadbeef';
const SIG = '3045022100b633aaa7cd5b7af455211531f193b61d34d20fe5ea19d23dd40d6074126150530220676617cd427db7d85923ebe4426ccecc47fb5826e3e24b60e62244e2a4811086';
const SIG_LOW_R = '3044022042b9b4d673c85798f226c85f55ea6e114a0805bd5a0efba35f14c05235bb67b2022016333edae230c0ab607e948b48ceaefb5cab07300fb869d9da0a1b0f6bb53f65';

const PASSPHRASE = 'deadbeeffeedface';
const PASS_PRIV = 'ae9f07f3d627531db09562bbabad4c5e023f6505b4b06122730744261953e48f';
const PASS_PUB = '029023d9738c623cdd7e5fdd0f41666accb82f21df5d27dc5ef07040f7bdc5d9f5';

test('ECKey extensions: deriving a pubkey from hex', t => {
  t.plan(2);

  let key;
  t.doesNotThrow(() => {
    key = Key.fromHex(PRIVKEY);
    key.lowR = false;

    t.equal(key.pub.toString('hex'), PUBKEY, 'must return the correct pubkey');
  }, undefined, 'must not throw any Errors');

  test('ECKey extensions: signing hexdata', t => {
    t.plan(2);
    t.doesNotThrow(() => {
      const sd = key.signHex(HEXDATA_TO_SIGN);
      t.equal(sd, SIG, 'must return the correct signature')
    }, undefined, 'must not throw any Errors');
  });

});

test('ECKey extensions: signing with low R', t => {
  t.plan(3);

  let key;
  t.doesNotThrow(() => {
    key = Key.fromHex(PRIVKEY);
  }, undefined, 'must not throw any Errors');

  key.lowR = true;

  t.doesNotThrow(() => {
    const sd = key.signHex(HEXDATA_TO_SIGN);
    t.equal(sd, SIG_LOW_R, 'must return the correct signature')
  }, undefined, 'must not throw any Errors');

});

test('ECKey extensions: deriving a pubkey from passphrase', t => {
  t.plan(3);

  let key;
  t.doesNotThrow(() => {
    key = Key.fromPassphrase(PASSPHRASE);
    t.equal(key.priv.toString('hex'), PASS_PRIV, 'must return the correct privkey');
    t.equal(key.pub.toString('hex'), PASS_PUB, 'must return the correct pubkey');
  }, undefined, 'must not throw any Errors');

});
