"use_strict"
const shareTransactions = exports

const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")

const messenger = require("./messenger")
const resolve = require("./resolve")

shareTransactions.list = async function (conf, account, lastLedger = 0) {
  if (typeof lastLedger !== "number") lastLedger = +lastLedger

  const options = {}
  const legitSources = listSignersKeys(account)
  options.filter = record => isLegitSharedTransaction(record, legitSources)
  if (lastLedger) options.breaker = record => record.ledger_attr <= lastLedger
  const txRecords = await messenger.listRaw(
    conf.multisig,
    conf.multisig.id,
    options
  )

  return txRecords.map(decodeTransactionRequest)
}

function isLegitSharedTransaction (record, legitSources) {
  if (record.memo_type !== "hash") return false
  return legitSources.find(accountId => accountId === record.source_account)
}

function decodeTransactionRequest (record) {
  const message = messenger.decode(null, record)
  message.ledger = record.ledger_attr
  message.xdr = message.content.toString("base64")
  delete message.content
  delete message.object
  return message
}

shareTransactions.makePushTx = async function (conf, transaction, senderId) {
  const txHash = transaction.hash()
  if (await transactionHasBeenPushed(conf, txHash)) {
    // eslint-disable-next-line no-console
    console.log("Transaction have already been pushed")
    return null
  }

  /// Make the transaction that puts transaction on-chain.
  const sender = await resolve.account(conf.multisig, senderId)
  const destination = conf.multisig.id
  const object = new StellarSdk.Memo("hash", txHash)
  const content = transaction.toEnvelope().toXDR()
  return messenger.encode(conf.multisig, sender, destination, object, content)
}

async function transactionHasBeenPushed (conf, txHash) {
  const txHash64 = txHash.toString("base64")
  const tester = record => recordHasMemo(record, "hash", txHash64)
  const record = await messenger.find(conf.multisig, conf.multisig.id, tester)
  return !!record
}

function recordHasMemo (record, type, value) {
  return record.memo_type === type && record.memo === value
}

function listSignersKeys (account) {
  return account.signers.map(signer => signer.key)
}
