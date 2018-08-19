/**
 * @exports multisig
 */
const multisig = exports

const Buffer = require('./buffer')
const shareSignatures = require('./share-signatures')
const resolve = require('./resolve')

multisig.isEnabled = async function (conf, user) {
  conf.multisig = await multisig.config(conf, user)
  return !!conf.multisig
}

multisig.config = async function (conf, user) {
  const account = await getAccount(conf, user)
  conf.multisig = parseMultisigConfig(account)

  if (conf.multisig.id) return conf.multisig
  else return null
}

multisig.enable = async function (conf, keypair, options) {
  const account = await getAccount(conf, keypair)
  conf.multisig = parseMultisigConfig(account)

  if (conf.multisig.id) {
    console.log('On-chain signature sharing is already enabled on this account.')
    return null
  }

  const transaction = makeSetupTx(conf, account, options)
  return sendOrReturn(conf, transaction, keypair)
}

multisig.setup = async function (conf, keypair, options) {
  const account = await getAccount(conf, keypair)
  conf.multisig = parseMultisigConfig(account)

  if (!conf.multisig.id) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  const transaction = makeSetupTx(conf, account, options)
  return sendOrReturn(conf, transaction, keypair)
}

multisig.disable = async function (conf, keypair) {
  const account = await getAccount(conf, keypair)
  conf.multisig = parseMultisigConfig(account)

  if (!conf.multisig.id) {
    console.log('On-chain signature sharing is already disabled on this account.')
    return null
  }

  const transaction = makeDisableTx(conf, account)
  return sendOrReturn(conf, transaction, keypair)
}

/**
 *
 * @parameter {Transaction|XDR} transaction A signed transaction
 * @parameter {Keypair} [keypair]
 * @returns {Transaction|HorizonResponse}
 */
multisig.pushSignatures = async function (conf, transaction, keypair) {
  const account = await resolve.account(conf, transaction.source)
  conf.multisig = parseMultisigConfig(account)

  if (!conf.multisig.id) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  saveNetwork()
  const accountId = keypair.publicKey()
  const pushTx = await shareSignatures.makePushTx(conf, transaction, accountId)
  const horizonResponse = sendOrReturn(conf.multisig, pushTx, keypair)
  horizonResponse.finally(restoreNetwork)
  return horizonResponse
}

multisig.pullSignatures = async function (conf, transaction) {
  const account = await getAccount(conf, transaction.source)
  conf.multisig = parseMultisigConfig(account)

  if (!conf.multisig.id) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  saveNetwork()
  const bool = await shareSignatures.pull(conf, transaction)
  restoreNetwork()
  return bool
}

multisig.useNetwork = function (conf, network, server) {
  return resolve.network(conf.__proto__, network, server)
}

/** ***************************** Routines *************************************/

/**
 * Returns the transaction that enable signature sharing for `account`.
 */
function makeSetupTx (conf, account, options = {}) {
  const multisigId = options.id || conf.multisig.id || StellarSdk.Keypair.random().publicKey()
  const txBuilder = new StellarSdk.TransactionBuilder(account)
  txBuilder.addMemo(new StellarSdk.Memo('text', 'Setup signature sharing'))

  let isEmpty = true
  const setData = function (name, value) {
    txBuilder.addOperation(StellarSdk.Operation.manageData({ name: name, value: value }))
    isEmpty = false
  }

  if (multisigId !== conf.multisig.id) setData('config:multisig', multisigId)

  if (!options.network) options.network = 'test'
  if ((options.network || conf.multisig.network) &&
    options.network !== conf.multisig.network
  ) {
    setData('config:multisig:network', options.network)
  }

  if ((options.server || conf.multisig.server) &&
    options.server !== conf.multisig.server) {
    setData('config:multisig:server', options.server)
  }

  if (isEmpty) return null
  else return txBuilder.build()
}

/**
 * Returns the transaction that disable signature sharing for `account`.
 */
function makeDisableTx (conf, account) {
  const txBuilder = new StellarSdk.TransactionBuilder(account)
  txBuilder.addMemo(new StellarSdk.Memo('text', 'Disable signature sharing'))

  const setData = function (name, value) {
    txBuilder.addOperation(StellarSdk.Operation.manageData({ name: name, value: value }))
  }

  setData('config:multisig', null)
  if (account.data_attr['multisig:network']) {
    setData('config:multisig:network', null)
  }
  if (account.data_attr['multisig:server']) {
    setData('config:multisig:server', null)
  }

  return txBuilder.build()
}

/** ************************ Generic helpers ***********************************/

/**
 * Returns the multisig configuration.
 */
function parseMultisigConfig (account) {
  return {
    id: readAttr(account.data_attr['config:multisig']),
    network: readAttr(account.data_attr['config:multisig:network']) || 'test',
    server: readAttr(account.data_attr['config:multisig:server'])
  }
}
function readAttr (str64) {
  if (str64) return Buffer.from(str64, 'base64').toString('utf8')
}

/**
 * If `user` is already an AccountResponse, return it. Else resolve it.
 */
async function getAccount (conf, user) {
  if (isAccountResponse(user)) return user
  else if (user instanceof StellarSdk.Keypair) user = user.publicKey()
  else if (user instanceof StellarSdk.Account) user = user._accountId
  else if (typeof user !== 'string') throw new TypeError('Invalid user parameter.')

  const account = await resolve.account(conf, user)
  return account
}
function isAccountResponse (obj) {
  return obj && obj._baseAccount && obj._baseAccount instanceof StellarSdk.Account
}

/**
 * If `value` is a transaction, sign it with `keypair` and send it to horizon.
 * Else, return `value`.
 */
async function sendOrReturn (conf, value, keypair) {
  if (value instanceof StellarSdk.Transaction) {
    const server = resolve.network(conf)
    value.sign(keypair)
    const responsePromise = server.submitTransaction(value)
    responsePromise.catch(error => {
      console.error(error.response)
      console.log(value)
    })
    return responsePromise
  } else {
    return value
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
  if (StellarSdk.Network.current() !== networkBackup) {
    console.log('Restore network')
    StellarSdk.Network.use(networkBackup)
  }
}
