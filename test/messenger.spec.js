/* global describe it expect beforeAll jasmine */
"use strict"

const StellarSdk = require("stellar-sdk")
const { friendbot } = require("@cosmic-plus/base")

const messenger = require("../src/messenger")

const { any } = jasmine

/* Setup */

StellarSdk.Network.useTestNetwork()

const conf = { network: "test" }

const sender = StellarSdk.Keypair.random()
const mailbox = StellarSdk.Keypair.random().publicKey()

const object = "Les enfants qui s'aiment"
const poem = `Les enfants qui s'aiment s'embrassent debout
Contre les portes de la nuit
Et les passants qui passent les désignent du doigt
Mais les enfants qui s'aiment
Ne sont là pour personne
Et c'est seulement leur ombre
Qui tremble dans la nuit
Excitant la rage des passants
Leur rage, leur mépris, leurs rires et leur envie
Les enfants qui s'aiment ne sont là pour personne
Ils sont ailleurs bien plus loin que la nuit
Bien plus haut que le jour
Dans l'éblouissante clarté de leur premier amour

-- Jacques Prévert`

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
jasmine.currentEnv_.configure({ random: false })

/* Specifications */

describe("messenger", () => {
  beforeAll(async () => {
    await friendbot(sender.publicKey())
    await friendbot(mailbox)
  })

  it("sends data over Stellar", async () => {
    const response = await messenger.send(conf, sender, mailbox, object, poem)
    expect(response.ledger).toEqual(any(Number))
  })

  it("lists received messages", async () => {
    const records = await messenger.list(conf, mailbox, { limit: 10 })
    expect(records).toEqual(any(Array))
    expect(records.length).toBe(1)
    expect(records[0].sender).toBe(sender.publicKey())
    expect(records[0].date).toEqual(any(String))
  })

  it("retrieves message content", async () => {
    const records = await messenger.list(conf, mailbox, { order: "desc" })
    expect(records[0].object).toBe(object)
    expect(records[0].content.toString()).toBe(poem)
  })
})
