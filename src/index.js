/**
 * Environment detection and library loading.
 */

const isBrowser = new Function('try { return this === window } catch (e) { return false }')
const isNode = new Function('try { return this === global } catch (e) { return false }')

if (isBrowser()) {
  if (typeof StellarSdk === 'undefined') {
    throw new Error('stellar-ledger-wallet depends on StellarSdk.')
  }
} else if (isNode()) {
  /// Prevent StellarSdk to be bundled by any bundler.
  const stealth_require = eval('require')
  global.StellarSdk = stealth_require('stellar-sdk')
}

/**
 * Automatically pass library network configuration to underlying methods.
 */

// baseConf may be modified only by multisig.useNetwork().
const baseConf = {}

function prepare (module) {
  const layer = {}
  for (let name in module) {
    if (typeof module[name] !== 'function') continue
    layer[name] = passConfig(module[name])
  }

  return Object.assign({}, module, layer)
}

function passConfig (func) {
  return function (...params) {
    // Make a one-time configuration object and pass it to the underlying
    // function along with user parameters.
    const conf = Object.create(baseConf)
    return func(conf, ...params)
  }
}

module.exports = prepare(require('./multisig'))
