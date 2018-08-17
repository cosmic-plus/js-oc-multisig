'use_strict'
global.StellarSdk = require('stellar-sdk')
const messenger = require('../src/messenger')

const server = new StellarSdk.Server('https://horizon.stellar.org')
const keypair = StellarSdk.Keypair.fromSecret('SC4KQPWJCJ7WXIIP3YYIDTKW4RUN3A7QOOZ67ECKGMSR2QUK2SLUMZI6')
const mailbox = 'GBE6YFKZMALWP455HFE4RMCHIOCHHXCYFV67OLQ6X2OWEVFAGR4XVCNC'
const conf = { network: 'test' }
const poem = `Immense et rouge
Au-dessus du Grand Palais
Le soleil d'hiver apparaît
Et disparaît
Comme lui mon coeur va disparaître
Et tout mon sang va s'en aller
S'en aller à ta recherche
Mon amour
Ma beauté
Et te trouver
Là où tu es.

-- Jacques Prévert`

async function test () {
  await report('messenger.send(conf, keypair, mailbox, "Immense et rouge", poem)')
  await report('messenger.list(conf, mailbox, { limit: 10})')
  const records = await messenger.list(conf, mailbox, { order: 'desc' })
  console.log(records[0].message.toString())
}
test()

async function report (command) {
  console.log(command)
  console.log('==============================')
  const promise = eval(command)
  await promise.then(console.log).catch(console.error)
  console.log('')
}
