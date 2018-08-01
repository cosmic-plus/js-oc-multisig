/**
 * Publish/read arbitrary data on the blockchain
 *
 * @private
 * @exports messenger
 */
const messenger = exports

const Buffer = require('./buffer')
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
messenger.sendTx = function (sender, destination, memo, message) {
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
  if (typeof destination !== 'array') destination = [ destination ]
  destination.forEach(entry => {
    txBuilder.addOperation(StellarSdk.Operation.payment({
      destination: entry,
      asset: StellarSdk.Asset.native(),
      amount: '0.0000001'
    }))
  })

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
  resolve.network(conf)
  const caller = conf.server.transactions()
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

messenger.list = function (conf, publicKey, limit) {
  resolve.network(conf)
  const caller = conf.server.transactions().forAccount(publicKey).limit(200)
  return _listPromiseLoop(caller.call(), limit)
}

async function _listPromiseLoop (answerPromise, limit, array) {
  if (!array) array = []
  const answer = await answerPromise

  if (answer.records.length === 0) return array
  if (limit && array.length + answer.records.length > limit) {
    return array.concat(answer.records.slice(0, limit - array.length))
  }
  array = array.concat(answer.records)
  return _listPromiseLoop(answer.next(), limit, array)
}

messenger.find = function (conf, publicKey, func) {
  return messenger.filter(conf, publicKey, func, 1)
}

messenger.filter = function (conf, publicKey, func, limit) {
  resolve.network(conf)
  const caller = conf.server.transactions().forAccount(publicKey).limit(200)
  return _filterPromiseLoop(caller.call(), func, limit)
}

async function _filterPromiseLoop (answerPromise, func, limit, array) {
  if (!array) array = []
  const answer = await answerPromise
  if (answer.records.length === 0) return array
  for (let index in answer.records) {
    const tx = answer.records[index]
    if (func(tx)) array.push(tx)
    if (array.length === limit) return array
  }
  /// Recursive solution :/
  return _filterPromiseLoop(answer.next(), func, limit, array)
}
