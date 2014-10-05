var vows = require('vows');
var assert = require('assert');
var cache = require('./cache');

var loggedEnvError = false;

var genericHelpers = module.exports = {
  FEES: {BTC: 0.0001, BTCTEST: 0.0001, DOGE: 1, DOGETEST: 1, LTC: 0.001, LTCTEST: 0.001},
  checkEnv: function () {
    if (!process.env.BLOCK_IO_API_KEY || !process.env.BLOCK_IO_PIN) {
      if (!loggedEnvError) {
        console.log('ERROR: Need valid BLOCK_IO_API_KEY and BLOCK_IO_PIN environment variables!');
        console.log([
          '       provided: BLOCK_IO_API_KEY: "', process.env.BLOCK_IO_API_KEY,
          '"; BLOCK_IO_PIN: "', process.env.BLOCK_IO_PIN ? '[masked]' : '', '"'
        ].join(''));
        loggedEnvError = true;
      }
      return false;
    }
    return true;
  },

  makeMethodCase: function (client, method, args, customChecks) {
    return this._makeCase(true, client, method, args, customChecks);
  },

  makeFailingCase: function (client, method, args, customChecks) {
    return this._makeCase(false, client, method, args, customChecks);
  },

  _makeCase: function (type, client, method, args, customChecks) {
    var testCase = {
      topic: function () {

        // resolve lazy cached args
        var resolvedArgs = {};
        Object.keys(args).forEach(function (k) {
          resolvedArgs[k] = (typeof(args[k]) === 'function')  ?
            args[k]() : args[k];
        });
        client[method](resolvedArgs, this.callback);
      }
    };

    if (type) {
      testCase["must not return an error"] = function (err, data) {
        if (process.env.DEBUG && err) console.log(data);
        assert.isNull(err);
      };

      testCase["must return status 'success'"] = function (err, data) {
        assert.isObject(data);
        if (process.env.DEBUG && data.status != 'success') console.log(data);
        assert.equal(data.status, 'success');
      };
    } else {
      testCase["must return status 'fail'"] = function (err, data) {
        assert.isObject(data);
        assert.equal(data.status, 'fail');
      };
    }

    if (customChecks) Object.keys(customChecks).forEach(function (k) {
      testCase[k] = customChecks[k];
    });

    return testCase;
  },

  makeTxAssertions: function () {
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
        assert.ok(parseFloat(res.data.amount_withdrawn, 10) >= parseFloat(genericHelpers.calcWithdrawalAmount(), 10));
      },
      "must return an amount_sent": function (err, res) {
        assert.isObject(res);
        assert.isObject(res.data);
        assert.isString(res.data.txid);
        assert.isString(res.data.amount_sent);
        assert.ok(parseFloat(res.data.amount_sent, 10) == parseFloat(genericHelpers.calcWithdrawalAmount(), 10));
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
  },

  calcWithdrawalAmount: function () {
    return (cache('minFee') * 3).toFixed(5);
  }
};
