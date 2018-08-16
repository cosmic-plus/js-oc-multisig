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
 * Build a transaction to be signed by `sender` to send `message` to
 * `destination`, with `memo`. The maximum size for `message` is 6336 bytes.
 * `destination` can also be an array of several publicKeys, in which case
 * each additional key after the first one will lower the maximum `message`
 * size by 64 bytes.
 *
 * The cost of emission is 1 stroop per destination + 1 stroop for each
 * 64 bytes to send.
 *
 * @param {AccountResponse} sender The AccountResponse for sender
 * @param {String|Array} destination The publicKey where to send the message,
 *     or an array of publicKeys.
 * @param {Memo|String} memo The memo for the transaction (max. 28 bytes for strings).
 * @param {String} message The message to be send.
 * @return {Transaction} A StellarSdk Transaction object
 */
messenger.sendTx = async function (conf, sender, destination, memo, message) {
  if (!memo) memo = new StellarSdk.Memo('none')
  if (!message) message = ''
  if (typeof memo === 'string') {
    memo = new StellarSdk.Memo('text', Buffer.from(memo).slice(0, 28).toString())
  } else if (!(memo instanceof StellarSdk.Memo)) {
    throw new TypeError('memo is not a string nor a memo.')
  }
  if (typeof message !== 'string' && !(message instanceof Buffer)) {
    throw new TypeError('message is not a string nor a buffer.')
  }

  const txBuilder = new StellarSdk.TransactionBuilder(sender)

  txBuilder.addMemo(memo)

  /// Create destinations on-the-fly when needed.
  if (!Array.isArray(destination)) destination = [ destination ]
  for (let index in destination) {
    const entry = destination[index]
    if (await resolve.accountIsEmpty(conf, entry)) {
      txBuilder.addOperation(StellarSdk.Operation.createAccount({
        destination: entry,
        startingBalance: '1'
      }))
    } else {
      txBuilder.addOperation(StellarSdk.Operation.payment({
        destination: entry,
        asset: StellarSdk.Asset.native(),
        amount: '0.0000001'
      }))
    }
  }

  if (!(message instanceof Buffer)) message = Buffer.from(message)
  const opNum = 100 - destination.length
  if (message.length > opNum * 64) console.log('Warning: message will be truncated.')

  for (let i = 0; i < opNum; i++) {
    const chunk = message.slice(i * 64, i * 64 + 64)
    if (chunk.length === 0) break
    txBuilder.addOperation(StellarSdk.Operation.manageData({
      name: 'Send',
      value: chunk
    }))
  }
  return txBuilder.build()
}

/**
 * Return the message object from `txHash`, using `server` to fetch datas.
 *
 * @param {Server} server A StellarSdk Server object
 * @param {String} txHash A transaction hash
 * @return {Object} A message object with `sender`, `memo`, `date` and
 *     `message` fields.
 */
messenger.read = async function (conf, txHash) {
  const server = resolve.network(conf)
  const caller = server.transactions()
  const answer = await caller.transaction(txHash).call()
  return {
    sender: answer.source_account,
    memo: extractMemo(answer),
    date: answer.created_at,
    message: extractMessage(answer)
  }
}

function extractMemo (txCallAnswer) {
  const tx = new StellarSdk.Transaction(txCallAnswer.envelope_xdr)
  return tx.memo
}

function extractMessage (txCallAnswer) {
  if (txCallAnswer.operation_count < 2) return null
  const array = []
  const tx = new StellarSdk.Transaction(txCallAnswer.envelope_xdr)
  tx.operations.forEach(entry => {
    if (entry.type === 'manageData' && entry.name === 'Send') {
      array.push(entry.value)
    }
  })
  return Buffer.concat(array)
}

messenger.list = function (conf, publicKey, options) {
  const server = resolve.network(conf)
  const callBuilder = server.transactions().forAccount(publicKey)
  return loopCall(callBuilder, options)
}

messenger.find = async function (conf, publicKey, func) {
  const records = await messenger.list(conf, publicKey, { limit: 1, filter: func })
  return records[0] || undefined
}
