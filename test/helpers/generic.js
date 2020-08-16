var cache = require('./cache');

var loggedEnvError = false;

module.exports = {
  FEES: {BTC: 0.00001, BTCTEST: 0.00001, DOGE: 1, DOGETEST: 1, LTC: 0.0001, LTCTEST: 0.0001},

  checkEnv: function () {
    if (!process.env.BLOCK_IO_API_KEY || !process.env.BLOCK_IO_PIN) {
      if (!loggedEnvError) {
        console.log('ERROR: Need valid BLOCK_IO_API_KEY and BLOCK_IO_PIN environment variables!');
        console.log([
          '       provided: BLOCK_IO_API_KEY: "', process.env.BLOCK_IO_API_KEY,
          '"; BLOCK_IO_PIN: "', process.env.BLOCK_IO_PIN ? '[masked]' : '', '"'
        ].join(''));
        loggedEnvError = true;
      }
      return false;
    }
    return true;
  },

  calcWithdrawalAmount: function () {
    return (cache('minFee') * 3).toFixed(5);
  },

  calcDTrustWithdrawalAmount: function () {
    return (cache('minFeeDTrust') * 5).toFixed(5);
  },

  hasProp: function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  },

};
