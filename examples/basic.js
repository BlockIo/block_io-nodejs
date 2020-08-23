// creates a new destination address, withdraws from the default label to it,
// gets sent transactions, and the current price, using async/await

const BlockIo = require('block_io');

const PIN = 'YOUR_PIN';
const AMOUNT = '50.0';

// please use a Testnet API key here
const client = new BlockIo('YOUR_TESTNET_KEY');

async function example() {
  try {
    let data;

    // create a new address
    data = await client.get_new_address({ label: 'asyncTest' });
    console.log(JSON.stringify(data, null, 2));

    // Withdraw to our new address
    // This is the only call where PIN is needed
    data = await client.withdraw_from_labels({
      from_labels: 'default',
      to_label: 'asyncTest',
      amount: AMOUNT,
      pin: PIN
    });
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
