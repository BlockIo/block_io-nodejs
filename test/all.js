var vows = require('vows');
var assert = require('assert');
var cache = require('./helpers/cache');

var BlockIo = require('../lib/block_io');

var API_KEY = process.env.BLOCK_IO_API_KEY;
var PIN = process.env.BLOCK_IO_PIN;
var FEES = {BTC: 0.0001, BTCTEST: 0.0001, DOGE: 1, DOGETEST: 1, LTC: 0.001, LTCTEST: 0.001};
var NEWLABEL = (new Date).getTime().toString(36);

if (!API_KEY || !PIN) {
  console.log('ERROR: Need valid BLOCK_IO_API_KEY and BLOCK_IO_PIN environment variables!');
  console.log([
    '       provided: BLOCK_IO_API_KEY: "', API_KEY,
    '"; BLOCK_IO_PIN: "', PIN ? '[masked]' : '', '"'
  ].join(''));
  process.exit(1);
}

var client = new BlockIo(API_KEY);

vows.describe("block.io node.js api wrapper").addBatch({
  "get_balance": makeMethodCase('get_balance', {}),
  "get_new_address": makeMethodCase('get_new_address', {})
}).addBatch({
  "get_new_address (with label)": makeMethodCase('get_new_address', {label: NEWLABEL}, {
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
}).addBatch({
  "get_my_addresses": makeMethodCase('get_my_addresses', {}, {
    "must specify a network": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.network);
      assert.ok(FEES.hasOwnProperty(res.data.network));
      cache('minFee', FEES[res.data.network]);
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
}).addBatch({
  "get_address_received (by address)": makeMethodCase(
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
  "get_address_received (by label)": makeMethodCase(
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
  ),
}).addBatch({
  "withdraw_from_address": makeMethodCase(
    'withdraw_from_address',
    {
      from_addresses: cache.lazy('fromAddress'),
      to_label: NEWLABEL,
      amount: calcWithdrawalAmount,
      pin: PIN
    },
    makeTxAssertions()
  )
}).addBatch({
  "withdraw_from_label": makeMethodCase(
    'withdraw_from_label',
    {
      from_labels: cache.lazy('fromLabel'),
      payment_address: cache.lazy('newAddress'),
      amount: calcWithdrawalAmount,
      pin: PIN
    },
    makeTxAssertions()
  )
}).export(module);

function makeMethodCase (method, args, customChecks) {
  var testCase = {
    topic: function () {

      // resolve lazy cached args
      var resolvedArgs = {};
      Object.keys(args).forEach(function (k) {
        resolvedArgs[k] = (typeof(args[k]) === 'function')  ?
          args[k]() : args[k];
      });

      client[method](resolvedArgs, this.callback);
    },
    "must not return an error": function (err, data) {
      assert.isNull(err);
    },
    "must return status 'success'": function (err, data) {
      assert.isObject(data);
      if (data.status !== 'success') console.log(data);
      assert.equal(data.status, 'success');
    }
  };

  if (customChecks) Object.keys(customChecks).forEach(function (k) {
    testCase[k] = customChecks[k];
  });

  return testCase;
}

function makeTxAssertions () {
  return {
    "must return a txid": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.txid);
    },
    "must return an amount_withdrawn": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.amount_withdrawn);
      assert.ok(parseFloat(res.data.amount_withdrawn, 10) >= parseFloat(calcWithdrawalAmount(), 10));
    },
    "must return an amount_sent": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.txid);
      assert.isString(res.data.amount_sent);
      assert.ok(parseFloat(res.data.amount_sent, 10) == parseFloat(calcWithdrawalAmount(), 10));
    },
    "must return a network_fee": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.txid);
      assert.isString(res.data.network_fee);
      assert.ok(!isNaN(parseFloat(res.data.network_fee, 10)));
    },
    "must return a blockio_fee": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.txid);
      assert.isString(res.data.blockio_fee);
      assert.ok(!isNaN(parseFloat(res.data.blockio_fee, 10)));
    }
  };
}

function calcWithdrawalAmount () {
  return (cache('minFee') * 3).toFixed(5);
}
