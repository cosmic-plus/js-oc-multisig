/**
 * @exports multisig
 */
const multisig = exports

const Buffer = require('./buffer')
const resolve = require('./resolve')
const messenger = require('./messenger')

multisig.network = 'test'
multisig.server = 'https://horizon-testnet.stellar.org'

multisig.isEnabled = async function (conf, user) {
  if (await multisig.config(conf, user)) return true
  else return false
}

multisig.config = async function (conf, user) {
  const account = await getAccount(conf, user)
  const destination = multisigId(conf, account)
  if (destination) return { multisig: destination, network: conf.network }
  else return false
}

multisig.enable = async function (conf, user) {
  const account = await getAccount(conf, user)

  if (await multisig.config(conf, account)) {
    console.log('On-chain signature sharing is already enabled on this account.')
    return null
  } else {
    const transaction = enableTx(conf, account)
    return sendOrReturn(conf, transaction, user)
  }
}

multisig.disable = async function (conf, user) {
  const account = await getAccount(conf, user)

  if (!await multisig.config(conf, account)) {
    console.log('On-chain signature sharing is already disabled on this account.')
    return null
  } else {
    const transaction = disableTx(conf, account)
    return sendOrReturn(conf, transaction, user)
  }
}

/**
 *
 * @parameter {Transaction|XDR} transaction A signed transaction
 * @parameter {AccountResponse|Keypair} [user]
 * @returns {Transaction|HorizonResponse}
 */
multisig.pushSignatures = async function (conf, transaction, user) {
  user = user || transaction.source
  const account = await getAccount(conf, user)

  if (!await multisig.config(conf, account)) {
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
  const pusher = pushTx(conf, account, txHash, newSignatures)
  return sendOrReturn(conf, pusher, user)
}

function _onlyInFirst (array1, array2) {
  return array1.filter(x => !array2.find(y => x.toString() === y.toString()))
}

multisig.pullSignatures = async function (conf, transaction) {
  const account = await getAccount(conf, transaction.source)

  if (!await multisig.config(conf, account)) {
    throw new Error('On-chain signature sharing in not enabled on this account.')
  }

  const signers = await resolve.txSignersList(conf, transaction)
  const txHash = transaction.hash()
  const signatures = await getSignatures(conf, account, txHash, signers)
  return mergeSignatures(conf, transaction, signatures, txHash, signers)
}

/** ***************************** Routines *************************************/

/**
 * Returns the transaction that enable signature sharing for `account`
 */
function enableTx (conf, account) {
  const multisigId = StellarSdk.Keypair.random().publicKey()
  const txbuilder = new StellarSdk.TransactionBuilder(account)
  txbuilder.addMemo(new StellarSdk.Memo('text', 'Enable signature sharing'))
  txbuilder.addOperation(StellarSdk.Operation.manageData({
    name: 'config:multisig',
    value: multisigId
  }))
  txbuilder.addOperation(StellarSdk.Operation.createAccount({
    destination: multisigId,
    startingBalance: '1',
    asset: StellarSdk.Asset.native()
  }))
  return txbuilder.build()
}

/**
 * Returns the transaction that disable signature sharing for `account`.
 */
function disableTx (conf, account) {
  const txBuilder = new StellarSdk.TransactionBuilder(account)
  txBuilder.addMemo(new StellarSdk.Memo('text', 'Disable signature sharing'))
  txBuilder.addOperation(StellarSdk.Operation.manageData(
    { name: 'config:multisig', value: '' }
  ))
  return txBuilder.build()
}

/**
 * Returns the Transaction that send `signatures` for `txHash`.
 */
function pushTx (conf, sender, txHash, signatures) {
  const memo = new StellarSdk.Memo('return', txHash)
  const destination = multisigId(conf, sender)
  const message = Buffer.concat(signatures)

  return messenger.sendTx(sender, destination, memo, message)
}

/**
 * Returns an array of the signatures shared on-chain for `txHash`.
 */
async function getSignatures (conf, account, txHash, signers) {
  const shareId = multisigId(conf, account)
  const txHash64 = txHash.toString('base64')

  const records = await messenger.filter(conf, shareId,
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
 * Returns the multisig account ID for `account`.
 */
function multisigId (conf, account) {
  const publicKeyBase64 = account.data_attr['config:multisig']
  return publicKeyBase64 && Buffer.from(publicKeyBase64, 'base64').toString('utf8')
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
function sendOrReturn (conf, transaction, user) {
  if (user instanceof StellarSdk.Keypair && user.canSign()) {
    transaction.sign(user)
    return conf.server.submitTransaction(transaction)
  } else {
    return transaction
  }
}
