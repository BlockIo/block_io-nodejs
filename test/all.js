var vows = require('vows');
var assert = require('assert');

var BlockIo = require('../lib/block_io');
var API_KEY = process.env.API_KEY;
var ADDRESS = process.env.ADDRESS;
var LABEL = (new Date).getTime().toString(36);

var client = new BlockIo(API_KEY);

vows.describe("block.io node.js api wrapper").addBatch({
  "get_balance": makeMethodCase('get_balance', {}),
  "get_new_address": makeMethodCase('get_new_address', {}),
  "get_new_address (with label)": makeMethodCase('get_new_address', {label: LABEL}, {
    "must return the label": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.address);
      assert.strictEqual(res.data.label, LABEL);
    }
  })
}).addBatch({
  "get_my_addresses": makeMethodCase('get_my_addresses', {}, {
    "must return an address": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isArray(res.data.addresses);
      assert.isString(res.data.addresses[0].address);
      assert.isString(res.data.addresses[0].label);
    }
  })
}).addBatch({
  "get_address_received (by address)": makeMethodCase('get_address_received', {address: ADDRESS}, {
    "must return balance data": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.confirmed_received);
      assert.isString(res.data.unconfirmed_received);
    }
  }),
  "get_address_received (by label)": makeMethodCase('get_address_received', {label: LABEL}, {
    "must return balance data": function (err, res) {
      assert.isObject(res);
      assert.isObject(res.data);
      assert.isString(res.data.confirmed_received);
      assert.isString(res.data.unconfirmed_received);
    }
  }),
}).export(module);

function makeMethodCase (method, args, customChecks) {
  var testCase = {
    topic: function () {
      client[method](args, this.callback);
    },
    "must not return an error": function (err, data) {
      assert.isNull(err);
    },
    "must return status 'success'": function (err, data) {
      assert.isObject(data);
      assert.equal(data.status, 'success');
    }
  };

  if (customChecks) Object.keys(customChecks).forEach(function (k) {
    testCase[k] = customChecks[k];
  });

  return testCase;
}
