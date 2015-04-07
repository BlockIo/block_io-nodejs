/* Example script for sweeping all coins from a given address
 * Must use the API Key for the Network the address belongs to
 * Must also provide the Private Key to the sweep address in Wallet Import Format (WIF)
 *
 * Contact support@block.io if you have any issues
 */
var BlockIo = require('block_io');

// PIN IS NOT NEEDED!!!

var client = new BlockIo({
  api_key: 'YOURAPIKEY',
  version: 2
});

var to_address = 'SWEEP COINS TO THIS ADDRESS';
var private_key = 'PRIVATE KEY TO SWEEP FROM';

client.sweep_from_address({
  to_address: to_address,
  private_key: private_key
}, function (error, response) {
  if (error) return console.log('Sweep failed: ', error.message);

  console.log(['Sweep Complete:', response.data.amount_sent, response.data.network, 'swept to ', to_address].join(' '));
  console.log(['Transaction ID:', response.data.txid].join(' '));
  console.log(['Network Fee Incurred:', response.data.network_fee, response.data.network].join(' '));

});