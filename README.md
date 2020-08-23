# BlockIo

This nodejs module is the official reference SDK for the Block.io payments
API. To use this, you will need the Bitcoin, Litecoin or Dogecoin API key(s)
from <a href="https://block.io" target="_blank">block.io</a>. Go ahead, sign
up :)

## Installation

Install the package using npm:

```bash
npm install block_io
```

### Support for older node.js versions

Currently, only node.js versions 10.0 and higher are supported.

For node.js < 10.0.0, please use: `npm install block_io@2.0.3`

For node.js < 5.10.0, please use: `npm install block_io@1.0.9-5`

## Usage

It's super easy to get started:

```javascript

// load this library
const BlockIo = require('block_io');

// instantiate a client
const block_io = new BlockIo('API_KEY');

async function example() {
  try {
    // print the account balance
    let balance = await block_io.get_balance();
    console.log(balance);

    // print all addresses on this account
    let addresses = await block_io.get_my_addresses();
    console.log(addresses);

    // withdrawal; we specify the PIN here
    let withdraw = await block_io.withdraw({
      pin: 'SECRET_PIN',
      from_labels: 'label1,label2',
      to_label: 'label3',
      amount: '50.0'
    });
    console.log(withdraw);

  } catch (error) {
    console.log("Error:", error.message);
  }
}

example();

```

### Promises

Since v3.0.0, all methods return promises, like so:

```javascript

block_io.get_balance()
        .then(data => console.log(JSON.stringify(data)))
        .catch(error => console.log("Error:", error.message));

```

### Callbacks

For backward compatibility, callback-style method calls are supported too.
Just add a callback function/lambda as the last argument.

```javascript

block_io.get_balance((error, data) => {
  if (error) return console.log("Error:", error.message);
  console.log(JSON.stringify(data));
}

block_io.withdraw({
  pin: 'SECRET_PIN',
  from_labels: 'label1,label2',
  to_label: 'label3',
  amount: '50.0'
}, function (error, data) {
  if (error) return console.log("Error:", error.message);
  console.log(JSON.stringify(data));
});

```

For more information, see [Node.js API Docs](https://block.io/api/nodejs).
This client provides a mapping for all methods listed on the Block.io API
site.

## Contributing

1. Fork it ( https://github.com/BlockIo/block_io-nodejs/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## Testing

We use [tape](https://www.npmjs.com/package/tape) for unit and integration
tests. To run the unit tests simply run `npm test`.

To run the integration tests you need to specify ```BLOCK_IO_API_KEY``` and
```BLOCK_IO_PIN``` environment variables.

**DO NOT USE PRODUCTION CREDENTIALS FOR INTEGRATION TESTING!**

Integration test syntax:
```bash
BLOCK_IO_API_KEY="API_KEY" BLOCK_IO_PIN="SECRET_PIN" node test/integration/api.js
```
