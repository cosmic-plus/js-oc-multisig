/**
 * @exports multisig
 */
const multisig = exports

const Buffer = require('./buffer')
const resolve = require('./resolve')
const messenger = require('./messenger')
const axios = require('axios')

multisig.isEnabled = async function (conf, user) {
  const msConfig = await multisig.config(conf, user)
  return !!msConfig
}

multisig.config = async function (conf, user) {
  const account = await getAccount(conf, user)
  const msConfig = multisigConfig(conf, account)

  if (msConfig.id) return msConfig
  else return null
}

multisig.enable = async function (conf, keypair, options) {
  const account = await getAccount(conf, keypair)

  if (await multisig.isEnabled(conf, account)) {
    console.log('On-chain signature sharing is already enabled on this account.')
    return null
  } else {
    const transaction = setupTx(conf, account, options)
    return sendOrReturn(conf, transaction, keypair)
  }
}

multisig.setup = async function (conf, keypair, options) {
  const account = await getAccount(conf, keypair)

  if (!await multisig.isEnabled(conf, account)) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  } else {
    const transaction = setupTx(conf, account, options)
    return sendOrReturn(conf, transaction, keypair)
  }
}

multisig.disable = async function (conf, keypair) {
  const account = await getAccount(conf, keypair)

  if (!await multisig.isEnabled(conf, account)) {
    console.log('On-chain signature sharing is already disabled on this account.')
    return null
  } else {
    const transaction = disableTx(conf, account)
    return sendOrReturn(conf, transaction, keypair)
  }
}

/**
 *
 * @parameter {Transaction|XDR} transaction A signed transaction
 * @parameter {Keypair} [keypair]
 * @returns {Transaction|HorizonResponse}
 */
multisig.pushSignatures = async function (conf, transaction, keypair) {
  keypair = keypair || StellarSdk.Keypair.fromPublicKey(transaction.source)
  let account = await getAccount(conf, keypair)
  const msConfig = multisigConfig(conf, account)

  if (!msConfig.id) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  const txHash = transaction.hash()
  const signatures = transaction.signatures.map(entry => entry.signature())

  if (!transaction.signatures.length) return null

  /// Send only signatures that have not been uploaded yet.
  const signers = await resolve.txSignersList(conf, transaction)
  const alreadyOnchain = await getSignatures(conf, account, txHash, signers)
  const newSignatures = _onlyInFirst(signatures, alreadyOnchain)

  if (!newSignatures.length) return null
  if (!keypair.canSign()) return newSignatures

  /// Make and send the transaction with signatures.
  saveNetwork()

  if (conf.network !== msConfig.network) {
    const promise = _getOrCreateAccount(msConfig, keypair)
    promise.catch(restoreNetwork)
    account = await promise
  }

  const pusher = await pushTx(msConfig, account, txHash, newSignatures)
  const response = sendOrReturn(msConfig, pusher, keypair)
  response.finally(restoreNetwork)

  return response
}

function _onlyInFirst (array1, array2) {
  return array1.filter(x => !array2.find(y => x.toString() === y.toString()))
}

async function _getOrCreateAccount (conf, keypair) {
  const accountId = keypair.publicKey()
  if (await resolve.accountIsEmpty(conf, accountId)) {
    if (StellarSdk.Network.current() === StellarSdk.Networks.TESTNET) {
      await axios('https://friendbot.stellar.org/?addr=' + accountId)
    } else {
      throw new Error("Account doesn't exist on the requested network: " + conf.network)
    }
  }
  return resolve.account(conf, accountId)
}

multisig.pullSignatures = async function (conf, transaction) {
  const account = await getAccount(conf, transaction.source)

  if (!await multisig.isEnabled(conf, account)) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  const signers = await resolve.txSignersList(conf, transaction)
  const txHash = transaction.hash()
  const signatures = await getSignatures(conf, account, txHash, signers)
  return mergeSignatures(conf, transaction, signatures, txHash, signers)
}

multisig.useNetwork = function (conf, network, server) {
  return resolve.network(conf, network, server)
}

/** ***************************** Routines *************************************/

/**
 * Returns the transaction that enable signature sharing for `account`
 */
function setupTx (conf, account, options = {}) {
  const msConfig = multisigConfig(conf, account)
  const multisigId = options.id || msConfig.id ||
    StellarSdk.Keypair.random().publicKey()

  const txBuilder = new StellarSdk.TransactionBuilder(account)
  txBuilder.addMemo(new StellarSdk.Memo('text', 'Setup signature sharing'))

  let isEmpty = true
  const setData = function (name, value) {
    txBuilder.addOperation(StellarSdk.Operation.manageData({ name: name, value: value }))
    isEmpty = false
  }

  if (multisigId !== msConfig.id) setData('config:multisig', multisigId)

  if (!options.network) options.network = 'test'
  if ((options.network || msConfig.network) && options.network !== msConfig.network) {
    setData('config:multisig:network', options.network)
  }

  if ((options.server || msConfig.server) && options.server !== msConfig.server) {
    setData('config:multisig:server', options.server)
  }

  if (isEmpty) return null
  else return txBuilder.build()
}

/**
 * Returns then transaction that disable signature sharing for `account`.
 */
function disableTx (conf, account) {
  const msConfig = multisigConfig(conf, account)

  const txBuilder = new StellarSdk.TransactionBuilder(account)
  txBuilder.addMemo(new StellarSdk.Memo('text', 'Disable signature sharing'))

  const setData = function (name, value) {
    txBuilder.addOperation(StellarSdk.Operation.manageData({ name: name, value: value }))
  }

  setData('config:multisig', null)
  if (msConfig.networ && msConfig.network !== 'test') {
    setData('config:multisig:network', null)
  }
  if (msConfig.server) {
    setData('config:multisig:server', null)
  }

  return txBuilder.build()
}

/**
 * Returns the Transaction that send `signatures` for `txHash`.
 *
 * @async
 */
function pushTx (msConfig, sender, txHash, signatures) {
  const memo = new StellarSdk.Memo('return', txHash)
  const message = Buffer.concat(signatures)
  return messenger.sendTx(msConfig, sender, msConfig.id, memo, message)
}

/**
 * Returns an array of the signatures shared on-chain for `txHash`.
 */
async function getSignatures (conf, account, txHash, signers) {
  const msConfig = multisigConfig(conf, account)
  const txHash64 = txHash.toString('base64')

  saveNetwork()
  if (await resolve.accountIsEmpty(msConfig, msConfig.id)) {
    restoreNetwork()
    return []
  }

  const records = await messenger.filter(msConfig, msConfig.id,
    tx => tx.memo_type === 'return' && tx.memo === txHash64)

  const array = []
  for (let index in records) {
    const entry = records[index]
    const transaction = new StellarSdk.Transaction(entry.envelope_xdr)
    if (!signers.find(x => x === transaction.source)) continue
    transaction.operations.forEach(operation => {
      if (operation.type === 'manageData' && operation.name === 'Send') {
        array.push(operation.value)
      }
    })
  }

  restoreNetwork()
  return array
}

function mergeSignatures (conf, transaction, signatures, txHash, signers) {
  let newSignatures = false
  const txSigs = transaction.signatures.map(x => x.signature().toString())
  const keys = signers.map(x => StellarSdk.Keypair.fromPublicKey(x))

  for (let index in signatures) {
    const signature = signatures[index]
    if (txSigs.find(x => x === signature.toString())) continue
    const signer = keys.find(x => x.verify(txHash, signature))
    if (!signer) continue
    transaction.signatures.push(_makeDecorated(signer, signature))
    txSigs.push(signature.toString())
    newSignatures = true
  }

  return newSignatures
}
function _makeDecorated (signer, signature) {
  const Constructor = StellarSdk.xdr.DecoratedSignature
  return new Constructor({ hint: signer.signatureHint(), signature: signature })
}

/** ************************ Generic helpers ***********************************/

/**
 * Returns the multisig account ID for `account` (an AccountResponse).
 */
function multisigConfig (conf, account) {
  return {
    id: _readAttr(account.data_attr['config:multisig']),
    network: _readAttr(account.data_attr['config:multisig:network']) || 'test',
    server: _readAttr(account.data_attr['config:multisig:server'])
  }
}
function _readAttr (str64) {
  if (!str64) return undefined
  else return Buffer.from(str64, 'base64').toString('utf8')
}

/**
 * If `user` is already an AccountResponse, return it. Else resolve it.
 */
async function getAccount (conf, user) {
  if (_isAccountResponse(user)) return user
  else if (user instanceof StellarSdk.Keypair) user = user.publicKey()
  else if (user instanceof StellarSdk.Account) user = user._accountId
  else if (typeof user !== 'string') throw new TypeError('Invalid user parameter.')

  const account = await resolve.account(conf, user)
  return account
}
function _isAccountResponse (obj) {
  return obj && obj._baseAccount && obj._baseAccount instanceof StellarSdk.Account
}

/**
 * Sign and send transaction if `user` is a Keypair that can sign, else return
 * transaction.
 */
async function sendOrReturn (conf, transaction, user) {
  if (transaction instanceof StellarSdk.Transaction &&
    user instanceof StellarSdk.Keypair &&
    user.canSign()
  ) {
    const server = resolve.network(conf)
    transaction.sign(user)
    return server.submitTransaction(transaction)
      .catch(err => {
        console.error(err.response)
        console.log(transaction)
      })
  } else {
    return transaction
  }
}

/**
 * Save/Restore Network
 */
let networkBackup

function saveNetwork () {
  networkBackup = StellarSdk.Network.current()
}

function restoreNetwork () {
  console.log('Restore network')
  StellarSdk.Network.use(networkBackup)
}
