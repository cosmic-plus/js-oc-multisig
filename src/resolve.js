/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * Note: this is copied from js-cosmic-lib and I didn't cleaned it up yet
 *
 * @private
 * @exports resolve
 */
const resolve = exports

const helpers = require('./helpers')

/**
 * Select the network to be used by `StellarSdk` as being `c` current
 * network.
 *
 */
resolve.network = function (c, network = c.network, server = c.server) {
  switch (network) {
    case 'test':
      StellarSdk.Network.useTestNetwork()
      if (!server) server = testServer
      break
    case 'public':
      StellarSdk.Network.usePublicNetwork()
      if (!server) server = publicServer
      break
    default: throw new Error('Invalid network: ' + network)
  }

  if (server instanceof StellarSdk.Server) c.server = server
  else if (typeof server === 'string') c.server = new StellarSdk.Server(server)
  else throw new TypeError('Invalid server: ' + server)

  return c.server
}

const testServer = new StellarSdk.Server('https://horizon-testnet.stellar.org')
const publicServer = new StellarSdk.Server('https://horizon.stellar.org')

/**
 * Configure for how much time the resolved addresses are kept in cache,
 * in seconds. The default is set to 5 minutes to avoid resolving to an outdated
 * address.
 *
 * @const
 */
resolve.accountCacheExpiration = 5 * 60

/**
 * Contains promise of previously fetched accounts.
 *
 * @private
 * @type {Object}
 */
const accountCache = {}

/**
 * Cache `promise` resolving to `address`'s account for `accountCacheExpiration`
 * seconds.
 *
 * @private
 * @param {string} address
 * @param {Promise} promise
 */
async function cacheAccount (address, promise) {
  accountCache[address] = promise
  await helpers.timeout(resolve.accountCacheExpiration * 1000)
  delete accountCache[address]
}

/**
 * Return a promise that resolve to `address` account object, as defined in
 * JavaScript Stellar SDK API reference. `address` can be either a Stellar public
 * key or a federated address (account*example.org).
 * Returned results are cached and re-usable.
 *
 * @param {string} address
 * @return {Promise} Resolve to `address` account object
 */
resolve.address = function (c, address) {
  if (accountCache[address]) return accountCache[address]
  const promise = addressResolver(c, address)
  cacheAccount(address, promise)
  return promise
}

/**
 * Helper for the previous resolve.address function.
 * Resolve to an account object for `address`.
 *
 * @private
 * @param {string} address
 */
async function addressResolver (c, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    throw new Error('Invalid address: ' + helpers.shorter(address))
  }

  try {
    const account = await StellarSdk.FederationServer.resolve(address)
    const publicKey = account.account_id
    if (!publicKey) throw new Error('Empty account')
    if (!account.memo_type && account.memo !== undefined) delete account.memo
    if (address !== publicKey) account.address = address
    const alias = c.aliases && c.aliases[publicKey]
    if (alias) account.alias = alias
    return account
  } catch (error) {
    console.error(error)
    throw new Error("Can't resolve: " + helpers.shorter(address))
  }
}

/**
 * Return the AccountResponse object for `address` on `network`.
 *
 * @param {CL}
 * @param {string} address A public key or a federated address
 * @param {string} network Either 'test' or 'public'
 * @return {Object} The account response
 */
resolve.account = async function (c, address, network = c.network) {
  const server = resolve.network(c, network)
  const account = await resolve.address(c, address)
  const publicKey = account.account_id
  try {
    const accountResponse = await server.loadAccount(publicKey)
    return accountResponse
  } catch (error) {
    console.error(error)
    const short = helpers.shorter(address)
    throw new Error(`Empty account: ${short}`)
  }
}

resolve.transaction = async function (conf, txHash) {
  const caller = conf.server.transactions()
  return caller.transaction(txHash).call()
}

/**
 * Return the signers for the account at `address` on `network`.
 *
 * @param {CL}
 * @param {string} address Either a public key or a federated address
 * @param {string} network Either 'test' or 'public'
 * @return {Object} The signers object from the account response
 */
resolve.accountSigners = async function (c, address) {
  const account = await resolve.account(c, address)
  return account.signers
}

resolve.signersTable = async function (conf, ...addresses) {
  const obj = {}

  for (let index in addresses) {
    const account = await resolve.account(conf, addresses[index])
    if (!obj[account.id]) obj[account.id] = account.signers
  }

  return obj
}

resolve.signersList = async function (conf, ...addresses) {
  const array = []

  for (let index in addresses) {
    const account = await resolve.account(conf, addresses[index])
    account.signers.forEach(entry => {
      if (!array.find(a => a.key === entry.key)) array.push(entry.key)
    })
  }

  return array
}

resolve.txSources = function (conf, transaction) {
  const extra = useExtra(transaction)
  if (extra.sources) return extra.sources

  const array = [ transaction.source ]

  for (let index in transaction.operations) {
    const source = transaction.operations[index].source
    if (source && !array.find(a => a === source)) array.push(source)
  }

  extra.sources = array
  return array
}

resolve.txSignersList = async function (conf, transaction) {
  const extra = useExtra(transaction)
  if (!extra.signers) extra.signers = getTxSignersList(conf, transaction)
  return extra.signers
}

async function getTxSignersList (conf, transaction) {
  const sources = resolve.txSources(conf, transaction)
  return resolve.signersList(conf, ...sources)
}

const extraField = 'extra_ocmultisig'
function useExtra (obj) {
  if (!obj.extra) obj[extraField] = {}
  return obj[extraField]
}
