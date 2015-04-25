var Bitcoin = require('bitcoinjs-lib');

// make sure network data is extended
require('../data/networks');

var networks = module.exports = {};
var MAPPING = networks.MAPPING = {
  'BTC': 'bitcoin',
  'DOGE': 'dogecoin',
  'LTC': 'litecoin',
  'BTCTEST': 'testnet',
  'DOGETEST': 'dogecoin_testnet',
  'LTCTEST': 'litecoin_testnet'
};

networks.getNetwork = function (net) {
  return Bitcoin.networks[MAPPING[net]];
};
