/* This script demonstrates use of 4 of 5 MultiSig addresses with the Distributed Trust API
 * at Block.io. Each key can be signed separately -- perfect for escrow, a variety of security
 * architectures, and ofcourse, for personal use + cold storage of savings.
 *
 * Any questions? Contact support@block.io.
 */

// This example uses Q (npm install q) for promises

var Q = require('q');
var BlockIo = require('block_io');
var crypto = require('crypto');

var VERSION = 2;
var API_KEY = "YOUR API KEY"; // insert your dogetest API key here. This script is optimized for TDOGE.
var PIN = 'YOUR PIN'; // only used to make initial transaction from the default address, not needed for dTrust

var client = new BlockIo({
    api_key: API_KEY,
    version: VERSION
});

// create a new address with a random label
var addressLabel = 'dtrust' + crypto.randomBytes(4).toString('hex');

// create the private key objects for each private key
// NOTE: in production environments you'll do this elsewhere
var privKeys = [
  BlockIo.ECKey.fromPassphraseString('verysecretkey1'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey2'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey3'),
  BlockIo.ECKey.fromPassphraseString('verysecretkey4')
];

var pubKeys = [];

// populate our pubkeys array from the keys we just generated
// pubkey entries are expected in hexadecimal format
console.log('* Collecting public keys...');
privKeys.forEach(function (key) {
    var pubkey = key.pub.toHex();
    console.log('>> Adding pubkey: ' + pubkey);
    pubKeys.push(pubkey);
});

Q
  // create a dTrust address that requires 4 out of 5 keys (4 of ours, 1 at Block.io).
  // Block.io automatically adds +1 to specified required signatures because of its own key
  .ninvoke(client, 'get_new_dtrust_address', {
    label: addressLabel,
    public_keys: pubKeys.join(','),
    required_signatures: 3 // required signatures out of the set of signatures that we specified
  })

  // print out some information about the address we just created
  .then(function (response) {

    var data = response.data;

    console.log('>> New dTrust Address on network ' + data.network + ' is ' + data.address);

    // save the redeemscript so that you can use the address without depending on block.io services.
    console.log('>> Redeem script: ' + data.redeem_script);

    // passthrough the data we just extracted
    return Q(data);
  })
  // let's send some coins to our new address
  .then(function (data) {
    console.log('* Sending 50 DOGETEST to ' + data.address);

    var deferred = Q.defer();

    // withdraw 50 test-doge from 'default' address, into our dtrust address
    Q.ninvoke(client, 'withdraw_from_labels', {
        from_labels: 'default',
        to_address: data.address,
        amount: 50,
        pin: PIN
      })
      .then(function (response) {
        console.log('>> Transaction ID: ' + response.data.txid);

        // passthrough the original data
        deferred.resolve(data);
      })
      .fail(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
  })
  // lets check our balance
  .then(function (data) {
    console.log('* Getting address balance for ' + data.address);

    var deferred = Q.defer();

    Q.ninvoke(client, 'get_dtrust_address_balance', {
        address: data.address
    })
    .then(function (response) {
        data.available_balance = response.data.available_balance;
        console.log('>> Available Balance in ' + data.address + ' is ' + data.available_balance + ' ' + data.network);
        deferred.resolve(data);
    })
    .fail(function (error) {
        deferred.reject(error);
    });

    return deferred.promise;
  })
  // find our non-dtrust default address so we can send coins back to it
  .then(function (data) {
    console.log('* Looking up default address');
    var deferred = Q.defer();

    Q.ninvoke(client, 'get_address_by_label', {
        label: 'default'
    })
    .then(function (response) {
        data.defaultAddress = response.data.address;
        console.log('>> Default address: ' + data.defaultAddress);
        deferred.resolve(data);
    })
    .fail(function (error) {
        deferred.reject(error);
    });

    return deferred.promise;
  })
  // let's send the coins back to the default address
  .then(function (data) {
    var amountToSend = (parseFloat(data.available_balance) - 1).toFixed(8); // the amount minus the network fee needed to transact it

    console.log('* Sending ' + amountToSend + ' ' + data.network + ' back to ' + data.defaultAddress);
    console.log('    Creating withdrawal request...');

    return Q.ninvoke(client, 'withdraw_from_dtrust_address', {
        from_address: data.address,
        to_address: data.defaultAddress,
        amount: amountToSend
    });

  })
  // the response contains data to sign and all the public_keys that need to sign it
  // you can distribute this response to all of your machines the contain your private keys
  // and have them inform block.io after signing the data
  // from anywhere, you can then finalize the transaction
  // below, we take this response, extract the data to sign, sign it and inform Block.io of the signatures
  .then(function (response) {
    console.log('>> Withdrawal reference ID: ' + response.data.reference_id);

    var keyIndex = 0;

    function sign () {

        // The signInputs helper function signs all relevant inputs for you.
        // for convenience, we update the 'inputs' object with our signatures every time we sign
        response.data.inputs = BlockIo.helper.signInputs(privKeys[keyIndex], response.data.inputs);
        console.log('>> Signed data for public key: ' + privKeys[keyIndex].pub.toHex());

        // move to the next key
        keyIndex++;

        // send the signature to block.io
        return Q.ninvoke(client, 'sign_transaction', {
            signature_data: JSON.stringify(response.data)
        });
    }

    // sign for all 4 keys since we have them all here
    return sign().then(sign).then(sign).then(sign).then(function () {
        // relay the reference id for finalization
        return Q(response.data.reference_id);
    });

  })
  // finally, tell Block.io to finalize he transaction and broadcast it to the network
  .then(function (referenceId) {
    console.log('* Finalizing transaction with reference ID ' + referenceId);

    return Q.ninvoke(client, 'finalize_transaction', {
        reference_id: referenceId
    });
  })
  // print the details of our transaction
  .then(function (response) {
    console.log('>> Transaction ID: ' + response.data.txid);
    console.log('>> Network Fee Incurred: ' + response.data.network_fee, ' ' + response.data.network);
  })
  // in case something goes wrong anywhere in the above, print the error and exit
  .fail(function (error) {
    console.log('ERROR:' + (error instanceof Error) ? error.stack : error);
    process.exit(1);
  });

/* Relevant dTrust API calls (Numbers 1 thru 7: they work the same way as their non-dTrust counterparts on https://block.io/api).
 * For a list of parameters and how to use these calls, please refer to their equivalent counterparts at https://block.io/api
 * For any help whatsoever, please reach support@block.io
 * 1. get_dtrust_address_balance
 * 2. get_dtrust_address_by_label
 * 3. get_my_dtrust_addresses
 * 4. get_new_dtrust_address -- as demonstrated above
 * 5. get_dtrust_transactions
 * 6. withdraw_from_dtrust_labels -- returns an object with data to sign, and the public keys of the private keys that need to sign them. Does not accept a PIN -- it's of no use in dTrust withdrawals.
 * 7. withdraw_from_dtrust_addresses -- same as (6)
 * 8. sign_and_finalize_withdrawal (signature_data is a JSON string) -- you can use this call to finalize the transaction and sign it in one API call if needed
 *    for the nitty gritty on this call, see https://block.io/api/simple/signing
 *
 * Distributed Trust-only calls:
 * Number 9 and 10 do not need an API Key
 * 9. get_remaining_signers* (parameter: reference_id) -- tells you the public keys that are yet to sign the transaction
 * 10. sign_transaction* (signature_data is a JSON string) -- as demonstrated above
 * 11. finalize_transaction* -- as demonstrated above
 *
 *    API Calls marked with * are specific to the Distributed Trust framework.
 *
 * end :)
 */
