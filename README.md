# js-stellar-oc-multisig

**Stellar On-chain Multisignatures** is a JavaScript library that enable
storing/retrieving signatures on the Stellar blockchain.

Stellar blockchain offers on-chain advanced setups for multi-signature
accounts and smart-contracts. This is great because it makes it robust and
secure. However, the signatures collection is not part of it.

Some smart-contracts and account security models may require that signature 
collection happens on the public ledger. This library implements a way to do so.
By default, the signatures are stored on the test network. However, it is
possible to set it up to use public network or any custom network as well.

Once on-chain signature collection is enabled on an account, it may be used each
from each transaction whose this account is the source. All legit signers for
this transaction can send any legit signature they have.

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

If oc-multisig gets the greenlight the beta release will be announced
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

### Enable on-chain signature collection on an account

```js
multisig.enable(keypair, ...options)
  .then(function(response) { // Horizon response or null if already enabled
    console.log('On-chain signature collection is enabled!')
  }).catch(console.error)

// To collect signatures on testnet:
multisig.enable(keypair)

// To collect signatures on publicnet:
multisig.enable(keypair, { network: 'public' })

// To collect signatures on a custom network:
multisig.enable(keypair, { network: 'network_passphrase', server: 'horizon_url' })
```


### Disable on-chain signature collection on an account

```js
multisig.disable(keypair)
  .then(function(response) { /// Horizon response or null if already disabled
    console.log('On-chain signature collection disabled!')
  }).catch(console.error)
```

### Test if oc-multisig is enabled

```js
multisig.isEnabled(address|publicKey|keypair|AccountResponse)
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

### Pull signatures from the blockchain

This will get signature found on the blockchain to `transaction`. Note that 
only legit signatures shared by legit signers are fetch. The *Promise* returned 
by this method resolves to a *boolean* that is `true` when new signatures were 
fetched, `false` otherwise.

```js
multisig.pullSignatures(transaction)
  .then(function (response) {
    if (response) console.log('New signature(s) have been added.')
    else console.log('No new signature to download.')
  }).catch(console.error)
```

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
multisig.config(address|publicKey|keypair|AccountResponse)
  .then(function(obj) {
    console.log(obj)
  }).catch(console.error)
```

### Change account configuration

```js
multisig.setup(keypair, { network: ..., server: ..., id: ...})
  .then(function (response) { /// Horizon response or null if no change was needed.
    if (response) console.log('On-chain signature collection setup updated!')
    else console.log('Nothing to change.')
  }).catch(console.error)
```

## Use a custom network

By default, oc-multisig use the same network than StellarSdk. It will use 
Stellar Foundation horizon nodes ('https://horizon.stellar.org' and 
'https://horizon-testnet.stellar.org') for public and test network. If your
account is on a custom network, or if you want to use a different horizon node, 
you'll have to declare it:

```js
/// Will returns the server object for 'horizon_url'
const server = multisig.useNetwork(public|test|passphrase, horizon_url)
```

This method will switch to the declared network, so you don't need to use 
StellarSdk.Network.use() on top of that.


## That's all Folks !
