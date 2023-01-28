const fs = require('fs')
const { RdfXmlParser } = require('rdfxml-streaming-parser')
const { MemoryLevel } = require('memory-level')
const { DataFactory } = require('rdf-data-factory')
const { Quadstore } = require('quadstore')
const { Engine } = require('quadstore-comunica')

const myParser = new RdfXmlParser()
const backend = new MemoryLevel()
const df = new DataFactory()

async function getStore() {
  const store = new Quadstore({ backend, dataFactory: df })
  await store.open()
  return new Promise((resolve, reject) => {
    store
      .import(fs.createReadStream('./so-simple.owl').pipe(myParser))
      .on('error', reject)
      .on('end', async () => resolve(store))
  })
}

async function main() {
  const store = await getStore()
  const { items } = await store.get({}, { limit: 2 })
  console.log(JSON.stringify(items, null, 2))

  // or, using SPARQL
  const engine = new Engine(store)
  const bindingsStream = await engine.queryBindings(
  `
  SELECT * {?s ?p ?o} LIMIT 2
  `)
  bindingsStream.on('data', binding => {
    console.log(JSON.stringify(binding, null, 2))
  });
}

main()
