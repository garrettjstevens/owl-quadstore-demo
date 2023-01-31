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
  // const { items } = await store.get({}, { limit: 2 })
  // console.log(JSON.stringify(items, null, 2))

  // or, using SPARQL
  const engine = new Engine(store)

  // QUESTION: What are the valid child types of a 'gene' (SO:0000704)
  const bindingsStream = await engine.queryBindings(
    `
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX so: <http://purl.obolibrary.org/obo/so#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT *
    WHERE { ?s rdfs:subClassOf obo:SO_0000704 }
    
`,
  )
  bindingsStream.on('data', (binding) => {
    const o = binding.get('o')?.value
    const p = binding.get('p')?.value
    const s = binding.get('s')?.value
    console.log(`${s}\t${p}\t${o}`)
  })
}

main()
