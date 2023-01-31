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
  // List should contain gene_member_region (SO:0000831) and mRNA (SO:0000234)
  // So far we are getting gene_member_region, still need to traverse is_a to
  // get to mRNA
  // Good resource: https://ontobee.org/tutorial/sparql
  const bindingsStream = await engine.queryBindings(
    `
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX so: <http://purl.obolibrary.org/obo/so#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT *
    WHERE {
      ?child rdfs:label ?label .
      ?child rdfs:subClassOf ?restriction .
      ?restriction rdf:type owl:Restriction .
      ?restriction owl:onProperty so:member_of .
      ?restriction owl:someValuesFrom obo:SO_0000704 .
    }
`,
  )
  console.log('child\tlabel')
  bindingsStream.on('data', (binding) => {
    const child = binding.get('child')?.value
    const label = binding.get('label')?.value
    console.log(`${child}\t${label}`)
  })
}

main()
