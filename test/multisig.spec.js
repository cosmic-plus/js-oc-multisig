/* global describe it expect beforeAll jasmine */
"use strict"

const StellarSdk = require("stellar-sdk")
const { friendbot } = require("@cosmic-plus/base")
const cosmicLib = require("cosmic-lib")
const { CosmicLink } = cosmicLib

const multisig = require("../src")

const { any } = jasmine

/* Setup */

StellarSdk.Network.useTestNetwork()
cosmicLib.config.network = "test"

const signer1 = StellarSdk.Keypair.random()
const signer2 = StellarSdk.Keypair.random()
const temoin = StellarSdk.Keypair.random()

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000
jasmine.currentEnv_.configure({ random: false })

/* Specifications */

describe("oc-multisig", () => {
  const txs = {}

  beforeAll(async () => {
    await friendbot(signer1.publicKey())
    await friendbot(temoin.publicKey())

    txs.A = await makeTx(signer1.publicKey())
  })

  it("can be enabled", async () => {
    const response = await multisig.enable(signer1)
    expect(response.ledger).toEqual(any(Number))
    await addSigner(signer1, signer2)
  })

  it("tests whether enabled", async () => {
    expect(await multisig.isEnabled(signer1)).toBe(true)
    expect(await multisig.isEnabled(temoin)).toBe(false)
  })

  it("stores its setup on-chain", async () => {
    const setup = { id: temoin.publicKey(), network: "test" }
    const tx = await multisig.setup(signer1.publicKey(), setup)

    const txReq = new CosmicLink(tx)
    await txReq.lock()
    txReq.sign(signer1, signer2)

    const response = await txReq.send()
    expect(response.ledger).toEqual(any(Number))
  })

  it("retrieves its setup", async () => {
    const setupA = await multisig.config(signer1)
    expect(setupA.id).toBe(temoin.publicKey())
    expect(setupA.network).toBe("test")
    expect(setupA.server).toBe(undefined)
    const setupB = await multisig.config(temoin)
    expect(setupB).toBe(null)
  })

  it("pushes a transaction", async () => {
    const response = await multisig.pushTransaction(txs.A, signer2)
    expect(response.ledger).toEqual(any(Number))
  })

  it("doesn't push a transaction twice", async () => {
    const response = await multisig.pushTransaction(txs.A, signer2)
    expect(response).toBe(null)
  })

  it("lists pushed transactions", async () => {
    const records = await multisig.listTransactions(signer1)
    expect(records.length).toBe(1)
    expect(records[0].sender).toBe(signer2.publicKey())
    expect(records[0].date).toEqual(any(String))
    expect(records[0].ledger).toEqual(any(Number))
    expect(records[0].xdr).toBe(txs.A.toXDR())
  })

  it("pushes a signature", async () => {
    txs.A.sign(signer2)
    const response = await multisig.pushSignatures(txs.A, signer2)
    expect(response.ledger).toEqual(any(Number))
  })

  it("doesn't push a signature twice", async () => {
    const response = await multisig.pushSignatures(txs.A, signer2)
    expect(response).toBe(null)
  })

  it("pulls a signature", async () => {
    const unsigned = Object.create(txs.A)
    unsigned.signatures = []
    const response = await multisig.pullSignatures(unsigned)
    expect(response).toBe(true)
    expect(unsigned.toXDR()).toBe(txs.A.toXDR())
  })

  it("can be disabled", async () => {
    const tx = await multisig.disable(signer1.publicKey())

    const txReq = new CosmicLink(tx)
    await txReq.lock()
    txReq.sign(signer1, signer2)

    const response = await txReq.send()
    expect(response.ledger).toEqual(any(Number))
    expect(await multisig.config(signer1)).toBe(null)
    expect(await multisig.isEnabled(signer1)).toBe(false)
  })
})

/* Helpers */

async function makeTx (source) {
  const txReq = new CosmicLink({ source }).addOperation("setOptions")
  await txReq.lock()
  return txReq.transaction
}

async function addSigner (accountA, accountB) {
  const txReq = new CosmicLink({ source: accountA.publicKey() }).addOperation(
    "setOptions",
    {
      lowThreshold: 2,
      medThreshold: 2,
      highThreshold: 2,
      signer: { type: "key", weight: 1, value: accountB.publicKey() }
    }
  )
  await txReq.lock()
  txReq.sign(accountA)
  return await txReq.send()
}
