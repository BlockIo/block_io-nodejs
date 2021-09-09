const test = require('tape');
const BlockIo = require('../../lib/block_io');

test('HTTPS Client: connecting to host', t => {
  t.plan(2);

  const client = new BlockIo({
    api_key: "0000-0000-0000-0000",
    version: 2,
    pin: 'unused',
  });

  t.doesNotThrow(() => {
    client.get_balance({})
          .then(data => console.log(data))
          .catch(r => t.equal(r.data.status, 'fail', 'must return JSON object with status fail'));
  }, undefined, 'must not throw any Errors');
  
});

