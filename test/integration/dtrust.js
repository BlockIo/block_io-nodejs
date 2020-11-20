const test = require('tape');
const cache = require('../helpers/cache');
const helper = require('../helpers/generic');
const CT = require('../helpers/clienttest');

const BlockIo = require('../../lib/block_io');
const Bitcoin = require('bitcoinjs-lib');

if (!helper.checkEnv()) process.exit(1);

if (process.env.DEBUG) process.on('uncaughtException', function (e) { console.log(e.stack); });

const API_KEY = process.env.BLOCK_IO_API_KEY;
const PIN = process.env.BLOCK_IO_PIN;
const VERSION = process.env.BLOCK_IO_VERSION || BlockIo.DEFAULT_VERSION;
const SERVER = process.env.BLOCK_IO_SERVER || '';
const PORT = process.env.BLOCK_IO_PORT || '';
const DTRUSTLABEL = ((new Date()).getTime() + 11).toString(36);

const REQUIRED_SIGS = 2;

// insecure keys for testing ;)
const KEYS = [
  BlockIo.ECKey.fromPassphrase(Buffer.from('key1')),
  BlockIo.ECKey.fromPassphrase(Buffer.from('key2')),
  BlockIo.ECKey.fromPassphrase(Buffer.from('key3'))
];

// Key 0 signs with lowR
KEYS[0].lowR = true;

const SIG_ADDRS = [
  'nZ7QHcpJ5tpzxQUV8vEnGU4m7zLjkNiMBU',
  'nj8visBXviBNZs5zXkn6DYG6Nc97Nv995g',
  'nUknbqqhSXHATS7SMH7wqf9e9tJcEZb3HY'
];

const client = new BlockIo({api_key: API_KEY, version: VERSION, server: SERVER, port: PORT});

test('Block.IO Node.js DTrust API Wrapper', t => {
  t.plan(1);
  t.ok(VERSION == 2, '[meta] DTrust currently only supports version 2');
});

CT.create(test, client).title('Get New DTrust Address')
  .method('get_new_dtrust_address')
  .payload({
    label: DTRUSTLABEL,
    required_signatures: REQUIRED_SIGS,
    public_keys: KEYS.map(key => key.pub.toString('hex')).join(',')
  })
  .succeeds()
  .returnsAttrs('address')
  .check((t, args) => t.equal(
    args[1].data.label, DTRUSTLABEL,
    'must assign the given label'))
  .check((t, args) => t.equal(
    args[1].data.additional_required_signatures, REQUIRED_SIGS,
    'must assign the given number of required signatures'))
  .check((t, args) => t.deepEqual(
    args[1].data.additional_signers, SIG_ADDRS,
    'must assign the correct addresses'))
  .check((t, args) => t.ok(
    Bitcoin.script.fromASM(args[1].data.redeem_script),
    'must create a valid redeem script'))
  .postProcess(args => cache('newDtrustAddress', args[1].data.address))
  .execute();

CT.create(test, client).title('Get New DTrust Address (too high required sigs)')
  .method('get_new_dtrust_address')
  .payload({
    label: DTRUSTLABEL,
    required_signatures: KEYS.length + 1,
    public_keys: KEYS.map(key => key.pub.toString('hex')).join(',')
  })
  .failsServerSide()
  .execute();

CT.create(test, client).title('Get New DTrust Address (duplicate signers)')
  .method('get_new_dtrust_address')
  .payload({
    label: DTRUSTLABEL,
    required_signatures: KEYS.length,
    public_keys: KEYS.map(() => KEYS[0].pub.toString('hex')).join(',')
  })
  .failsServerSide()
  .execute();

CT.create(test, client).title('Get DTrust Addresses')
  .method('get_my_dtrust_addresses')
  .succeeds()
  .check((t, args) => t.ok(
    helper.hasProp(helper.FEES, args[1].data.network),
    'must specify a known network'))
  .check((t, args) => t.ok(
    Array.isArray(args[1].data.addresses),
    'must return an array of addresses'))
  .check((t, args) => t.ok(
    args[1].data.addresses[0],
    'must return at least one address'))
  .postProcess(args => {
    cache('minFeeDTrust', helper.FEES[args[1].data.network]);
    const hasBalance = args[1].data.addresses.some(function (addr) {
      if (parseFloat(addr.available_balance, 10) > (20 * cache('minFeeDTrust'))) {
        cache('fromDTrustAddress', addr.address);
        cache('fromDTrustLabel', addr.label);
        return true;
      }
      return false;
    });

    if (!hasBalance) {
      console.log('ERROR: Not enough balance to continue tests!');
      process.exit(1);
    }
  })
  .execute();

cache.require(['newDtrustAddress'], () => {
  CT.create(test, client).title('Archive Address')
    .method('archive_dtrust_address')
    .payload({ address: cache('newDtrustAddress') })
    .succeeds()
    .check((t, args) => t.ok(Array.isArray(args[1].data.addresses), 'must return an array of addresses'))
    .check((t, args) => t.ok(
      args[1].data.addresses.some(a => a.address == cache('newDtrustAddress') && a.archived)
      , 'must have archived said address'))
    .execute()
    .then(() => {

      CT.create(test, client).title('After Archive, Search Non-archived Address')
        .method('get_my_dtrust_addresses')
        .succeeds()
        .check((t, args) => t.equal(
          args[1].data.addresses.filter(a => a.address == cache('newDtrustAddress')).length,
          0, 'must not contain archived address'
        ))
        .postProcess(() => cache('archiveSubTest1DTrust', true))
        .execute();

      CT.create(test, client).title('After Archive, Search Archived Address')
        .method('get_my_archived_dtrust_addresses')
        .succeeds()
        .check((t, args) => t.ok(
          args[1].data.addresses.some(a => a.address == cache('newDtrustAddress')),
          'must contain archived address'
        ))
        .postProcess(() => cache('archiveSubTest2DTrust', true))
        .execute();

    });

  cache.require(['archiveSubTest1DTrust', 'archiveSubTest2DTrust'], () => {

    CT.create(test, client).title('Unarchive Address')
      .method('unarchive_dtrust_address')
      .payload({ address: cache('newDtrustAddress') })
      .succeeds()
      .check((t, args) => t.ok(Array.isArray(args[1].data.addresses), 'must return an array of addresses'))
      .check((t, args) => t.ok(
        args[1].data.addresses.some(a => a.address == cache('newDtrustAddress') && !a.archived)
        , 'must have unarchived said address'))
      .execute()
      .then(() => {

        CT.create(test, client).title('After Unarchive, Search Archived Address')
          .method('get_my_archived_dtrust_addresses')
          .succeeds()
          .check((t, args) => t.equal(
            args[1].data.addresses.filter(a => a.address == cache('newDtrustAddress')).length,
            0, 'must not contain archived address'
          ))
          .postProcess(() => cache('unarchiveSubTest1DTrust', true))
          .execute();

        CT.create(test, client).title('After Unarchive, Search Non-archived Address')
          .method('get_my_dtrust_addresses')
          .succeeds()
          .check((t, args) => t.ok(
            args[1].data.addresses.some(a => a.address == cache('newDtrustAddress')),
            'must contain archived address'
          ))
          .postProcess(() => cache('unarchiveSubTest2DTrust', true))
          .execute();

      });

  });
})

cache.require([
  'minFeeDTrust', 'newDtrustAddress', 'fromDTrustLabel', 'fromDTrustAddress',
  'unarchiveSubTest1DTrust', 'unarchiveSubTest2DTrust'], () => {

  CT.create(test, client).title('Get network fee estimate')
    .method('get_dtrust_network_fee_estimate')
    .payload({
      from_address: cache('fromDTrustAddress'),
      amounts: helper.calcDTrustWithdrawalAmount(),
      to_addresses: cache('newDtrustAddress') })
    .succeeds()
    .numericResult('estimated_network_fee', 'must return fee estimation data')
    .execute();

  CT.create(test, client).title('Withdraw from DTrust Address')
    .method('withdraw_from_dtrust_address')
    .payload({
      from_addresses: cache('fromDTrustAddress'),
      to_label: DTRUSTLABEL,
      amount: helper.calcDTrustWithdrawalAmount(),
      pin: PIN })
    .succeeds()
    .returnsAttrs(['reference_id', 'inputs'])
    .check((t, args) => t.ok(
      args[1].data.encrypted_passphrase === null,
      'must not return an encrypted passphrase'))
    .check((t, args) => t.equal(
      args[1].data.inputs.filter(i => i.signatures_needed != REQUIRED_SIGS).length,
      0, 'must require the correct amounts of sigs'))
    .postProcess(args => cache('dtrustWithdrawal', args[1]))
    .execute();

});

cache.require(['dtrustWithdrawal'], () => {

  const w = cache('dtrustWithdrawal');
  w.data.inputs = BlockIo.helper.signInputs(KEYS[0], w.data.inputs);

  CT.create(test, client).title('Sending in single-key withdrawal sigs with low R')
  .method('sign_and_finalize_withdrawal')
  .payload({ signature_data: JSON.stringify(w.data) })
  .succeeds()
  .check((t, args) => t.equal(
    args[1].data.reference_id, w.data.reference_id,
    'must return the correct reference ID'))
  .check((t, args) => t.equal(
    args[1].data.inputs.filter(i => i.signatures_needed != REQUIRED_SIGS -1).length,
    0, 'must have decreased the amount of required sigs'))
  .execute();

  // sign with second key
  w.data.inputs = BlockIo.helper.signInputs(KEYS[2], w.data.inputs);
  CT.create(test, client).title('Sending in 2-key withdrawal sigs')
  .method('sign_and_finalize_withdrawal')
  .payload({ signature_data: JSON.stringify(w.data) })
  .succeeds()
  .returnsTx()
  .execute();

  // clear all sigs and resign with key 0
  w.data.inputs.forEach(i => i.signers.forEach(s => s.signed_data = null));
  w.data.inputs = BlockIo.helper.signInputs(KEYS[0], w.data.inputs);

  CT.create(test, client).title('Sending in an already finished withdrawal')
  .method('sign_and_finalize_withdrawal')
  .payload({ signature_data: JSON.stringify(w.data) })
  .failsServerSide()
  .execute();

});
