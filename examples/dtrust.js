/* This script demonstrates use of 4 of 5 MultiSig addresses with the Distributed Trust API
 * at Block.io. Each key can be signed separately -- perfect for escrow, a variety of security
 * architectures, and ofcourse, for personal use + cold storage of savings.
 *
 * Any questions? Contact support@block.io.
 */

const BlockIo = require('block_io');
const crypto = require('crypto');

const VERSION = 2;
const API_KEY = "YOUR API KEY"; // insert your API key here. This script is optimized for TDOGE.
const PIN = 'YOUR PIN'; // only used to make initial transaction from the default address, not needed for dTrust

const client = new BlockIo({
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
    var pubkey = key.pub.toString('hex');
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
    let funding = await client.withdraw_from_labels({
      from_labels: 'default',
      to_address: addr,
      amount: '50.0',
      pin: PIN
    });

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
    var amountToSend = (parseFloat(availBalance) - 1).toFixed(8);

    console.log('* Sending ' + amountToSend + ' ' + network + ' back to ' + defaultAddress);
    console.log('    Creating withdrawal request...');

    // let's send the coins back to the default address
    let dtrustWithdrawal = await client.withdraw_from_dtrust_address({
        from_address: addr,
        to_address: defaultAddress,
        amount: amountToSend
    });

    // the response contains data to sign and all the public_keys that need to sign it
    // you can distribute this response to different processes that stored your
    // private keys and have them inform block.io after signing the data. You can
    // then finalize the transaction so that it gets broadcasted to the network.
    //
    // Below, we take this response, extract the data to sign, sign it,
    // and inform Block.io of the signatures, for each signer.

    const referenceId = dtrustWithdrawal.data.reference_id;
    console.log('>> Withdrawal reference ID: ' + referenceId);

    // sign for all 4 keys since we have them all here
    privKeys.forEach(async (key) => {

        // The signInputs helper function signs all relevant inputs for you.
        // for convenience, we cumulatively update the 'inputs' object with
        // our signatures, every time we sign, but this is not a requirement.
        dtrustWithdrawal.data.inputs = BlockIo.helper.signInputs(key, dtrustWithdrawal.data.inputs);
        console.log('>> Signed data for public key: ' + key.pub.toString('hex'));

        // Send the signatures to block.io
        try {
          await client.sign_transaction({
              signature_data: JSON.stringify(dtrustWithdrawal.data)
          });
        } catch (error) {
          console.log("ERROR: ", error);
        }

    });

    // finalize and broadcast the transaction
    console.log('* Finalizing transaction with reference ID ' + referenceId);
    let fin = await client.finalize_transaction({ reference_id: referenceId });

    // print the details of our transaction
    console.log('>> Transaction ID: ' + fin.data.txid);
    console.log('>> Network Fee Incurred: ' + fin.data.network_fee, ' ' + network);

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
