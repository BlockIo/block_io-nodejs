/*eslint no-mixed-spaces-and-tabs: ["error", "smart-tabs"]*/

const test = require('tape');
const fs = require('fs');
const BlockIo = require('../../lib/block_io');
//const Bitcoin = require('bitcoinjs-lib');
const path = require('path');

const PIN = "d1650160bd8d2bb32bebd139d0063eb6063ffa2f9e4501ad";
//const SWEEP_WIF = "cTj8Ydq9LhZgttMpxb7YjYSqsZ2ZfmyzVprQgjEzAzQ28frQi4ML";

const client = new BlockIo({
    api_key: "0000-0000-0000-0000",
    version: 2,
    pin: PIN,
});

test('create_and_sign_transaction.json', t => {
    // tests mix of P2SH, P2WSH-over-P2SH and WITNESS_V0 (P2WSH) inputs and signatures
    
    const prepare_transaction_response = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/test-cases/json/prepare_transaction_response.json")));
    const create_and_sign_transaction_response = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/test-cases/json/create_and_sign_transaction_response.json")));

    t.plan(2);

    client.create_and_sign_transaction({data: prepare_transaction_response, keys: []}).then((f,r) => {
	t.deepEqual(f,create_and_sign_transaction_response);
	t.equal(r,undefined);
    });
});

