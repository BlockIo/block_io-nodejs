/*eslint no-mixed-spaces-and-tabs: ["error", "smart-tabs"]*/
// all tests here use 32-byte low R values

const test = require('tape');
const fs = require('fs');
const BlockIo = require('../../lib/block_io');
const Key = require('../../lib/key');
const Networks = require('../../lib/networks');
const path = require('path');

const PIN = "d1650160bd8d2bb32bebd139d0063eb6063ffa2f9e4501ad";
const SWEEP_WIF = "cTj8Ydq9LhZgttMpxb7YjYSqsZ2ZfmyzVprQgjEzAzQ28frQi4ML";
const SWEEP_HEX = Key.fromWIF(SWEEP_WIF, Networks.getNetwork("LTCTEST")).ecpair.privateKey.toString('hex');
const DTRUST_KEYS = ["b515fd806a662e061b488e78e5d0c2ff46df80083a79818e166300666385c0a2",
                     "001584b821c62ecdc554e185222591720d6fe651ed1b820d83f92cdc45c5e21f",
                     "2f9090b8aa4ddb32c3b0b8371db1b50e19084c720c30db1d6bb9fcd3a0f78e61",
                     "06c1cefdfd9187b36b36c3698c1362642083dcc1941dc76d751481d3aa29ca65"];

const client = new BlockIo({
    api_key: "0000-0000-0000-0000",
    version: 2,
    pin: PIN,
});

function full_path(relative_path) {
    return path.resolve(__dirname, relative_path);
}

function read_json_file(relative_path) {
    return JSON.parse(fs.readFileSync(full_path(relative_path)));
}

test('prepare_transaction_response.json', t => {
    // tests mix of P2SH, P2WSH-over-P2SH and WITNESS_V0 (P2WSH) inputs and signatures
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_transaction_response_P2WSH-over-P2SH_1of2_251inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_P2WSH-over-P2SH_1of2_251inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_P2WSH-over-P2SH_1of2_251inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_transaction_response_P2WSH-over-P2SH_1of2_252inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_P2WSH-over-P2SH_1of2_252inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_P2WSH-over-P2SH_1of2_252inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_transaction_response_P2WSH-over-P2SH_1of2_253inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_P2WSH-over-P2SH_1of2_253inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_P2WSH-over-P2SH_1of2_253inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_transaction_response_P2WSH-over-P2SH_1of2_762inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_P2WSH-over-P2SH_1of2_762inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_P2WSH-over-P2SH_1of2_762inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_p2sh.json (3of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_p2sh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_p2sh_3_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_p2sh.json (4of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_p2sh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_p2sh_4_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,4)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_p2wsh_over_p2sh.json (3of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_p2wsh_over_p2sh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_p2wsh_over_p2sh_3_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_p2wsh_over_p2sh.json (4of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_p2wsh_over_p2sh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_p2wsh_over_p2sh_4_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,4)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_witness_v0.json (3of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_witness_v0.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_witness_v0_3_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_witness_v0.json (4of5)', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_witness_v0.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_witness_v0_4_of_5_keys.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,4)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_sweep_transaction_response_p2pkh.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_sweep_transaction_response_p2pkh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_sweep_p2pkh.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: [SWEEP_HEX]}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_sweep_transaction_response_p2wpkh_over_p2sh.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_sweep_transaction_response_p2wpkh_over_p2sh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_sweep_p2wpkh_over_p2sh.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: [SWEEP_HEX]}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_sweep_transaction_response_p2wpkh.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_sweep_transaction_response_p2wpkh.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_sweep_p2wpkh.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: [SWEEP_HEX]}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_P2SH_3of5_195inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_P2SH_3of5_195inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_P2SH_3of5_195inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

/* 
   omit 4of5 tests due to difference in low R signature generation (see fixed_low_r_sign in lib/key.js)
*/
/*
test('prepare_dtrust_transaction_response_P2SH_4of5_195inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_P2SH_4of5_195inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_P2SH_4of5_195inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,4)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});
*/

test('prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_251inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_251inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_P2WSH-over-P2SH_3of5_251inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_252inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_252inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_P2WSH-over-P2SH_3of5_252inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_253inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_P2WSH-over-P2SH_3of5_253inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_P2WSH-over-P2SH_3of5_253inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_WITNESS_V0_3of5_251inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_WITNESS_V0_3of5_251inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_WITNESS_V0_3of5_251inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_WITNESS_V0_3of5_252inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_WITNESS_V0_3of5_252inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_WITNESS_V0_3of5_252inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_WITNESS_V0_3of5_253inputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_WITNESS_V0_3of5_253inputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_WITNESS_V0_3of5_253inputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_witness_v0_3of5_251outputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_witness_v0_3of5_251outputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_witness_v0_3of5_251outputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_witness_v0_3of5_252outputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_witness_v0_3of5_252outputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_witness_v0_3of5_252outputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_dtrust_transaction_response_witness_v0_3of5_253outputs.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_dtrust_transaction_response_witness_v0_3of5_253outputs.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_dtrust_witness_v0_3of5_253outputs.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: DTRUST_KEYS.slice(0,3)}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

test('prepare_transaction_response_with_blockio_fee_and_expected_unsigned_txid.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_with_blockio_fee_and_expected_unsigned_txid.json");
    const summarize_prepared_transaction_response = read_json_file("../../data/test-cases/json/summarize_prepared_transaction_response_with_blockio_fee_and_expected_unsigned_txid.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_with_blockio_fee_and_expected_unsigned_txid.json");

    t.plan(3);

    client.summarize_prepared_transaction({data: prepare_transaction_response}).then((f) => {
	t.deepEqual(f,summarize_prepared_transaction_response);
    }).catch((r) => {
	console.log(r);
	t.equal(typeof(r),'undefined', "should not throw exception");
    });
     
    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

    // change the expected unsigned txid
    prepare_transaction_response.data.expected_unsigned_txid = 'x';
    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f) => {
	t.equal(typeof(f),'undefined', "should have no response");
    }).catch((r) => {
	t.notEqual(typeof(r),'undefined', "should throw exception");
    });

});

test('prepare_transaction_response_witness_v1_output.json', t => {
    
    const prepare_transaction_response = read_json_file("../../data/test-cases/json/prepare_transaction_response_witness_v1_output.json");
    const create_and_sign_transaction_response = read_json_file("../../data/test-cases/json/create_and_sign_transaction_response_witness_v1_output.json");

    t.plan(1);

    client.create_and_sign_transaction({data: prepare_transaction_response}).then((f) => {
	t.deepEqual(f,create_and_sign_transaction_response);	
    }).catch((r) => {
	t.equal(typeof(r),'undefined', "should not throw exception");
    });

});

