/* Example script for sweeping all coins from a given address
 * Must use the API Key for the Network the address belongs to
 * Must also provide the Private Key to the sweep address in
 * Wallet Import Format (WIF)
 *
 * Contact support@block.io if you have any issues
 */
const BlockIo = require('block_io');

// NOTE: PIN IS NOT NEEDED!!!
const client = new BlockIo('YOUR_API_KEY');

const to_address = 'TARGET_ADDRESS';
const private_key = 'WIF_TO_SWEEP';

client.sweep_from_address({
  to_address: to_address,
  private_key: private_key
}).then(response => {
  console.log(['Sweep Complete:', response.data.amount_sent, response.data.network, 'swept to ', to_address].join(' '));
  console.log(['Transaction ID:', response.data.txid].join(' '));
  console.log(['Network Fee Incurred:', response.data.network_fee, response.data.network].join(' '));
}).catch(e => console.log('Sweep failed: ', e.message));
