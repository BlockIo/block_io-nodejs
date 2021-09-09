const test = require('tape');
const HttpsClient = require('../../lib/httpsclient');

test('HTTPS Client: connecting to host', t => {
  t.plan(2);

  const client = new HttpsClient(undefined, 'random/0.01');

  t.doesNotThrow(() => {
    client.request('GET', 'https://block.io/api/v2/get_balance', {})
          .then(data => t.equal(data.res.statusCode, 404, 'must return 404 status'));
  }, undefined, 'must not throw any Errors');
  
});

