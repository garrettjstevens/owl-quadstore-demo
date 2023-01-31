import fs from 'fs'
import { RdfXmlParser } from 'rdfxml-streaming-parser'
import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs'

const myParser = new RdfXmlParser()

async function getStore(): Promise<Store> {
  const store = new Store()
  return new Promise((resolve, reject) => {
    store
      .import(fs.createReadStream('./so-simple.owl').pipe(myParser))
      .on('error', reject)
      .on('end', async () => resolve(store))
  })
}

async function main() {
  const store = await getStore()
  const engine = new QueryEngine()

  // QUESTION: What are the valid child types of a 'gene' (SO:0000704)
  // List should contain gene_member_region (SO:0000831) and mRNA (SO:0000234)
  // Good resource: https://ontobee.org/tutorial/sparql
  // This query gets "member_of"s, and then traverses all "is_a"s of the child.
  // Takes ~3s for 384 results for "gene", ~2s of that is loading the data
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
      ?equivalent rdfs:label ?equivalent_label .
      ?equivalent rdfs:subClassOf+ ?child .
    }
`,
    { sources: [store] },
  )
  console.log('child\tlabel\tequivalent\tequivalent_label')
  // Can also convert to array with
  // const bindings = await bindingsStream.toArray()
  bindingsStream.on('data', (binding) => {
    const child = binding.get('child')?.value
    const label = binding.get('label')?.value
    const equivalent = binding.get('equivalent')?.value
    const equivalent_label = binding.get('equivalent_label')?.value
    console.log(`${child}\t${label}\t${equivalent}\t${equivalent_label}`)
  })
}

main()
