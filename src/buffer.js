/// Get Buffer constructor from StellarSdk to avoid additional dependencies.

const hash = '0000000000000000000000000000000000000000000000000000000000000000'
const memo = new StellarSdk.Memo('hash', hash)
module.exports = memo.value.__proto__.constructor
