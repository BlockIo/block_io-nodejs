var BlockIO = module.exports = {
	BigInteger: require('bigi'),
	Bitcoin: Bitcoin,
	Buffer: Buffer,
	ECKey: require('./key'),
	Helper: require('./helper'),
	pkbdf2: require('pbkdf2-sha256')
};
