var vows = require('vows');
var assert = require('assert');
var cache = require('./helpers/cache');
var genericHelpers = require('./helpers/generic');

var BlockIo = require('../lib/block_io');
var Bitcoin = require('bitcoinjs-lib');

genericHelpers.checkEnv();

if (process.env.DEBUG) process.on('uncaughtException', function (e) { console.log(e.stack); });

var API_KEY = process.env.BLOCK_IO_API_KEY;
var PIN = process.env.BLOCK_IO_PIN;
var VERSION = process.env.BLOCK_IO_VERSION || BlockIo.DEFAULT_VERSION;
var SERVER = process.env.BLOCK_IO_SERVER || '';
var PORT = process.env.BLOCK_IO_PORT || '';
var FEES = {BTC: 0.0001, BTCTEST: 0.0001, DOGE: 1, DOGETEST: 1, LTC: 0.001, LTCTEST: 0.001};
var DTRUSTLABEL = ((new Date()).getTime() + 11).toString(36);

var REQUIRED_SIGS = 2;

// insecure keys for testing ;)
var KEYS = [
  BlockIo.ECKey.fromPassphrase(new Buffer('key1')),
  BlockIo.ECKey.fromPassphrase(new Buffer('key2')),
  BlockIo.ECKey.fromPassphrase(new Buffer('key3'))
];

var SIG_ADDRS = [
  'nZ7QHcpJ5tpzxQUV8vEnGU4m7zLjkNiMBU',
  'nj8visBXviBNZs5zXkn6DYG6Nc97Nv995g',
  'nUknbqqhSXHATS7SMH7wqf9e9tJcEZb3HY'
];

var client = new BlockIo({api_key: API_KEY, version: VERSION, server: SERVER, port: PORT});

var spec = vows.describe("block.io distributed trust api");

// get new dtrust address
spec.addBatch({
  "get_new_dtrust_address": genericHelpers.makeMethodCase(
    client,
    'get_new_dtrust_address',
    {
      label: DTRUSTLABEL,
      required_signatures: REQUIRED_SIGS ,
      public_keys: KEYS.map(function (key) { return key.pub.toHex(); }).join(',')
    },
    {
      "must return an address": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.address);
        cache('newDtrustAddress', res.data.address);
      },
      "must return the label": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.strictEqual(res.data.label, DTRUSTLABEL);
      },
      "must return the right number of required signatures": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.strictEqual(res.data.additional_required_signatures, REQUIRED_SIGS);
      },
      "must return the correct addresses": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.additional_signers);
        assert.deepEqual(res.data.additional_signers, SIG_ADDRS);
      },
      "must return a valid redeem_script": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.redeem_script);
        assert.ok(Bitcoin.Script.fromASM(res.data.redeem_script));
      }
    }
  )
}).addBatch({
  "get_new_dtrust_address (too high required sigs)": genericHelpers.makeFailingCase(
    client,
    'get_new_dtrust_address',
    {
      label: DTRUSTLABEL,
      required_signatures: KEYS.length + 1 ,
      public_keys: KEYS.map(function (key) { return key.pub.toHex(); }).join(',')
    }
  ),
  "get_new_dtrust_address (duplicate signers)": genericHelpers.makeFailingCase(
    client,
    'get_new_dtrust_address',
    {
      label: DTRUSTLABEL,
      required_signatures: KEYS.length,
      public_keys: KEYS.map(function (key) { return KEYS[0].pub.toHex(); }).join(',')
    }
  )
});

// get dtrust addresses
spec.addBatch({
  "get_my_dtrust_addresses": genericHelpers.makeMethodCase(
    client, 'get_my_dtrust_addresses', {}, {
    "must specify a network": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.network);
      assert.ok(genericHelpers.FEES.hasOwnProperty(res.data.network));
      cache('minFee', genericHelpers.FEES[res.data.network]);
      },
      "must return an address": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.addresses);
        assert.isString(res.data.addresses[0].address);
        assert.isString(res.data.addresses[0].label);

        // cache address with sufficient balance for next tests;
        var hasBalance = res.data.addresses.some(function (addr) {
          if (parseFloat(addr.available_balance, 10) > (20 * cache('minFee'))) {
            cache('fromDTrustAddress', addr.address);
            cache('fromDTrustLabel', addr.label);
            return true;
          }
          return false;
        });

        if (!hasBalance) {
          console.log('ERROR: Not enough balance to continue tests!');
          process.exit(1);
        }
      }
    }
  )
});

spec.addBatch({
  'get_dtrust_network_fee_estimate': genericHelpers.makeMethodCase(
    client,
    'get_dtrust_network_fee_estimate',
    {
      from_address: cache.lazy('fromDTrustAddress'),
      amounts: genericHelpers.calcWithdrawalAmount,
      to_addresses: cache.lazy('newDtrustAddress')
    },
    {
      "must return fee estimation data": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.estimated_network_fee);
      }
    }
  )
});

// withdraw
spec.addBatch({
  "withdraw_from_dtrust_address": genericHelpers.makeMethodCase(
    client,
    'withdraw_from_dtrust_address',
    {
      from_addresses: cache.lazy('fromDTrustAddress'),
      to_label: DTRUSTLABEL,
      amount: genericHelpers.calcWithdrawalAmount,
      pin: PIN
    },
    {
      "must return the response for manual signing": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.reference_id);
        assert.isArray(res.data.inputs);
        assert.isNull(res.data.encrypted_passphrase);
        cache('dtrustWithdrawal', res);
      },
      "must require the correct amounts of sigs": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.inputs);
        res.data.inputs.forEach(function (input) {
          assert.strictEqual(input.signatures_needed, REQUIRED_SIGS);
        });
      }
    }
  )
});

spec.addBatch({
  "Given a cached sign request": {
    topic: cache.lazy('dtrustWithdrawal'),

    "must be a valid request": function (res) {
      if (!res) process.exit();
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.reference_id);
      assert.isArray(res.data.inputs);
      assert.isNull(res.data.encrypted_passphrase);
    },
    "when signed with 1 key": {
      topic: function (res) {
        res.data.inputs = BlockIo.helper.signInputs(KEYS[0], res.data.inputs);

        var cb = this.callback;
        var _cb = function (err, nextRes) { cb(err, nextRes, res); };

        client.sign_and_finalize_withdrawal({signature_data: JSON.stringify(res.data)}, _cb);
      },
      "must not return an error": function (err, data) {
        if (process.env.DEBUG && err) console.log(data);
        assert.isNull(err);
      },
      "must return status 'success'": function (err, data) {
        assert.isObject(data);
        if (process.env.DEBUG && data.status != 'success') console.log(data);
        assert.equal(data.status, 'success');
      },
      "must return the correct reference_id": function (err, res1, res2) {
        assert.isObject(res1);
        assert.isObject(res1.data);
        assert.isString(res1.data.reference_id);
        assert.isObject(res2);
        assert.isObject(res2.data);
        assert.isString(res2.data.reference_id);
        assert.strictEqual(res1.data.reference_id, res2.data.reference_id);
      },
      "must have decreased the amount of required sigs": function (err, res1, res2) {
        assert.isObject(res1);
        assert.isObject(res1.data);
        assert.isArray(res1.data.inputs);
        res1.data.inputs.forEach(function (input) {
          assert.strictEqual(input.signatures_needed, REQUIRED_SIGS - 1);
        });
      }
    }

  }
});

spec.addBatch({
  "Given a cached sign request": {
    topic: cache.lazy('dtrustWithdrawal'),
    "when signed with 2 keys": (function () {
      var testCase = {
        topic: function (res) {
          res.data.inputs = BlockIo.helper.signInputs(KEYS[0], res.data.inputs);
          res.data.inputs = BlockIo.helper.signInputs(KEYS[2], res.data.inputs);

          var cb = this.callback;
          var _cb = function (err, nextRes) { cb(err, nextRes, res); };

          client.sign_and_finalize_withdrawal({signature_data: JSON.stringify(res.data)}, _cb);
        }
      };
      var txchk = genericHelpers.makeTxAssertions();
      Object.keys(txchk).forEach(function (k) {
        testCase[k] = txchk[k];
      });

      return testCase;
    })()
  }
});

spec.addBatch({
  "Given a cached but expired sign request": {
    topic: cache.lazy('dtrustWithdrawal'),
    "when signed with 1 key": {
      topic: function (res) {
        res.data.inputs = BlockIo.helper.signInputs(KEYS[0], res.data.inputs);

        var cb = this.callback;
        var _cb = function (err, nextRes) { cb(err, nextRes, res); };

        client.sign_and_finalize_withdrawal({signature_data: JSON.stringify(res.data)}, _cb);
      },
      "must return an error": function (err, data) {
        assert.instanceOf(err, Error);
      },
      "must return status 'fail'": function (err, data) {
        assert.isObject(data);
        if (process.env.DEBUG && data.status != 'fail') console.log(data);
        assert.equal('fail', data.status);
      },
      "must return an error message": function (err, data) {
        assert.isString(data.data.error_message);
        assert.ok(/reference_id/.test(data.data.error_message));
        assert.ok(/no\slonger\svalid/.test(data.data.error_message));
      }
    }
  }
});

spec.addBatch({
  "archive_dtrust_address": genericHelpers.makeMethodCase(
    client,
    'archive_dtrust_address',
    {
      address: cache.lazy('newDtrustAddress')
    },
    {
      "must echo the address we archived ": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.addresses);
        assert.ok(res.data.addresses.some(function (addr) {
          return (
            addr.address == cache('newDtrustAddress') && addr.archived
          );
        }));
      },
      "and then queried dtrust addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_dtrust_addresses',
        {},
        {
          "must not contain the archived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.strictEqual(res.data.addresses.filter(function (addr) {
              return addr.address == cache('newDtrustAddress');
            }).length, 0);
          }
        }
      ),
      "and then queried archived dtrust addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_archived_dtrust_addresses',
        {},
        {
          "must contain the archived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.ok(res.data.addresses.some(function (addr) {
              return addr.address == cache('newDtrustAddress');
            }));
          }
        }
      )
    }
  )
});

spec.addBatch({
  "unarchive_dtrust_address": genericHelpers.makeMethodCase(
    client,
    'unarchive_dtrust_address',
    {
      address: cache.lazy('newDtrustAddress')
    },
    {
      "must echo the address we unarchived ": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.addresses);
        assert.ok(res.data.addresses.some(function (addr) {
          return (addr.address == cache('newDtrustAddress') && !addr.archived);
        }));
      },
      "and then queried archived dtrust addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_archived_dtrust_addresses',
        {},
        {
          "must not contain the unarchived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.strictEqual(res.data.addresses.filter(function (addr) {
              return addr.address == cache('newDtrustAddress');
            }).length, 0);
          }
        }
      ),
      "and then queried dtrust addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_dtrust_addresses',
        {},
        {
          "must contain the unarchived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.ok(res.data.addresses.some(function (addr) {
              return addr.address == cache('newDtrustAddress');
            }));
          }
        }
      )
    }
  )
});

if (genericHelpers.checkEnv() && VERSION > 1) spec.export(module);
