var Bitcoin = require('bitcoinjs-lib');

Bitcoin.networks.litecoin = {
  messagePrefix: '\x18Dogecoin Signed Message:\n',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x05,
  wif: 0xb0,
};

Bitcoin.networks.dogecoin = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
}

// extend known network params with dogecoin and litecoin testnets
Bitcoin.networks.dogecoin_testnet = {
  messagePrefix: '\x18Dogecoin Signed Message:\n',
  bip32: {
    public: 0x0432a9a8,
    private: 0x0432a243
  },
  pubKeyHash: 0x71,
  scriptHash: 0xc4,
  wif: 241,
};

Bitcoin.networks.litecoin_testnet = {
  messagePrefix: '\x18Litecoin Signed Message:\n',
  bip32: {
    public: 0x0436ef7d,
    private: 0x0436f6e1
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};
