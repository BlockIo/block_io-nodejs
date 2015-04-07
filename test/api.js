var vows = require('vows');
var assert = require('assert');
var cache = require('./helpers/cache');
var genericHelpers = require('./helpers/generic');
var networks = require('../lib/networks');

var BlockIo = require('../lib/block_io');

var API_KEY = process.env.BLOCK_IO_API_KEY;
var PIN = process.env.BLOCK_IO_PIN;
var VERSION = process.env.BLOCK_IO_VERSION || BlockIo.DEFAULT_VERSION;
var SERVER = process.env.BLOCK_IO_SERVER || '';
var PORT = process.env.BLOCK_IO_PORT || '';
var NEWLABEL = (new Date()).getTime().toString(36);

if (process.env.DEBUG) process.on('uncaughtException', function (e) { console.log(e.stack); });

var client = new BlockIo({
  api_key: API_KEY,
  version: VERSION,
  server: SERVER,
  port: PORT
});

var pinLessClient = new BlockIo({
  api_key: API_KEY,
  version: VERSION,
  server: SERVER,
  port: PORT,
  options: { allowNoPin: true }
});

var badApiKeyClient = new BlockIo({
  api_key: "1111-1111-1111-1111",
  version: VERSION,
  server: SERVER,
  port: PORT
});

console.log('URL:', client._constructURL(''));

var spec = vows.describe("block.io node.js api wrapper");

if (VERSION > 1) spec.addBatch({
  "validate_api_key (valid)": genericHelpers.makeMethodCase(
    client,
    'validate_api_key',
    {},
    {
      "must return the network": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.network);
        cache('network', networks.getNetwork(res.data.network));
      }
    }),
  "validate_api_key (invalid)": {
    topic: function () {
      badApiKeyClient.validate_api_key({}, this.callback);
    },
    "must return an error": function (err, res) {
      if (process.env.DEBUG && !(err instanceof Error)) console.log(err, res);
      assert.instanceOf(err, Error);
    }
  }
});

spec.addBatch({
  "get_balance": genericHelpers.makeMethodCase(client, 'get_balance', {}),
  "get_new_address": genericHelpers.makeMethodCase(client, 'get_new_address', {})
});

spec.addBatch({
  "get_new_address (with label)": genericHelpers.makeMethodCase(client, 'get_new_address', {label: NEWLABEL}, {
    "must return an address": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.address);
      cache('newAddress', res.data.address);
    },
    "must return the label": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.strictEqual(res.data.label, NEWLABEL);
    }
  })
});

spec.addBatch({
  "get_my_addresses": genericHelpers.makeMethodCase(client, 'get_my_addresses', {}, {
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
          cache('fromAddress', addr.address);
          cache('fromLabel', addr.label);
          return true;
        }
        return false;
      });

      if (!hasBalance) {
        console.log('ERROR: Not enough balance to continue tests!');
        process.exit(1);
      }
    }
  })
});

if (VERSION > 1) spec.addBatch({
  'get_network_fee_estimate': genericHelpers.makeMethodCase(
    client,
    'get_network_fee_estimate',
    {
      from_address: cache.lazy('fromAddress'),
      amounts: genericHelpers.calcWithdrawalAmount,
      to_addresses: cache.lazy('newAddress')
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

// depreciated after v1:
if (VERSION == 1) spec.addBatch({
  "get_address_received (by address)": genericHelpers.makeMethodCase(
    client,
    'get_address_received',
    { address: cache.lazy('fromAddress') },
    {
      "must return balance data": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.confirmed_received);
        assert.isString(res.data.unconfirmed_received);
      }
    }
  ),
  "get_address_received (by label)": genericHelpers.makeMethodCase(
    client,
    'get_address_received',
    { label: cache.lazy('fromLabel') },
    {
      "must return balance data": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.confirmed_received);
        assert.isString(res.data.unconfirmed_received);
      }
    }
  )
});


// specific for > v1:
if (VERSION > 1) spec.addBatch({
  "get_address_balance (by address)": genericHelpers.makeMethodCase(
    client,
    'get_address_balance',
    { address: cache.lazy('fromAddress') },
    {
      "must return balance data": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.available_balance);
        assert.isString(res.data.pending_received_balance);
      }
    }
  ),
  "get_address_balance (received, by label)": genericHelpers.makeMethodCase(
    client,
    'get_address_balance',
    { label: cache.lazy('fromLabel'), type: 'received'  },
    {
      "must return balance data": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.available_balance);
        assert.isString(res.data.pending_received_balance);
      }
    }
  )
});

spec.addBatch({
  "withdraw_from_address": genericHelpers.makeMethodCase(
    client,
    'withdraw_from_address',
    {
      from_addresses: cache.lazy('fromAddress'),
      to_label: NEWLABEL,
      amount: genericHelpers.calcWithdrawalAmount,
      pin: PIN
    },
    genericHelpers.makeTxAssertions()
  )
});

spec.addBatch({
  "withdraw_from_label": genericHelpers.makeMethodCase(
    client,
    'withdraw_from_label',
    {
      from_labels: cache.lazy('fromLabel'),
      payment_address: cache.lazy('newAddress'),
      amount: genericHelpers.calcWithdrawalAmount,
      pin: PIN
    },
    genericHelpers.makeTxAssertions()
  )
});


spec.addBatch({
  "withdraw_from_address (without PIN)": {
    topic: function () {
      client.pin = null;
      client.aesKey = null;
      client.withdraw_from_address({
        from_addresses: cache('fromAddress'),
        payment_address: cache('newAddress'),
        amount: genericHelpers.calcWithdrawalAmount()
      }, this.callback);
    },
    "must return an error": function (err, res) {
      if (process.env.DEBUG && !(err instanceof Error)) console.log(err, res);
      assert.instanceOf(err, Error);
    }
  }
});

if (VERSION > 1) spec.addBatch({
  "withdraw_from_address (with allowNoPin flag)": genericHelpers.makeMethodCase(
    pinLessClient,
    'withdraw_from_label',
    {
      from_labels: cache.lazy('fromLabel'),
      payment_address: cache.lazy('newAddress'),
      amount: genericHelpers.calcWithdrawalAmount
    },
    {
      "must return a transaction to sign": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.reference_id);
        assert.isObject(res.data.encrypted_passphrase);
        assert.isArray(res.data.inputs);
      }
    }
  )
});

if (VERSION > 1) spec.addBatch({
  "get_transactions (received)": genericHelpers.makeMethodCase(
    client,
    'get_transactions',
    {
      type: 'received'
    },
    {
      "must return an object containing transaction data": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.network);
        assert.isArray(res.data.txs);
      },
      "may return transactions": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.txs);

        if (res.data.txs.length) res.data.txs.forEach(function (tx) {
          assert.isObject(tx);
          assert.isString(tx.txid);
          assert.isBoolean(tx.from_green_address);
          assert.isNumber(tx.confirmations);
          assert.isArray(tx.amounts_received);
          assert.isArray(tx.senders);
          assert.isNumber(tx.confidence);
        });

      }
    }
  )
});

if (VERSION > 1) spec.addBatch({
  "get_transactions (spent)": genericHelpers.makeMethodCase(
    client,
    'get_transactions',
    {
      type: 'sent'
    },
    {
      "must return an object containing transaction data": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.network);
        assert.isArray(res.data.txs);
      },
      "may return transactions": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.txs);

        if (res.data.txs.length) res.data.txs.forEach(function (tx) {
          assert.isObject(tx);
          assert.isString(tx.txid);
          assert.isBoolean(tx.from_green_address);
          assert.isNumber(tx.confirmations);
          assert.isString(tx.total_amount_sent);
          assert.isArray(tx.amounts_sent);
          assert.isArray(tx.senders);
          assert.isNumber(tx.confidence);
        });

      }
    }
  )
});

if (VERSION > 1) spec.addBatch({
  "archive_address": genericHelpers.makeMethodCase(
    client,
    'archive_address',
    {
      address: cache.lazy('newAddress')
    },
    {
      "must echo the address we archived ": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.addresses);
        assert.ok(res.data.addresses.some(function (addr) {
          return (
            addr.address == cache('newAddress') && addr.archived
          );
        }));
      },
      "and then queried account addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_addresses',
        {},
        {
          "must not contain the archived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.strictEqual(res.data.addresses.filter(function (addr) {
              return addr.address == cache('newAddress');
            }).length, 0);
          }
        }
      ),
      "and then queried archived addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_archived_addresses',
        {},
        {
          "must contain the archived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.ok(res.data.addresses.some(function (addr) {
              return addr.address == cache('newAddress');
            }));
          }
        }
      )
    }
  )
});

if (VERSION > 1) spec.addBatch({
  "unarchive_address": genericHelpers.makeMethodCase(
    client,
    'unarchive_address',
    {
      address: cache.lazy('newAddress')
    },
    {
      "must echo the address we unarchived ": function (err, res, r) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isArray(res.data.addresses);
        assert.ok(res.data.addresses.some(function (addr) {
          return (addr.address == cache('newAddress') && !addr.archived);
        }));
      },
      "and then queried archived addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_archived_addresses',
        {},
        {
          "must not contain the unarchived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.strictEqual(res.data.addresses.filter(function (addr) {
              return addr.address == cache('newAddress');
            }).length, 0);
          }
        }
      ),
      "and then queried account addresses": genericHelpers.makeMethodCase(
        client,
        'get_my_addresses',
        {},
        {
          "must contain the unarchived address": function (err, res, r) {
            assert.isObject(res);
            assert.isObject(res.data);
            assert.isArray(res.data.addresses);
            assert.ok(res.data.addresses.some(function (addr) {
              return addr.address == cache('newAddress');
            }));
          }
        }
      )
    }
  )
});

if (VERSION > 1) spec.addBatch({
  "A random address": {
    topic: function () {
      var key = new BlockIo.ECKey();
      var address = key.pub.getAddress(cache('network')).toString();
      var wif = key.toWIF(cache('network'));

      cache('sweepWIF', wif);
      var callback = this.callback;

      client.withdraw_from_address({
        from_addresses: cache('fromAddress'),
        payment_address: address,
        pin: PIN,
        amount: genericHelpers.calcWithdrawalAmount()
      }, function (e, res) {
        if (!res || typeof(res) !== 'object') res = {};
        res._wif = wif;
        callback(e, res);
      });
    },
    "must not throw an error": function (e, res) {
      assert.isNull(e);
    },
    "and sweep_from_address": genericHelpers.makeMethodCase(
      client,
      'sweep_from_address',
      {
        private_key: cache.lazy('sweepWIF'),
        to_address: cache.lazy('fromAddress')
      },
      {
        "must sweep the funds": function (e, res) {
          assert.isObject(res);
          assert.isObject(res.data);
          assert.isString(res.data.txid);
          assert.isString(res.data.amount_withdrawn);
          assert.isString(res.data.amount_sent);
          assert.isString(res.data.network_fee);
        }
      }
    )
  },
  "sweep_from_address (without params)": {
    topic: function () {
      client.sweep_from_address({}, this.callback);
    },
    "must return an error": function (err, res) {
      if (process.env.DEBUG && !(err instanceof Error)) console.log(err, res);
      assert.instanceOf(err, Error);
    }
  },
  "sweep_from_address (without to_address)": {
    topic: function () {
      client.sweep_from_address({private_key: BlockIo.ECKey().toWIF()}, this.callback);
    },
    "must return an error": function (err, res) {
      if (process.env.DEBUG && !(err instanceof Error)) console.log(err, res);
      assert.instanceOf(err, Error);
    }
  },
  "sweep_from_address (with invalid WIFs)": {
    topic: function () {
      client.sweep_from_address({private_key: 'invaLidWiF', to_address: 'invaLidWiF'}, this.callback);
    },
    "must return an error": function (err, res) {
      if (process.env.DEBUG && !(err instanceof Error)) console.log(err, res);
      assert.instanceOf(err, Error);
    }
  }
});

if (genericHelpers.checkEnv()) spec.export(module);
