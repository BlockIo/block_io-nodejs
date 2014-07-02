# BlockIo

This nodejs module is the official reference client for the Block.io payments API. To use this, you will need the Dogecoin, Bitcoin, or Litecoin API key(s) from <a href="https://block.io" target="_blank">Block.io</a>. Go ahead, sign up :)

## Installation

Install the package using npm:

    $ npm install block_io

## Usage

It's super easy to get started. In your node shell, do:

```javascript
var BlockIo = require('block_io');

var blockio = new BlockIo('API_KEY');

// print the account balance
blockio.get_balance(console.log);

// print all addresses on this account
blockio.get_my_addresses(console.log);

// print the response of a withdrawal request
blockio.withdraw({ pin: 'SECRET_PIN', from_user_ids: '1,2', to_user_id: '0', amount: '50.0' }, console.log);
```

For more information, see [Node.js API Docs](https://block.io/api/nodejs). This client provides a mapping for all methods listed on the Block.io API site.

## Contributing

1. Fork it ( https://github.com/[my-github-username]/block_io-nodejs/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
