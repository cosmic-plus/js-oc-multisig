/**
 * Publish/read arbitrary data on the blockchain
 *
 * @private
 * @exports messenger
 */
const messenger = exports

const Buffer = require('./buffer')
const loopCall = require('./loopcall')
const resolve = require('./resolve')

/**
 * Sends `message` to `destinations` with using `keypair`. The maximum size for
 * `message` is 6400 bytes minus the number for `destinations`. The cost of
 * emission is 1 stroop per destination + 1 stroop per 64 bytes to send. When a
 * destination account doesn't exist, it is created on-the-fly which incur an
 * additional cost of 1 lumen each
 *
 * @param {Keypair} keypair The keypair of a valid account.
 * @param {string|Array} destinations An address or an array of addresses (either
 *   account IDs or federated addresses).
 * @param {string|Memo} object  (max. 28 bytes for string).
 * @param {string|Buffer} message The message.
 * @returns {HorizonResponse}
 */
messenger.send = async function (conf, keypair, destinations, object, message) {
  const senderAccount = await resolve.account(conf, keypair.publicKey())
  const tx = await messenger.encode(conf, senderAccount, destinations, object, message)
  tx.sign(keypair)
  const server = resolve.network(conf)
  return server.submitTransaction(tx)
}

/**
 * Build a transaction to be signed by `senderAccount` that sends `message` to
 * `destinations`. The maximum size for `message` is 6400 bytes minus the number
 * of `destinations`. The cost of emission is 2 stroop per destination + 1
 * stroop per 64 bytes to send. When a destination account doesn't exist, it is
 * created on-the-fly which incur an additional cost of 1 lumen each.
 *
 * @param {AccountResponse} senderAccount The AccountResponse for sender
 * @param {string|Array} destination The account IDs where to send the message,
 *     or an array of account IDs.
 * @param {string|Memo} object The message object (max. 28 bytes for string).
 * @param {string|Buffer} message The message to be send.
 * @return {Transaction} A StellarSdk Transaction object.
 */
messenger.encode = async function (conf, senderAccount, destinations, object, message) {
  const txBuilder = new StellarSdk.TransactionBuilder(senderAccount)
  addMemo(txBuilder, object)
  await addDestinations(conf, txBuilder, destinations)
  addChunks(txBuilder, message)
  return txBuilder.build()
}

function addMemo (txBuilder, memo) {
  if (typeof memo === 'string') {
    const slicedMemo = Buffer.from(memo).slice(0, 28).toString()
    memo = new StellarSdk.Memo('text', slicedMemo)
  }
  if (memo) txBuilder.addMemo(memo)
}

async function addDestinations (conf, txBuilder, destinations) {
  if (!Array.isArray(destinations)) destinations = [ destinations ]

  for (let index in destinations) {
    const accountId = destinations[index]
    const addDestination = await linkToAccount(conf, accountId)
    txBuilder.addOperation(addDestination)
  }
}

async function linkToAccount (conf, accountId) {
  if (await resolve.accountIsEmpty(conf, accountId)) {
    return operation('createAccount', {
      destination: accountId,
      startingBalance: '1'
    })
  } else {
    return operation('payment', {
      destination: accountId,
      asset: StellarSdk.Asset.native(),
      amount: '0.0000001'
    })
  }
}

function addChunks (txBuilder, message) {
  if (!(message instanceof Buffer)) message = Buffer.from(message)
  const operationsLeft = 100 - txBuilder.operations.length
  if (message.length > operationsLeft * 64) {
    console.log('Warning: message will be truncated.')
  }

  for (let i = 0; i < operationsLeft; i++) {
    const chunk = message.slice(i * 64, i * 64 + 64)
    if (chunk.length === 0) break
    const storeChunk = operation('manageData', { name: 'Send', value: chunk })
    txBuilder.addOperation(storeChunk)
  }
}

function operation (type, params) {
  return StellarSdk.Operation[type](params)
}

/**
 * Return the message object embedded in `txHash`.
 *
 * @param {String} txHash A transaction hash
 * @return {Object} A message object with `sender`, `memo`, `date` and
 *     `message` fields.
 */
messenger.read = async function (conf, txHash) {
  const server = resolve.network(conf)
  const callBuilder = server.transactions().transaction(txHash)
  const txRecord = await callBuilder.call()
  return messenger.decode(conf, txRecord)
}

messenger.decode = function (conf, txRecord) {
  const transaction = new StellarSdk.Transaction(txRecord.envelope_xdr)
  if (transaction.operations.length < 2) return null
  return {
    sender: txRecord.source_account,
    object: transaction.memo,
    date: txRecord.created_at,
    message: extractMessage(transaction)
  }
}

function extractMessage (transaction) {
  const chunks = []
  transaction.operations.forEach(operation => {
    if (isMessageChunk(operation)) chunks.push(operation.value)
  })
  return Buffer.concat(chunks)
}

function isMessageChunk (operation) {
  return (operation.type === 'manageData' && operation.name === 'Send')
}

messenger.list = async function (conf, accountId, options) {
  const records = await messenger.listRaw(conf, accountId, options)
  return records.map(record => messenger.decode(conf, record))
}

messenger.listRaw = function (conf, accountId, options = {}) {
  const server = resolve.network(conf)
  const callBuilder = server.transactions().forAccount(accountId)
  if (options.cursor) callBuilder.cursor(options.cursor)
  if (options.order) callBuilder.order(options.order)
  options.filter = makeMessageFilter(options.filter)
  return loopCall(callBuilder, options)
}

function makeMessageFilter (baseFilter) {
  return function (record) {
    if (record.operation_count < 2) return false
    if (baseFilter) return baseFilter(record)
    else return true
  }
}

messenger.find = async function (conf, publicKey, func) {
  const records = await messenger.list(conf, publicKey, { limit: 1, filter: func })
  if (records[0]) return records[0]
}
