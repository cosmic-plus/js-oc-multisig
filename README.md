# js-stellar-oc-multisig

**Stellar On-chain Multisignatures** is a JavaScript library that enable
storing/retrieving signatures from the Stellar blockchain.

Stellar blockchain offers on-chain advanced setups for multi-signature
accounts and smart-contracts. This is great because it makes it robust and
secure. However, the signatures collection is not part of it and have to happens
off-chain.

Some smart-contracts and account security models may require that signature 
collection happens on the public ledger. This library implements a way to do so.

*Disclaimer:* This library is made independently from the Stellar Foundation.

## This is an alpha release

This initial release is a proof-of-concept to demonstrate how signatures can be 
stored on the blockchain. While the implemented features are supposed to work, 
it have not been sufficiently tested to ensure reliability. Please consider 
yourself as a tester and remember that the provided methods may be modified in
the future in compatibility-breaking ways.

The simple question of knowing if this developement is desirable at all is 
still [under 
discussion](https://galactictalk.org/d/1436-on-chain-signature-collection). 
Stellar Foundation may actually patch their software in a way that may prevent 
this library to work.

If oc-multisig gets the greenlight the beta release would be announced
on [Galactic Talk](https://galactictalk.com).

## Install

### NPM/Yarn

* `npm install stellar-oc-multisig`
* `yarn add stellar-oc-multisig`

```js
import multisig from 'stellar-oc-multisig'
// Or
const multisig = require('stellar-oc-multisig')
```

### Bower

`bower install stellar-oc-multisig`

In your HTML pages:

```HTML
  <body>
  ...
    <!-- Best placed at the end of body to not delay page loading -->
    <script src="./bower_components/stellar-sdk/stellar-sdk.min.js"></script>
    <script src="./bower_components/stellar-oc-multisig/multisig.js"></script>
  </body>
```

### HTML

```HTML
  <body>
  ...
    <!-- Best placed at the end of body to not delay page loading -->
    <script src="https://unpkg.com/stellar-sdk/dist/stellar-sdk.min.js"></script>
    <script src="https://raw.github.com/MisterTicot/web-stellar-oc-multisig/master/multisig.js"></script>
  </body>
```

Note: For production release it is advised to serve your own copy of the libraries.

## Get started

### Configuration

```js
/// Those are the default for the alpha release
multisig.network = 'test'
multisig.server = 'https://horizon-testnet.stellar.org'
```

### Enable on-chain signature collection on an account

```js
multisig.enable(keypair)
  .then(function(response) { console.log('On-chain signature collection enabled!')})
  .catch(console.error)
```

Note: You can also pass a *publicKey*, an *AccountResponse* or a federated address
to `multisig.enable`. In this case, the returned *Promise* will resolve to a
*Transaction* that enable on-chain signature collection for the given account.

### Disable on-chain signature collection on an account

```js
multisig.disable(keypair)
  .then(function(response) { console.log('On-chain signature collection disabled!')})
  .catch(console.error)
```

Note: You can also pass a *publicKey*, an *AccountResponse* or a federated address
to `multisig.disable`. In this case, the returned *Promise* will resolve to a
*Transaction* that disable on-chain signature collection for the given account.

### Get oc-multisig configuration

```js
multisig.config(address|publicKey|AccountResponse)
  .then(function(obj) {
    console.log(obj)
  }).catch(console.error)
```

### Test is oc-multisig is enabled

```js
multisig.isEnabled(address|publicKey|AccountResponse)
  .then(function (bool) {
    if (bool) console.log('On-chain signature collection is enabled.')
    else console.log('On-chain signature collection is disabled.')
  }).catch(console.error)
```

### Push signatures to the blockchain

This will look for unpublished signatures in `transaction` and send them to the
blockchain. Will throw an error if `keypair` is not a legit signer for
`transaction`.

```js
multisig.pushSignatures(transaction, keypair)
  .then(function (response) {
    if (response) console.log('New signature(s) have been shared.')
    else console.log('No new signature to share.')
  }).catch(console.error)
```

Note: You can also pass a *publicKey*, an *AccountResponse* or a federated 
address to `multisig.pushSignatures`. In that case, the returned *Promise* will 
resolve to a *Transaction* that sends the new signatures to the blockchain, or 
to `null` if there's no new signatures.

### Pull signatures from the blockchain

This will add any missing signature found on the blockchain to `transaction`.
Note that only legit signatures shared by legit signers are fetch. The *Promise*
returned by this method is a *boolean* that resolves to `true` when new
signatures were fetched, and to `false` otherwise.

```js
multisig.pullSignatures(transaction)
  .then(function (response) {
    if (response) console.log('New signature(s) have been added.')
    else console.log('No new signature to download.')
  }).catch(console.error)
```

## That's all Folks !
