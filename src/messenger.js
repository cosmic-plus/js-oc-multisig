/**
 * Publish/read arbitrary data on the blockchain
 *
 * @private
 * @exports messenger
 */
const messenger = exports

const Buffer = require("@cosmic-plus/base/es5/buffer")
const loopcall = require("@cosmic-plus/loopcall")
const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")

const resolve = require("./resolve")

/**
 * Sends a message to `destinations` with using `keypair`. The maximum size for
 * `content` is 6400 bytes minus the number of `destinations`. The cost of
 * emission is 1.01 stroop per destination + 1 stroop per 64 bytes to send. When a
 * destination account doesn't exist, it is created on-the-fly which incur an
 * additional cost of 1 lumen each
 *
 * @param {Keypair} keypair The keypair of the sender.
 * @param {string|Array} destinations An address or an array of addresses (either
 *   account IDs or federated addresses).
 * @param {string|Memo} object  (max. 28 bytes for string).
 * @param {string|Buffer} content The message content.
 * @returns {HorizonResponse}
 */
messenger.send = async function (conf, keypair, destinations, object, content) {
  const senderAccount = await resolve.account(conf, keypair.publicKey())
  const tx = await messenger.encode(
    conf,
    senderAccount,
    destinations,
    object,
    content
  )
  tx.sign(keypair)
  const server = resolve.network(conf)
  return server.submitTransaction(tx)
}

/**
 * Build a transaction to be signed by `senderAccount` that sends message to
 * `destinations`. The maximum size for `content` is 6400 bytes minus the number
 * of `destinations`. The cost of emission is 1.01 stroop per destination + 1
 * stroop per 64 bytes to send. When a destination account doesn't exist, it is
 * created on-the-fly which incur an additional cost of 1 lumen each.
 *
 * @param {AccountResponse} senderAccount The AccountResponse for sender
 * @param {string|Array} destination The account IDs where to send the message,
 *     or an array of account IDs.
 * @param {string|Memo} object The message object (max. 28 bytes for string).
 * @param {string|Buffer} content The message content.
 * @return {Transaction} A StellarSdk Transaction object.
 */
messenger.encode = async function (
  conf,
  senderAccount,
  destinations,
  object,
  content
) {
  const txBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
    fee: 100
  })
  addMemo(txBuilder, object)
  await addDestinations(conf, txBuilder, destinations)
  addContent(txBuilder, content)
  return txBuilder.setTimeout(StellarSdk.InfiniteTimeout).build()
}

function addMemo (txBuilder, memo) {
  if (typeof memo === "string") {
    const slicedMemo = Buffer.from(memo)
      .slice(0, 28)
      .toString()
    memo = new StellarSdk.Memo("text", slicedMemo)
  }
  if (memo) txBuilder.addMemo(memo)
}

async function addDestinations (conf, txBuilder, destinations) {
  if (!Array.isArray(destinations)) destinations = [destinations]

  for (let index in destinations) {
    const accountId = destinations[index]
    const addDestination = await linkToAccount(conf, accountId)
    txBuilder.addOperation(addDestination)
  }
}

async function linkToAccount (conf, accountId) {
  if (await resolve.accountIsEmpty(conf, accountId)) {
    return operation("createAccount", {
      destination: accountId,
      startingBalance: "1"
    })
  } else {
    return operation("payment", {
      destination: accountId,
      asset: StellarSdk.Asset.native(),
      amount: "0.0000001"
    })
  }
}

function addContent (txBuilder, content) {
  if (!(content instanceof Buffer)) content = Buffer.from(content)
  const operationsLeft = 100 - txBuilder.operations.length
  if (content.length > operationsLeft * 64) {
    // eslint-disable-next-line no-console
    console.log("Warning: message will be truncated.")
  }

  for (let i = 0; i < operationsLeft; i++) {
    const chunk = content.slice(i * 64, i * 64 + 64)
    if (chunk.length === 0) break
    const storeChunk = operation("manageData", { name: "Send", value: chunk })
    txBuilder.addOperation(storeChunk)
  }
}

function operation (type, params) {
  return StellarSdk.Operation[type](params)
}

/**
 * Parse the message object from transaction `txHash`.
 *
 * @param {String} txHash A transaction hash
 * @return {Object} A message object with `sender`, `object`, `date` and
 *     `content` fields.
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
    object: extractObject(transaction.memo),
    date: txRecord.created_at,
    content: extractContent(transaction)
  }
}

function extractObject (memo) {
  if (memo._type === "hash" || memo._type === "return") {
    return memo._value.toString("hex")
  } else {
    return memo._value.toString("utf8")
  }
}

function extractContent (transaction) {
  const chunks = []
  transaction.operations.forEach(operation => {
    if (isContentChunk(operation)) chunks.push(operation.value)
  })
  return Buffer.concat(chunks)
}

function isContentChunk (operation) {
  return operation.type === "manageData" && operation.name === "Send"
}

messenger.list = async function (conf, accountId, options) {
  const records = await messenger.listRaw(conf, accountId, options)
  return records.map(record => messenger.decode(conf, record))
}

messenger.listRaw = async function (conf, accountId, options = {}) {
  if (await resolve.accountIsEmpty(conf, accountId)) return []
  const server = resolve.server(conf)
  const callBuilder = server.transactions().forAccount(accountId)
  if (options.cursor) callBuilder.cursor(options.cursor)
  if (options.order) callBuilder.order(options.order)
  options.filter = makeMessageFilter(options.filter)
  return loopcall(callBuilder, options)
}

function makeMessageFilter (baseFilter) {
  return function (record) {
    if (record.operation_count < 2) return false
    if (baseFilter) return baseFilter(record)
    else return true
  }
}

messenger.find = async function (conf, publicKey, func) {
  const records = await messenger.list(conf, publicKey, {
    limit: 1,
    filter: func
  })
  if (records[0]) return records[0]
}
