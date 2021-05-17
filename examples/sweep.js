/* Example script for sweeping all coins from a given address
 * Must use the API Key for the Network the address belongs to
 * Must also provide the Private Key to the sweep address in
 * Wallet Import Format (WIF)
 *
 * Contact support@block.io if you have any issues
 */
const BlockIo = require('../lib/block_io');

// PIN not needed
const client = new BlockIo({api_key: process.env.API_KEY});

const to_address = process.env.TO_ADDRESS;
const private_key = process.env.WIF;

async function example() {
    try {
	
	let balance = await client.get_balance();
	console.log(JSON.stringify(balance,null,2));
	
	// get data to create the transaction
	// the private key is converted to hex form and used by create_and_sign_transaction. It does not go to Block.io.
	let prepared_transaction = await client.prepare_sweep_transaction({
            to_address: to_address,
            private_key: private_key
	});
	console.log(JSON.stringify(prepared_transaction,null,2));
	
	// inspect the transaction in-depth yourself
	// this is just a summary of the transaction you are going to create and sign
	let summarized_transaction = await client.summarize_prepared_transaction({data: prepared_transaction});
	console.log(JSON.stringify(summarized_transaction,null,2));
	
	// once satisfied, create and sign the transaction
	let signed_transaction = await client.create_and_sign_transaction({data: prepared_transaction});
	
	// when ready to broadcast the transaction to the network, submit it to Block.io
	let data = await client.submit_transaction({transaction_data: signed_transaction});
	
	// if successful, this response now contains the transaction ID on the blockchain network
	console.log(JSON.stringify(data,null,2));
	
    } catch (err) {
	console.log(err);
    }

}

// run the example
example();
