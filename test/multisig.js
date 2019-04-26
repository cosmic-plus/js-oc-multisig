const multisig = require("../src")
const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")

/// Please don't mess with those accounts ^^^(*.*)^^^.
const account1 = StellarSdk.Keypair.fromSecret(
  "SDTSZAHJXKHE5PR6WAPAZ7BH3GMOYYDTQ5Z2RJHGWSYCOM45FWFKTJSU"
)
const account2 = StellarSdk.Keypair.fromSecret(
  "SB7XOHXPZ6MM4MMORBAO2HEODX3QC6FF6CID4RIUF25GRZNDWLJROK2A"
)
// Testnet transactions
const transaction1 = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAAAZACciIb/////AAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
)
const transaction1_signed = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAAAZACciIb/////AAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqK/AmQAAABAW2CFIqrm01y0ILx7o2efJaHxQlkzXTdA5I/uBSpryzGq0m6zJvLIq7AP4tdUSe1PrV+YcbT56KFEnYtGnGoRBCI3ON8AAABAOxSM2T6pHZyQHI+IQcXqLGjURX9xkcuFYWm5BiTeew4QvZ2yHivXuAqDaEUyKLlTpeDY34zkAaUsuWBxlJ3wAw=="
)
const transaction2 = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAABLACciIcAAAAFAAAAAAAAAAAAAAADAAAAAAAAAAoAAAAIbWlncmF0ZWQAAAABAAAABHRydWUAAAABAAAAAOUXePrDPMF7LvqdF6bynRgWT2T7M+8ItWsoCiym8bTnAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAADWFueXdhbGxldC5vcmcAAAAAAAAAAAAAAQAAAADIO+8+5cOTQ/rMGnAYYwurhsNKlWHwSd1sBvPGor8CZAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
)
const transaction2_signed = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAABLACciIcAAAAFAAAAAAAAAAAAAAADAAAAAAAAAAoAAAAIbWlncmF0ZWQAAAABAAAABHRydWUAAAABAAAAAOUXePrDPMF7LvqdF6bynRgWT2T7M+8ItWsoCiym8bTnAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAADWFueXdhbGxldC5vcmcAAAAAAAAAAAAAAQAAAADIO+8+5cOTQ/rMGnAYYwurhsNKlWHwSd1sBvPGor8CZAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiI3ON8AAABANl57OfeUcF9WIyqBQAGdDjF5Jj+qlnRvDqOIeZPDQXrm8rDyBKJWnH9LZYmr7zDP3Atdo7eCr/LWL3N04Y6eBKK/AmQAAABArvzmhWe5Y924Dfyb4BpfZw4CTUKukilDdX43QOFenq/CU/zMQV7sIuanUQNi7vFMRSkQNZ4r/+mNeW6e6rr6BA=="
)
// Publicnet transactions
const transaction3 = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAAAZAEmmfQAAAAUAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
)
const transaction3_signed = new StellarSdk.Transaction(
  "AAAAAMg77z7lw5ND+swacBhjC6uGw0qVYfBJ3WwG88aivwJkAAAAZAEmmfQAAAAUAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaK/AmQAAABA7qf0vlz/1mBI37uBGkepCe99e5dIFucjXHIKlWxQsmVo/+7xwTpAylQn0+bsca83XnG/G2IyLNy4KW5sTEPdAQ=="
)

async function test () {
  console.log("=========== Test Network ===========")
  console.log("")
  multisig.useNetwork("test")
  await report("multisig.isEnabled(account1)")
  await report("multisig.isEnabled(account2)")
  await report("multisig.enable(account1)")
  await report("multisig.enable(account2)")
  await report(
    "multisig.setup(account1, { id: StellarSdk.Keypair.random().publicKey() })"
  )
  await report("multisig.setup(account2, { network: \"public\" })")
  await report("multisig.config(account1)")
  await report("multisig.config(account2)")
  await report("multisig.pushTransaction(transaction1_signed, account1)")
  await report("multisig.pushTransaction(transaction2_signed, account1)")
  await report("multisig.listTransactions(account1)")
  await report("multisig.pushSignatures(transaction1_signed, account1)")
  await report("multisig.pushSignatures(transaction2_signed, account1)")
  await report("multisig.pullSignatures(transaction1)")
  await report("multisig.pullSignatures(transaction2)")
  await report("multisig.disable(account2)")

  console.log("")
  console.log("=========== Public Network ===========")
  console.log("")
  multisig.useNetwork("public")
  await report("multisig.isEnabled(account1)")
  await report("multisig.enable(account1)")
  await report("multisig.config(account1)")
  await report("multisig.pushTransaction(transaction3_signed, account1)")
  await report("multisig.listTransactions(account1)")
  await report("multisig.pushSignatures(transaction3_signed, account1)")
  await report("multisig.pullSignatures(transaction3)")
  await report("multisig.disable(account1)")
}
test()

async function report (command) {
  console.log(command)
  console.log("==============================")
  const promise = eval(command)
  await promise.then(console.log).catch(console.error)
  console.log("")
}
