/* This script demonstrates use of 4 of 5 MultiSig addresses with the Distributed Trust API
 * at Block.io. Each key can be signed separately -- perfect for escrow, a variety of security
 * architectures, and ofcourse, for personal use + cold storage of savings.
 *
 * Any questions? Contact support@block.io.
 */

const BlockIo = require('../lib/block_io');
const crypto = require('crypto');

const VERSION = 2;

const client = new BlockIo({
    api_key: process.env.API_KEY, // your API key
    pin: process.env.PIN, // your PIN (for funding the dTrust address you will create
    version: VERSION
});

// create a new address with a random label
const addressLabel = 'dtrust' + crypto.randomBytes(4).toString('hex');

// create the private key objects for each private key
// NOTE: in production environments you'll do this elsewhere
const privKeys = [
  BlockIo.ECKey.fromPassphraseString('verysecretkey1'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey2'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey3'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey4')
];

const pubKeys = [];

// populate our pubkeys array from the keys we just generated
// pubkey entries are expected in hexadecimal format
console.log('* Collecting public keys...');
privKeys.forEach(function (key) {
    const pubkey = key.pub.toString('hex');
    console.log('>> Adding pubkey: ' + pubkey);
    pubKeys.push(pubkey);
});

async function dTrust() {

  try {

    // create a dTrust address that requires 4 out of 5 keys (4 of ours, 1 at Block.io).
    // Block.io automatically adds +1 to specified required signatures because of its own key
    let addrData = await client.get_new_dtrust_address({
      label: addressLabel,
      public_keys: pubKeys.join(','),
      required_signatures: 3 // required signatures out of the set of signatures that we specified
    });

    // print out information about the address we just created
    const addr = addrData.data.address;
    const network = addrData.data.network;
    console.log('>> New dTrust Address on network ' + network + ' is ' + addr);

    // save the redeemscript so that you can use the address without depending on block.io services.
    console.log('>> Redeem script:', addrData.data.redeem_script);

    // let's send some coins to our new address
    console.log('* Sending 50 DOGETEST to', addr);
    let prepared_transaction = await client.prepare_transaction({
      from_labels: 'default',
      to_address: addr,
      amount: '50.0',
    });
    let signed_transaction = await client.create_and_sign_transaction({data: prepared_transaction});
    let funding = await client.submit_transaction({transaction_data: signed_transaction});
    console.log('>> Transaction ID: ' + funding.data.txid);

    // check if some balance got there
    console.log('* Getting address balance for', addr);
    let balance = await client.get_dtrust_address_balance({ address: addr });

    const availBalance = balance.data.available_balance;
    console.log('>> Available Balance in ' + addr + ' is ' + availBalance + ' ' + network);

    // find our non-dtrust default address so we can send coins back to it
    console.log('* Looking up default address');
    let defaultData = await client.get_address_by_label({ label: 'default' });
    const defaultAddress = defaultData.data.address;

    // the amount available minus the network fee needed to transact it
    // in general: never use floats. use high precision big numbers instead. we're just demonstrating a concept here.
    const amountToSend = (parseFloat(availBalance) - 1).toFixed(8);

    console.log('* Sending ' + amountToSend + ' ' + network + ' back to ' + defaultAddress);
    console.log('    Creating withdrawal request...');

    // let's send the coins back to the default address
    let prepared_dtrust_transaction = await client.prepare_dtrust_transaction({
        from_address: addr,
        to_address: defaultAddress,
        amount: amountToSend
    });

    // inspect the data yourself in-depth
    // here's a summary of the transaction you are going to create and sign
    let summarized_dtrust_transaction = await client.summarize_prepared_transaction({data: prepared_dtrust_transaction});
    console.log(">> Transaction Summary:");
    console.log(JSON.stringify(summarized_dtrust_transaction,null,2));
    
    // the response contains data to sign and all the public_keys that need to sign it
    // you can distribute this response to different processes that stored your
    // private keys and have them inform block.io after signing the data. You can
    // then finalize the transaction so that it gets broadcasted to the network.
    //
    // Below, we take this response, extract the data to sign, sign it,
    // and inform Block.io of the signatures, for each signer.
    let signed_dtrust_transaction = await client.create_and_sign_transaction({
	data: prepared_dtrust_transaction,
	keys: privKeys.slice(0,3).map((p) => { return p.priv.toString('hex'); }),
    });

    // submit the fully or partially signed transaction
    // block.io adds its signature if partially signed, and broadcasts the transaction to the peer-to-peer network
    let fin = await client.submit_transaction({transaction_data: signed_dtrust_transaction});

    // print the details of our transaction
    console.log('>> Transaction ID: ' + fin.data.txid);

  } catch (error) {
    console.log('ERROR:' + (error instanceof Error) ? error.stack : error);
    process.exit(1);
  }

}

// call the async function.
dTrust();

/* Relevant dTrust API calls (Numbers 1 thru 7: they work the same way as their non-dTrust counterparts on https://block.io/api).
 * For a list of parameters and how to use these calls, please refer to their equivalent counterparts at https://block.io/api
 * For any help whatsoever, please reach support@block.io
 * 1. get_dtrust_address_balance
 * 2. get_dtrust_address_by_label
 * 3. get_my_dtrust_addresses
 * 4. get_new_dtrust_address -- as demonstrated above
 * 5. get_dtrust_transactions
 * 6. prepare_dtrust_transaction -- returns data to create the appropriate transaction, and how to sign the transaction
 * 7. submit_transaction -- you can use this call to submit the fully or partially signed transaction. Must contain all relevant signatures for the transaction or the final transaction in hex form
 *
 * end :)
 */
