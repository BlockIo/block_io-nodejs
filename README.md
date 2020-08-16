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

It's super easy to get started. In your node shell, do:

```javascript
var BlockIo = require('block_io');

// 'SECRET_PIN' and 'VERSION' are optional
var block_io = new BlockIo('API_KEY');

// print the account balance
block_io.get_balance(console.log);

// print all addresses on this account
block_io.get_my_addresses(console.log);

// print the response of a withdrawal request
block_io.withdraw(
  {
    pin: 'SECRET_PIN',
    from_labels: 'label1,label2',
    to_label: 'label3',
    amount: '50.0'
  }, console.log);
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
