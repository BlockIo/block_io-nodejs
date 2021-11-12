/*eslint no-mixed-spaces-and-tabs: ["error", "smart-tabs"]*/

const test = require('tape');
const bitcoin = require('bitcoinjs-lib');
const ecpair = require('ecpair');

const KEYS = ["ef4fc6cfd682494093bbadf041ba4341afbe22b224432e21a4bc4470c5b939d4",
              "123f37eb9a7f24a120969a1b2d6ac4859fb8080cfc2e8d703abae0f44305fc12"];

const PUBLIC_KEYS = [ecpair.ECPair.fromPrivateKey(Buffer.from(KEYS[0], 'hex')).publicKey.toString('hex'),
                     ecpair.ECPair.fromPrivateKey(Buffer.from(KEYS[1], 'hex')).publicKey.toString('hex')];

const LTCTEST = {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'tltc',
    bip32: {
        public: 0x0436ef7d,
        private: 0x0436f6e1,
    },
    pubKeyHash: 0x6f,
    scriptHash: 0x3a,
    wif: 0xef,
};

// these keys will use low R signatures
const KEY1 = ecpair.ECPair.fromPrivateKey(Buffer.from(KEYS[0], 'hex'));
KEY1.lowR = true;
const KEY2 = ecpair.ECPair.fromPrivateKey(Buffer.from(KEYS[1], 'hex'));
KEY2.lowR = true;

const REDEEM_SCRIPT = bitcoin.payments.p2ms({m: 2, pubkeys: [Buffer.from(PUBLIC_KEYS[0], 'hex'), Buffer.from(PUBLIC_KEYS[1], 'hex')], network: LTCTEST});

const P2PKH_ADDRESS = bitcoin.payments.p2pkh({pubkey: KEY1.publicKey, network: LTCTEST})
const P2WPKH_ADDRESS = bitcoin.payments.p2wpkh({pubkey: KEY1.publicKey, network: LTCTEST});
const P2WPKH_OVER_P2SH_ADDRESS = bitcoin.payments.p2sh({redeem: P2WPKH_ADDRESS});

const P2SH_ADDRESS = bitcoin.payments.p2sh({redeem: REDEEM_SCRIPT});
const P2WSH_ADDRESS = bitcoin.payments.p2wsh({redeem: REDEEM_SCRIPT});
const P2WSH_OVER_P2SH_ADDRESS = bitcoin.payments.p2sh({redeem: bitcoin.payments.p2wsh({redeem: REDEEM_SCRIPT})})

const OUTPUT_VALUE = 1000000000;
const FEE = 10000;

test('generates correct LTCTEST addresses', t => {

    t.plan(7);

    t.doesNotThrow(() => {
	
	t.equal(P2PKH_ADDRESS.address.toString(), "mwop54ocwGjeErSTLCKgKxrdYp1k9o6Cgk");
	t.equal(P2WPKH_ADDRESS.address.toString(), "tltc1qk2erszs7fp407kh94e6v3yhfq2njczjvg4hnz6");
	t.equal(P2WPKH_OVER_P2SH_ADDRESS.address.toString(), "Qgn9vENxxnNCPun8CN6KR1PPB7WCo9oxqc");

	t.equal(P2SH_ADDRESS.address.toString(), "QPZMy7ivpYdkJRLhtTx7tj5Fa4doQ2auWk");
	t.equal(P2WSH_ADDRESS.address.toString(), "tltc1q6s4cxsg5q4vm0ksst6rxn68h6ksrwumy9tvzgqa6jxuqllxyzh0qxt7q8g");
	t.equal(P2WSH_OVER_P2SH_ADDRESS.address.toString(), "QeyxkrKbgKvxbBY1HLiBYjMnZx1HDRMYmd");
	
    }, undefined, "must not throw any Errors");
    
});


test('TEST P2SH to P2WSH-over-P2SH', t => {

    t.plan(5);

    let cur_input_value = OUTPUT_VALUE + 0;
    let cur_output_value = OUTPUT_VALUE - FEE;

    t.doesNotThrow(() => {

	let psbt = new bitcoin.Psbt({network: LTCTEST});

	psbt.setVersion(1);
	psbt.setLocktime(0);

	psbt.addInput({
	    hash: '4ad80b9776f574a125f89e96bda75bb6fe046f7560847d16446bbdcdc160be62',
	    index: 1,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: REDEEM_SCRIPT.output, value: cur_input_value},
	    redeemScript: REDEEM_SCRIPT.output
	});
	
	psbt.addOutput({
	    address: P2WSH_OVER_P2SH_ADDRESS.address.toString(),
	    value: cur_output_value
	});
	
	// unsigned payload must match
	t.equal(psbt.__CACHE.__TX.toHex(),
		"010000000162be60c1cdbd6b44167d8460756f04feb65ba7bd969ef825a174f576970bd84a0100000000ffffffff01f0a29a3b0000000017a914c99a494597ade09b5194f9ec8e02d96607ae64798700000000");
	
	let sigHash0 = psbt.__CACHE.__TX.hashForSignature(0, REDEEM_SCRIPT.output, bitcoin.Transaction.SIGHASH_ALL).toString('hex');
	
	// sighash0 must match
	t.equal(sigHash0, "93a075651d1b6b79cd9bf128bf5e15001fe65865defea6cedab0a1da438f565e");
	
	psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
	
	psbt.signInput(0, KEY1);
	psbt.signInput(0, KEY2);
	
	let signed_payload = psbt.finalizeAllInputs().extractTransaction();
	
	// signed payload must match
	t.equal(signed_payload.toHex(),
		"010000000162be60c1cdbd6b44167d8460756f04feb65ba7bd969ef825a174f576970bd84a01000000d900473044022009143b07279ef6d5317865672e9fc28ada31314abf242ae786917b92cf027ac002207544d055f2b8bb249dc0294d565c6d538f4e04f9b142331fa103d82e0498a181014730440220561f9c23560c6d994c666b9b327f3ef1d9c0b29d0404396d1d6c7a86fc45fc7d02201909041cbe02fc9367f8ce019278629e3f8eae9b7a33fc8223e6fa89e368bd810147522103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38e210238de8c9eb2842ecaf0cc61ee6ba23fe4e46f1cfd82eac0910e1d8e865bd76df952aeffffffff01f0a29a3b0000000017a914c99a494597ade09b5194f9ec8e02d96607ae64798700000000");
	
	t.equal(signed_payload.getId(), "2464c6122378ee5ed9a42d5192e15713b107924d05d15b58254eb7b2030118c7");
	
    }, undefined, "must not throw any Errors");
});

test('TEST P2WSH-over-P2SH to P2WPKH', t => {
    t.plan(5);

    let cur_input_value = OUTPUT_VALUE - FEE;
    let cur_output_value = OUTPUT_VALUE - FEE - FEE;
    
    t.doesNotThrow(() => {
	
	let psbt = new bitcoin.Psbt({network: LTCTEST});

	psbt.setVersion(1);
	psbt.setLocktime(0);
	
	psbt.addInput({
	    hash: "2464c6122378ee5ed9a42d5192e15713b107924d05d15b58254eb7b2030118c7",
	    index: 0,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: bitcoin.payments.p2wsh({redeem: REDEEM_SCRIPT}).output, value: cur_input_value},
	    witnessScript: REDEEM_SCRIPT.output,
	    redeemScript: P2WSH_OVER_P2SH_ADDRESS.output
	});
	
	psbt.addOutput({
	    address: P2WPKH_ADDRESS.address.toString(),
	    value: cur_output_value
	});
	
	t.equal(psbt.__CACHE.__TX.toHex(),
		"0100000001c7180103b2b74e25585bd1054d9207b11357e192512da4d95eee782312c664240000000000ffffffff01e07b9a3b00000000160014b2b2380a1e486aff5ae5ae74c892e902a72c0a4c00000000");

	let sigHash0 = psbt.__CACHE.__TX.hashForWitnessV0(0, REDEEM_SCRIPT.output, cur_input_value, bitcoin.Transaction.SIGHASH_ALL).toString('hex');

	t.equal(sigHash0, "e1c684f769c0e186be215ece3b7c1f3f23985ecbafafe0c8d43936fcd79eafdc");

	psbt.signInput(0, KEY1);
	psbt.signInput(0, KEY2);

	let signed_payload = psbt.finalizeAllInputs().extractTransaction();

	t.equal(signed_payload.toHex(),
		"01000000000101c7180103b2b74e25585bd1054d9207b11357e192512da4d95eee782312c664240000000023220020d42b8341140559b7da105e8669e8f7d5a03773642ad82403ba91b80ffcc415deffffffff01e07b9a3b00000000160014b2b2380a1e486aff5ae5ae74c892e902a72c0a4c0400473044022067c9f8ed5c8f0770be1b7d44ade72c4d976a2b0e6c4df39ea70923daff26ea5e02205894350de5304d446343fbf95245cd656876a11c94025554bf878b3ecf90db720147304402204ee76a1814b3eb289e492409bd29ebb77088c9c20645c8a63c75bfe44eac41f70220232bcd35a0cc78e88dfa59dc15331023c3d3bb3a8b63e6b753c8ab4599b7bd290147522103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38e210238de8c9eb2842ecaf0cc61ee6ba23fe4e46f1cfd82eac0910e1d8e865bd76df952ae00000000");
	
	t.equal(signed_payload.getId(), "66a78d3cda988e4c90611b192ae5bd02e0fa70c08c3219110c02594802a42c01");
	
    }, undefined, "must not throw any Errors");
});


test('TEST P2WPKH to P2WSH (WITNESS_V0)', t => {
    t.plan(5);

    let cur_input_value = OUTPUT_VALUE - FEE - FEE;
    let cur_output_value = OUTPUT_VALUE - FEE - FEE - FEE;
    
    t.doesNotThrow(() => {

	let psbt = new bitcoin.Psbt({network: LTCTEST});
	psbt.setVersion(1);
	psbt.setLocktime(0);
	
	psbt.addInput({
	    hash: '66a78d3cda988e4c90611b192ae5bd02e0fa70c08c3219110c02594802a42c01',
	    index: 0,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: P2WPKH_ADDRESS.output, value: cur_input_value},
	});

	psbt.addOutput({
	    address: P2WSH_ADDRESS.address.toString(),
	    value: cur_output_value
	});

	t.equal(psbt.__CACHE.__TX.toHex(),
		"0100000001012ca4024859020c1119328cc070fae002bde52a191b61904c8e98da3c8da7660000000000ffffffff01d0549a3b00000000220020d42b8341140559b7da105e8669e8f7d5a03773642ad82403ba91b80ffcc415de00000000");

	// p2wpkh uses the p2pkh script template for signing
	let sigHash0 = psbt.__CACHE.__TX.hashForWitnessV0(0, P2PKH_ADDRESS.output, cur_input_value, bitcoin.Transaction.SIGHASH_ALL).toString('hex');

	t.equal(sigHash0, "ff94560e1ca289de4d661695029f495dde37b16bddd6645fb65c8f61decec22c");

	psbt.signInput(0, KEY1);

	let signed_payload = psbt.finalizeAllInputs().extractTransaction();

	t.equal(signed_payload.toHex(),
		"01000000000101012ca4024859020c1119328cc070fae002bde52a191b61904c8e98da3c8da7660000000000ffffffff01d0549a3b00000000220020d42b8341140559b7da105e8669e8f7d5a03773642ad82403ba91b80ffcc415de024730440220436f9c0d1bb66cb507da29ba3a583b152b5265d9eba1f4067612124ea7f536470220414213d205f4becf61481a1c816684b0e9912f4abcc174211b20c88b6158b005012103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38e00000000");
	
	t.equal(signed_payload.getId(), "d14891128bc4c72dfa45269f302edf690289214874c5ee40b118c1d5465319e6");
	
    }, undefined, "must not throw any Errors");
});


test('TEST P2WSH (WITNESS_V0) to P2WPKH-over-P2SH', t => {
    t.plan(5);

    let cur_input_value = OUTPUT_VALUE - FEE - FEE - FEE;
    let cur_output_value = OUTPUT_VALUE - FEE - FEE - FEE - FEE;
    
    t.doesNotThrow(() => {

	let psbt = new bitcoin.Psbt({network: LTCTEST});
	psbt.setVersion(1);
	psbt.setLocktime(0);
	
	psbt.addInput({
	    hash: "d14891128bc4c72dfa45269f302edf690289214874c5ee40b118c1d5465319e6",
	    index: 0,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: P2WSH_ADDRESS.output, value: cur_input_value},
	    witnessScript: REDEEM_SCRIPT.output,
	});

	psbt.addOutput({
	    address: P2WPKH_OVER_P2SH_ADDRESS.address.toString(),
	    value: cur_output_value
	});

	t.equal(psbt.__CACHE.__TX.toHex(),
		"0100000001e6195346d5c118b140eec5744821890269df2e309f2645fa2dc7c48b129148d10000000000ffffffff01c02d9a3b0000000017a914dd4edd1406541e476450fda7924720fe19f337b98700000000");

	let sigHash0 = psbt.__CACHE.__TX.hashForWitnessV0(0, REDEEM_SCRIPT.output, cur_input_value, bitcoin.Transaction.SIGHASH_ALL).toString('hex');

	t.equal(sigHash0, "bd77fd23a1e80c3670d7a547ce45031f5f611e4dc49a2eb65def2e6db841e011");

	psbt.signInput(0, KEY1);
	psbt.signInput(0, KEY2);

	let signed_payload = psbt.finalizeAllInputs().extractTransaction();

	t.equal(signed_payload.toHex(),
		"01000000000101e6195346d5c118b140eec5744821890269df2e309f2645fa2dc7c48b129148d10000000000ffffffff01c02d9a3b0000000017a914dd4edd1406541e476450fda7924720fe19f337b987040047304402205f2cabd4fa34e0947f07454a9d905073a21bb0818a009356481c1acd6f915f6f02203ba6bb8148a1790f4e1939ea74a21dcc8a837595e54323bbba0615a15b779c4901473044022033d8136791bc5658700b385ca5728b9e188a3ba1aa3bc691d6adfd1b8431cee6022073d565e5d1e96c0257f7cefdab946e48fb3857248f49048e00f6b701e97457c30147522103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38e210238de8c9eb2842ecaf0cc61ee6ba23fe4e46f1cfd82eac0910e1d8e865bd76df952ae00000000");

	t.equal(signed_payload.getId(), "d76dd93d5afbc8cb3bfd487445fac9f81d7ae409723990f7744f398feae9c0e4");
	
    }, undefined, "must not throw any Errors");
});


test('TEST P2WPKH-over-P2SH to P2PKH', t => {
    t.plan(5);

    let cur_input_value = OUTPUT_VALUE - FEE - FEE - FEE - FEE;
    let cur_output_value = OUTPUT_VALUE - FEE - FEE - FEE - FEE - FEE;
    
    t.doesNotThrow(() => {

	let psbt = new bitcoin.Psbt({network: LTCTEST});
	psbt.setVersion(1);
	psbt.setLocktime(0);
	
	psbt.addInput({
	    hash: "d76dd93d5afbc8cb3bfd487445fac9f81d7ae409723990f7744f398feae9c0e4",
	    index: 0,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: P2WPKH_OVER_P2SH_ADDRESS.output, value: cur_input_value},
	    redeemScript: P2WPKH_ADDRESS.output,
	});

	psbt.addOutput({
	    address: P2PKH_ADDRESS.address.toString(),
	    value: cur_output_value
	});

	t.equal(psbt.__CACHE.__TX.toHex(),
		"0100000001e4c0e9ea8f394f74f790397209e47a1df8c9fa457448fd3bcbc8fb5a3dd96dd70000000000ffffffff01b0069a3b000000001976a914b2b2380a1e486aff5ae5ae74c892e902a72c0a4c88ac00000000");

	let sigHash0 = psbt.__CACHE.__TX.hashForWitnessV0(0, P2PKH_ADDRESS.output, cur_input_value, bitcoin.Transaction.SIGHASH_ALL).toString('hex');
	
	t.equal(sigHash0, "59e2322a152dbad2c283232bd098a55c61bc0cd324dfd85311a0a9e73053d46b");

	psbt.signInput(0, KEY1);

	let signed_payload = psbt.finalizeAllInputs().extractTransaction();

	t.equal(signed_payload.toHex(),
		"01000000000101e4c0e9ea8f394f74f790397209e47a1df8c9fa457448fd3bcbc8fb5a3dd96dd70000000017160014b2b2380a1e486aff5ae5ae74c892e902a72c0a4cffffffff01b0069a3b000000001976a914b2b2380a1e486aff5ae5ae74c892e902a72c0a4c88ac02473044022067efbe904404b388bf11cf8af610f2efa95ac943a67071c3c5fe0332286d672e02205f3917d8967d7f32fb65c0808c6c0de7dda8a080bf92f80c1ee13d33757fd1df012103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38e00000000");

	t.equal(signed_payload.getId(), "74b178c39268acd0663c88d3a56665b2f5335b60711445a5f8cd8aa59c2c7d38");
	
    }, undefined, "must not throw any Errors");
});


test('TEST P2PKH to P2SH', t => {
    t.plan(5);

    let cur_input_value = OUTPUT_VALUE - FEE - FEE - FEE - FEE - FEE;
    let cur_output_value = OUTPUT_VALUE - FEE - FEE - FEE - FEE - FEE - FEE;
    
    t.doesNotThrow(() => {

	let psbt = new bitcoin.Psbt({network: LTCTEST});
	psbt.setVersion(1);
	psbt.setLocktime(0);
	
	psbt.addInput({
	    hash: "74b178c39268acd0663c88d3a56665b2f5335b60711445a5f8cd8aa59c2c7d38",
	    index: 0,
	    sequence: 0xffffffff,
	    witnessUtxo: {script: P2PKH_ADDRESS.output, value: cur_input_value},
	});
	
	psbt.addOutput({
	    address: P2SH_ADDRESS.address.toString(),
	    value: cur_output_value
	});

	t.equal(psbt.__CACHE.__TX.toHex(),
		"0100000001387d2c9ca58acdf8a5451471605b33f5b26566a5d3883c66d0ac6892c378b1740000000000ffffffff01a0df993b0000000017a9142069605a7742286aef950b68ae7818f7294e876c8700000000");

	let sigHash0 = psbt.__CACHE.__TX.hashForSignature(0, P2PKH_ADDRESS.output, bitcoin.Transaction.SIGHASH_ALL).toString('hex');

	t.equal(sigHash0, "ae52a447200543a0e5a5ca8de0bad10eebb411748d137f7b2fba380b98ea6651");

	psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
	psbt.signInput(0, KEY1);

	let signed_payload = psbt.finalizeAllInputs().extractTransaction();

	t.equal(signed_payload.toHex(),
		"0100000001387d2c9ca58acdf8a5451471605b33f5b26566a5d3883c66d0ac6892c378b174000000006a47304402200baec9555d3852ff2627971e5b4f26c186792bb4960bacf1270372c3b540b85b0220461100cd59a45fe922df4c4d8a3c14f358bfdc68f500811ac3cde0fb8d8c1f2a012103820317ad251bca573c8fda2b8f26ffc9aae9d5ecb15b50ee08d8f9e009def38effffffff01a0df993b0000000017a9142069605a7742286aef950b68ae7818f7294e876c8700000000");
    
	t.equal(signed_payload.getId(), "e4dd8c000f65fcf42598ff332ef81852b44bac9dcdecac72d69a4c56b8c59b73");
	
    }, undefined, "must not throw any Errors");
});


