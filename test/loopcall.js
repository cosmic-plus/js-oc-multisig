'use_strict'
const StellarSdk = require('stellar-sdk')
const loopcall = require('../src/loopcall')

const server = new StellarSdk.Server('https://horizon.stellar.org')
const account = 'GAWO2C52D57XBT7SQL6YB3XPHFLFD2J4Z5RN7HPFZSHXJMXH72HRXNV3'

const callBuilder1 = server.transactions().forAccount(account)
const txHaveMemo = (tx) => tx.memo
const lumenaut = 'GCCD6AJOYZCUAQLX32ZJF2MKFFAUJ53PVCFQI3RHWKL3V47QYE2BNAUT'
const txIsFromLumenaut = (tx) => tx.source_account === lumenaut
const txIsFromMay2018 = (tx) => tx.created_at.substr(0,7) === '2018-05'
const txIsFromBefore2018 = (tx) => +tx.created_at.substr(0,4) < 2018

const callBuilder2 = server.operations().order('desc')
const opIsPayment = (op) => op.type === 'payment'

async function test () {
  await report('loopcall(callBuilder1)')
  await report('loopcall(callBuilder1, { filter: txHaveMemo })')
  await report('loopcall(callBuilder1, { filter: txIsFromLumenaut })')
  await report('loopcall(callBuilder1, { filter: txIsFromMay2018 })')
  await report('loopcall(callBuilder1, { breaker: txIsFromBefore2018 })')
  
  await report('loopcall(callBuilder2, { limit: 2000 })')
  await report('loopcall(callBuilder2, { limit: 50, filter: opIsPayment })')
}
test()

async function report (command) {
  console.log(command)
  console.log('==============================')
  const promise = eval(command)
  await promise.then(console.log).catch(console.error)
  console.log('')
}

