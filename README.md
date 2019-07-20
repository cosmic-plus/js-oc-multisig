# @cosmic-plus/oc-multisig

![Licence](https://img.shields.io/github/license/cosmic-plus/js-oc-multisig.svg)
[![Dependencies](https://david-dm.org/cosmic-plus/js-oc-multisig/status.svg)](https://david-dm.org/cosmic-plus/js-oc-multisig)
![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@cosmic-plus/oc-multisig.svg)
![Size](https://img.shields.io/bundlephobia/minzip/@cosmic-plus/oc-multisig.svg)
![Downloads](https://img.shields.io/npm/dt/@cosmic-plus/oc-multisig.svg)

**Stellar On-chain Multisignatures** is a JavaScript library that enable
storing/retrieving signatures and transactions on the Stellar blockchain.

Stellar blockchain offers on-chain advanced setups for multi-signature
accounts and smart-contracts. This is great because it makes it robust and
secure. However, signatures collection and transaction sharing is not part of
it.

Some smart-contracts and account security models may require that signature
collection happens on the public ledger. This library implements a way to do so.
By default, the signatures are stored on the test network. However, it is
possible to set it up to use public network or any custom network as well.

Once on-chain multisig is enabled on an account, it may be used for each
transaction whose this account is the primary source. All legit signers for
this transaction can send any legit signature they have.

This library also implement on-chain transaction sharing among the co-signers of
an account.

_Disclaimer:_ This library is made independently from the Stellar Foundation.

## Install

### NPM/Yarn

- NPM: `npm install @cosmic-plus/oc-multisig`
- Yarn: `yarn add @cosmic-plus/oc-multisig`

In your scripts: `const multisig = require('@cosmic-plus/oc-multisig')`

### Bower

`bower install cosmic-plus-oc-multisig`

In your HTML pages:

```HTML
<script src="./bower_components/stellar-sdk/stellar-sdk.min.js"></script>
<script src="./bower_components/cosmic-plus-oc-multisig/oc-multisig.js"></script>
```

### HTML

```HTML
<script src="https://cdn.cosmic.plus/stellar-sdk"></script>
<script src="https://cdn.cosmic.plus/oc-multisig@0.x"></script>
```

Note: For production release it is advised to serve your own copy of the libraries.

## Get started

### Enable on-chain signature collection on an account

```js
const response = await multisig.enable(keypair, ...options)

// The default collector network is testnet.
// To use public as collector network instead of testnet:
await multisig.enable(keypair, { network: "public" })

// To use a custom network instead:
await multisig.enable(keypair, {
  network: "network_passphrase",
  server: "horizon_url"
})
```

### Disable on-chain signature collection on an account

```js
const response = await multisig.disable(keypair)
```

### Test if oc-multisig is enabled

```js
const bool = await multisig.isEnabled(
  address | publicKey | keypair | AccountResponse
)
```

### Push signatures to the blockchain

This will look for unpublished signatures in `transaction` and send them to the
blockchain. Will throw an error if `keypair` is not a legit signer for
`transaction`.

```js
const response = await multisig.pushSignatures(transaction, keypair)
```

### Pull signatures from the blockchain

This will get signature found on the blockchain to `transaction`. Note that
only legit signatures shared by legit signers are fetch. The _Promise_ returned
by this method resolves to a _boolean_ that is `true` when new signatures were
fetched, `false` otherwise.

```js
const bool = await multisig.pullSignatures(transaction)
```

## Push transaction to the blockchain

This will send `transaction` to the blockchain, without its signatures. Note
that only legit co-signers can do so: this is not a way to send transaction
requests to arbitrary accounts. The _Promise_ returned by this method resolves
to the Horizon response, or to null if transaction have already been published.

```js
const response = await multisig.pushTransaction(transaction, keypair)
```

## Pull transactions from the blockchain

This will list all transaction shared for `address` since `ledger`
(not included, optional). Returns an Array of transaction request.

```js
const requestsArray = await multisig.listTransactions(address, [ledger])
```

Transaction requests are structured this way:

```
{
  sender: 'cosignersId',
  date: 'ISO-9660 date',
  ledger: 'transaction request ledger',
  xdr: 'requested transaction xdr',
}
```

Transactions request are listed from the newest to the latest and the ledger
value of the last one can be used as argument for next listing in order to get
only new requests.

## Account configuration

The account configuration is stored as account entries on the blockchain. In
the library, it is represented as an object:

```
{
  // The side-account ID were signatures are sent. By default this is randomly
  // chosen.
  id: G...,

  // The network on which the signatures are sent. It is test by default.
  // You can store signatures on a different network than the account you're using.
  network: test|public|passphrase,

  // The url of the horizon node to use. Stellar Foundation nodes are used by
  // default, in which case this value stay 'undefined'.
  server: https....
}
```

### Get account configuration

```js
const config = await multisig.config(
  address | publicKey | keypair | AccountResponse
)
```

### Change account configuration

```js
const response = await multisig.setup(keypair, { network: ..., server: ..., id: ...})
```

## Use a custom network

By default, oc-multisig use the same network than StellarSdk. It will use
Stellar Foundation horizon nodes ('https://horizon.stellar.org' and
'https://horizon-testnet.stellar.org') for public and test network. If your
account is on a custom network, or if you want to use a different horizon node,
you'll have to declare it:

```js
/// Will returns the server object for 'horizon_url'
const server = multisig.useNetwork(public | test | passphrase, horizon_url)
```

This method will switch to the declared network, so you don't need to use
StellarSdk.Network.use() on top of that.

## Additional resources

- [SEP-0011 proposal](https://github.com/stellar/stellar-protocol/pull/158) for which oc-multisig is the reference implementation
- [Brain-storm about on-chain signature collection](https://galactictalk.org/d/1436-on-chain-signature-collection)
- [SBC entry](https://galactictalk.org/d/1591-stellar-oc-multisig-on-chain-multi-signatures-collection-js-lib-protocol/3)

## That's all Folks !
