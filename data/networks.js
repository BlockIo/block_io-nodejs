var Bitcoin = require('bitcoinjs-lib');

// extend known network params with dogecoin and litecoin testnets
Bitcoin.networks.dogecoin_testnet = {
  magicPrefix: '\x18Dogecoin Signed Message:\n',
  bip32: {
    public: 0x0432a9a8,
    private: 0x0432a243
  },
  pubKeyHash: 0x71,
  scriptHash: 0xc4,
  wif: 241,
  dustThreshold: 100000000,
  feePerKb: 100000000,
};

Bitcoin.networks.litecoin_testnet = {
  magicPrefix: '\x18Litecoin Signed Message:\n',
  bip32: {
    public: 0x0436ef7d,
    private: 0x0436f6e1
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
  dustThreshold: 100000,
  feePerKb: 100000
};
