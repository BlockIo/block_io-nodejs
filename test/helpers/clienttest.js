const SUCCESS_CHECKS = [
  function (t, args) {
    t.equal(args[0], null, 'must not return an error');
  },
  function (t, args) {
    t.equal((typeof args[1]), 'object', 'must return a result object');
  },
  function (t, args) {
    t.equal((args[1] && args[1].status), 'success', 'must return status success');
  },
];

const TX_CHECKS = [
  function (t, args) {
    t.equal(typeof args[1].data.txid, 'string', 'must return a txid');
  },
  checkNumeric('amount_withdrawn', 'must return an amount withdrawn'),
  checkNumeric('amount_sent', 'must return an amount sent'),
  checkNumeric('network_fee', 'must return a network fee'),
  checkNumeric('blockio_fee', 'must return a blockio fee'),
];

const ERR_CHECKS = [
  (t, args) => {
    t.ok(args[0] instanceof Error, 'must return an error in callback');
  }
];

function ClientTest(framework, client) {
  this.framework = framework;
  this.client = client;
  this._tests = [];
  this._postProcess = [];
  this._title = "test";
  this._payload = {};
}

ClientTest.prototype.method = function (method) {
  this._method = method;
  return this;
}

ClientTest.prototype.payload = function (obj) {
  this._payload = obj;
  return this;
}

ClientTest.prototype.title = function (str) {
  this._title = str;
  return this;
}

ClientTest.prototype.succeeds = function () {
  SUCCESS_CHECKS.forEach(fn => this._tests.push(fn));
  return this;
}

ClientTest.prototype.fails = function () {
  ERR_CHECKS.forEach(fn => this._tests.push(fn));
  return this;
}

ClientTest.prototype.returnsTx = function () {
  TX_CHECKS.forEach(fn => this._tests.push(fn));
  return this;
}

ClientTest.prototype.check = function (fn) {
  this._tests.push(fn);
  return this;
}

ClientTest.prototype.numericResult = function (attr, text) {
  this._tests.push(checkNumeric(attr, text));
  return this;
}

ClientTest.prototype.returnsAttrs = function (attrs) {
  if (!Array.isArray(attrs)) attrs = [attrs];
  attrs.forEach(a => this._tests.push(checkDataAttr(a)));
  return this;
}

ClientTest.prototype.postProcess = function (fn) {
  this._postProcess.push(fn);
  return this;
}

ClientTest.prototype.execute = function () {
  const test = this;

  return new Promise(f => {
    test.framework(test._title, t => {
      t.plan(1 + this._tests.length);

      t.doesNotThrow(() => {
        test.client[test._method].call(test.client, test._payload, function () {
          test._result = arguments;

          test._tests.forEach(fn => fn(t, test._result));

          if (test._postProcess.length) {
            test._postProcess.forEach(fn => process.nextTick(() => fn(test._result)));
          }

          f(test);
        });
      }, undefined, 'must not throw an Error');
    });
  });
}

ClientTest.create = function (framework, client) {
  return new ClientTest(framework, client);
}

function checkNumeric(attr, text) {
  return function (t, args) {
    t.ok(!isNaN(parseFloat(args[1].data[attr])), text);
  };
}

function checkDataAttr(attr) {
  return function (t, args) {
    t.ok(
      Object.prototype.hasOwnProperty.call(args[1].data, attr),
      'must return ' + attr
    );
  };
}

module.exports = ClientTest;
