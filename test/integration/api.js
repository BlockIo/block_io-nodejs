const test = require('tape');
const cache = require('../helpers/cache');
const helper = require('../helpers/generic');
const CT = require('../helpers/clienttest');

const BlockIo = require('../../lib/block_io');

const API_KEY = process.env.BLOCK_IO_API_KEY;
const PIN = process.env.BLOCK_IO_PIN;
const VERSION = process.env.BLOCK_IO_VERSION || BlockIo.DEFAULT_VERSION;
const SERVER = process.env.BLOCK_IO_SERVER || '';
const PORT = process.env.BLOCK_IO_PORT || '';
const NEWLABEL = (new Date()).getTime().toString(36);

if (process.env.DEBUG) process.on('uncaughtException', function (e) { console.log(e.stack); });

const client = new BlockIo({
  api_key: API_KEY,
  version: VERSION,
  server: SERVER,
  port: PORT
});

const pinLessClient = new BlockIo({
  api_key: API_KEY,
  version: VERSION,
  server: SERVER,
  port: PORT,
  options: { allowNoPin: true }
});

const badApiKeyClient = new BlockIo({
  api_key: "1111-1111-1111-1111",
  version: VERSION,
  server: SERVER,
  port: PORT
});

console.log('URL:', client._constructURL(''));

if (!helper.checkEnv()) process.exit(1);

function testInnerTxResult(desc, tx) {
  test(desc, t => {
    t.plan(6);
    t.equal(typeof tx.txid, 'string', 'must return txid');
    t.equal(typeof tx.from_green_address, 'boolean', 'must return green address indicator');
    t.equal(typeof tx.confirmations, 'number', 'must return a number of confirmations');
    t.ok(
      Array.isArray(tx.amounts_received) || Array.isArray(tx.amounts_sent),
      'must return an amounts array'
    );
    t.ok(Array.isArray(tx.senders), 'must return an senders array');
    t.equal(typeof tx.confidence, 'number', 'must return confidence');
  });
}

test('Block.IO Node.js API Wrapper', t => {
  t.plan(1);
  t.ok(VERSION == 1 || VERSION == 2, '[meta] Tests currently support version 1 and 2');
});

CT.create(test, client).title('Get Balance')
  .method('get_balance')
  .succeeds()
  .execute();

CT.create(test, client).title('Get New Address')
  .method('get_new_address')
  .succeeds()
  .execute();

CT.create(test, client).title('Get New Address (with label)')
  .method('get_new_address')
  .payload({label: NEWLABEL})
  .succeeds()
  .check((t, args) => t.equal(typeof args[1].data.address, 'string', 'must return an address'))
  .check((t, args) => t.equal(args[1].data.label, NEWLABEL, 'must assign the given label'))
  .postProcess(args => cache('newAddress', args[1].data.address))
  .execute();

CT.create(test, client).title('Get Addresses')
  .method('get_my_addresses')
  .succeeds()
  .check((t, args) => t.ok(
    helper.hasProp(helper.FEES, args[1].data.network),
    'must specify a known network'))
  .check((t, args) => t.ok(
    Array.isArray(args[1].data.addresses),
    'must return an array of addresses'))
  .check((t, args) => t.ok(args[1].data.addresses[0], 'must return at least one address'))
  .postProcess(args => {
    cache('minFee', helper.FEES[args[1].data.network]);
    const hasBalance = args[1].data.addresses.some(function (addr) {
      if (parseFloat(addr.available_balance, 10) > (20 * cache('minFee'))) {
        cache('fromAddress', addr.address);
        cache('fromLabel', addr.label);
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

if (["BTCTEST", "LTCTEST"].indexOf(cache('network')) !== -1) {

  CT.create(test, pinLessClient).title('Get New Address (with witness_v0 type)')
  .method('get_new_address')
  .payload({ address_type: "WITNESS_V0" })
  .succeeds()
  .check((t, args) => t.equal(args[1].data.address.length, 62, 'must create a WITNESS_V0 address'))
  .execute();

}

cache.require(['minFee', 'newAddress', 'fromAddress', 'fromLabel'], () => {

  CT.create(test, client).title('Prepare Transaction From Address')
    .method('prepare_transaction')
    .payload({
      from_addresses: cache('fromAddress'),
      to_label: NEWLABEL,
      amount: helper.calcWithdrawalAmount()
    })
    .succeeds()
    .returnsAttrs(['expected_unsigned_txid', 'user_key', 'inputs', 'outputs', 'input_address_data'])
    .postProcess(args => cache('preparedTransactionFromAddress', args[1]))
    .execute();

  CT.create(test, client).title('Prepare Transaction From Label')
    .method('prepare_transaction')
    .payload({
      from_labels: cache('fromLabel'),
      payment_address: cache('newAddress'),
      amount: helper.calcWithdrawalAmount()
    })
    .succeeds()
    .returnsAttrs(['expected_unsigned_txid', 'user_key', 'inputs', 'outputs', 'input_address_data'])
    .execute();

  cache.require(['preparedTransactionFromAddress'], () => {
      client.create_and_sign_transaction({data: cache('preparedTransactionFromAddress'), pin: PIN}).then((f) => {
	CT.create(test, client).title('Submit Transaction')
          .method('submit_transaction')
          .payload({
            transaction_data: f
          })
          .succeeds()
          .returnsAttrs(['network', 'txid'])
          .execute();
      });
  });
    
    // for now, since we only have v2,
    // assume forward compatibility of everything else

    CT.create(test, client).title('Validate API key (valid key)')
      .method('get_balance')
      .succeeds()
      .returnsAttrs('network')
      .execute();

    CT.create(test, badApiKeyClient).title('Validate API key (invalid key)')
      .method('get_balance')
      .failsServerSide()
      .execute();

    CT.create(test, client).title('Get network fee estimate')
      .method('get_network_fee_estimate')
      .payload({
        from_address: cache('fromAddress'),
        amounts: helper.calcWithdrawalAmount(),
        to_addresses: cache('newAddress')
      })
      .succeeds()
      .numericResult('estimated_network_fee', 'must return fee estimation data')
      .execute();

    CT.create(test, client).title('Get address balance (by address)')
      .method('get_address_balance')
      .payload({ address: cache('fromAddress') })
      .succeeds()
      .numericResult('available_balance', 'must return available balance')
      .numericResult('pending_received_balance', 'must return pending balance')
      .execute();

    CT.create(test, client).title('Get address balance (by label)')
      .method('get_address_balance')
      .payload({ label: cache('fromLabel') })
      .succeeds()
      .numericResult('available_balance', 'must return available balance')
      .numericResult('pending_received_balance', 'must return pending balance')
      .execute();

    CT.create(test, client).title('Get Received Transactions')
      .method('get_transactions')
      .payload({ type: 'received' })
      .succeeds()
      .returnsAttrs('network')
      .check((t, args) => t.ok(Array.isArray(args[1].data.txs), 'must return array of transactions'))
      .execute()
      .then(pt => {
        const txs = pt._result[1].data.txs;
        if (txs.length == 0) return;
        testInnerTxResult('Get Received Transactions ... inner tx result', txs[0]);
      });

    CT.create(test, client).title('Get Sent Transactions')
      .method('get_transactions')
      .payload({ type: 'sent' })
      .succeeds()
      .returnsAttrs('network')
      .check((t, args) => t.ok(Array.isArray(args[1].data.txs), 'must return array of transactions'))
      .execute()
      .then(pt => {
        const txs = pt._result[1].data.txs;
        if (txs.length == 0) return;
        testInnerTxResult('Get Sent Transactions ... inner tx result', txs[0]);
      });

    CT.create(test, client).title('Archive Address')
      .method('archive_address')
      .payload({ address: cache('newAddress') })
      .succeeds()
      .check((t, args) => t.ok(Array.isArray(args[1].data.addresses), 'must return an array of addresses'))
      .check((t, args) => t.ok(
        args[1].data.addresses.some(a => a.address == cache('newAddress') && a.archived)
        , 'must have archived said address'))
      .execute()
      .then(() => {

        CT.create(test, client).title('After Archive, Search Non-archived Address')
          .method('get_my_addresses')
          .succeeds()
          .check((t, args) => t.equal(
            args[1].data.addresses.filter(a => a.address == cache('newAddress')).length,
            0, 'must not contain archived address'
          ))
          .postProcess(() => cache('archiveSubTest1Done', true))
          .execute();

        CT.create(test, client).title('After Archive, Search Archived Address')
          .method('get_my_archived_addresses')
          .succeeds()
          .check((t, args) => t.ok(
            args[1].data.addresses.some(a => a.address == cache('newAddress')),
            'must contain archived address'
          ))
          .postProcess(() => cache('archiveSubTest2Done', true))
          .execute();

      });

    cache.require(['archiveSubTest1Done', 'archiveSubTest2Done'], () => {

      CT.create(test, client).title('Unarchive Address')
        .method('unarchive_address')
        .payload({ address: cache('newAddress') })
        .succeeds()
        .check((t, args) => t.ok(Array.isArray(args[1].data.addresses), 'must return an array of addresses'))
        .check((t, args) => t.ok(
          args[1].data.addresses.some(a => a.address == cache('newAddress') && !a.archived)
          , 'must have unarchived said address'))
        .execute()
        .then(() => {

          CT.create(test, client).title('After Unarchive, Search Archived Address')
            .method('get_my_archived_addresses')
            .succeeds()
            .check((t, args) => t.equal(
              args[1].data.addresses.filter(a => a.address == cache('newAddress')).length,
              0, 'must not contain archived address'
            ))
            .execute();

          CT.create(test, client).title('After Unarchive, Search Non-archived Address')
            .method('get_my_addresses')
            .succeeds()
            .check((t, args) => t.ok(
              args[1].data.addresses.some(a => a.address == cache('newAddress')),
              'must contain archived address'
            ))
            .execute();

        });

    });

});
