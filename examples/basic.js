// creates a new destination address, withdraws from the default label to it,
// gets sent transactions, and the current price, using async/await

const BlockIo = require('../lib/block_io');

const PIN = process.env.PIN;
const AMOUNT = '50.0';

// please use a Testnet API key here
const client = new BlockIo({api_key: process.env.API_KEY, pin: PIN});

async function example() {
  try {
    let data;

    data = await client.get_balance();
    console.log(JSON.stringify(data, null, 2));
      
      // create a new address
    try {
	data = await client.get_new_address({ label: 'asyncTest' });
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.log(err);
    }

    // Withdraw to our new address
    // get the data to create the transaction
    let prepared_transaction = await client.prepare_transaction({
	from_labels: 'default',
	to_label: 'asyncTest',
	amount: AMOUNT
    });

    // summarize the transaction we are going to prepare
    // for in-depth review, look at prepared_transaction yourself
    let summarized_transaction = await client.summarize_prepared_transaction({data: prepared_transaction});

    console.log(JSON.stringify(summarized_transaction, null, 2));

    // after review, if you wish to approve the transaction: create and sign it
    let signed_transaction = await client.create_and_sign_transaction({data: prepared_transaction});
    console.log(JSON.stringify(signed_transaction,null,2));
      
    // review the signed transaction (specifically, the tx_hex) and ensure things are as you want them
    // if you approve of it, submit the transaction for Block.io's signatures and broadcast to the blockchain network
    // if successful, the data below contains the transaction ID on the blockchain network
    data = await client.submit_transaction({transaction_data: signed_transaction});
    console.log(JSON.stringify(data, null, 2));

    // Show the address associated with the label 'default'
    data = await client.get_address_by_label({ label: 'default' });
    console.log(JSON.stringify(data, null, 2));

    // Show transactions we sent
    data = await client.get_transactions({ type: 'sent' });
    console.log(JSON.stringify(data, null, 2));

    // Show the current price with BTC
    data = await client.get_current_price({ base_price: 'BTC' });
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    //stop on any errors and log it
    console.log("Error occured:", error.message);
  }
}

// run the example
example();
