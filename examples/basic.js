// creates a new destination address, withdraws from the default label to it, gets sent transactions, and the current price
var BlockIo = require('block_io');

var PIN = 'YOURSECRETPIN';

// please use the Dogecoin Testnet API key here
var client = new BlockIo({
  api_key: 'YOURDOGECOINTESTNETAPIKEY',
  version: 2
});

client.get_new_address({label: 'testDest'}, function (error, data) {
  if (error) return console.log("Error occured:", error.message);
  console.log(data);
});

// withdraw 3.5 TDOGE to our new address
// This is the only call where PIN is needed
client.withdraw_from_labels({
  from_labels: 'default',
  to_label: 'testDest',
  amount: '3.5',
  pin: PIN
}, function (error, data) {
  if (error) return console.log("Error occured:", error.message);
  console.log(data);
});

// Show the address associated with the label 'default'
client.get_address_by_label({
  label: 'default'
}, function (error, data) {
  if (error) return console.log("Error occured:", error.message);
  console.log(data);
});

// Show transactions we sent
// API v2 only
client.get_transactions({
  type: 'sent'
}, function (error, data) {
  if (error) return console.log("Error occured:", error.message);
  console.log(data);
});

// Show the current price with BTC
client.get_current_price({
  base_price: 'BTC'
}, function (error, data) {
  if (error) return console.log("Error occured:", error.message);
  console.log(data);
});


