# BlockIo

This NodeJS module is the official reference SDK for the Block.io payments
API. To use this, you will need the Bitcoin, Litecoin or Dogecoin API key(s)
from <a href="https://block.io" target="_blank">block.io</a>. Go ahead, sign
up :)

## Installation

Install the package using npm:

```bash
npm install block_io
```

### Supported NodeJS versions

We aim to support only the current (non-EOL) NodeJS LTS versions.

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
    console.log(JSON.stringify(balance,null,2));

    // print first page of unarchived addresses on this account
    let addresses = await block_io.get_my_addresses();
    console.log(JSON.stringify(addresses,null,2));

    // withdrawal:
    //   prepare_transaction ->
    //   summarize_prepared_transaction ->
    //   create_and_sign_transaction ->
    //   submit_transaction
    let prepared_transaction = await block_io.prepare_transaction({
      from_labels: 'label1,label2',
      to_label: 'label3',
      amount: '50.0'
    });

    // inspect the prepared data for yourself. here's a
    // summary of the transaction you will create and sign
    let summarized_transaction = await block_io.summarize_prepared_transaction({data: prepared_transaction});
    console.log(JSON.stringify(summarized_transaction,null,2));
    
    // create and sign this transaction:
    // we specify the PIN here to decrypt
    // the private key to sign the transaction
    let signed_transaction = await block_io.create_and_sign_transaction({data: prepared_transaction, pin: 'SECRET_PIN'});

    // inspect the signed transaction yourself
    // once satisfied, submit it to Block.io
    let result = await block_io.submit_transaction({transaction_data: signed_transaction});
    console.log(JSON.stringify(result,null,2)); // contains the transaction ID of the final transaction
    
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
        .then(data => console.log(JSON.stringify(data,null,2)))
        .catch(error => console.log("Error:", error.message));

```

### Callbacks

For backward compatibility, callback-style method calls are supported too.
Just add a callback function/lambda as the last argument.

```javascript

block_io.get_balance((error, data) => {
  if (error) return console.log("Error:", error.message);
  console.log(JSON.stringify(data,null,2));
});

```

For more information, see [NodeJS API Docs](https://block.io/api/nodejs).
This client provides a mapping for all methods listed on the Block.io API
site.

### Configuration

To change behavior of the `block_io` client, attributes can be passed to the
class at instantiation time, in the form of an object.

The following attributes are supported:

```javascript
const config = {
  api_key: "YOUR_API_KEY",
  version: 2,              // REST API version to use. Default: 2
  options: {
    allowNoPin: false,     // Allow ommission of PIN for withdrawal.
                           // This may be useful when interfacing with
                           // hardware wallets and HSMs. Default: false.

    lowR: true,            // Sign with a low R value to save a byte and
                           // make signature size more predictable, at the
                           // cost of more CPU time needed to sign transactions.
                           // Default: true

  }
}

const block_io = new BlockIo(config);
```

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
