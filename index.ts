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
      .on('end', () => resolve(store))
  })
}

async function main() {
  const store = await getStore()
  const engine = new QueryEngine()

  // QUESTION: What are the valid child types of a 'gene' (SO:0000704)
  // List should contain gene_member_region (SO:0000831) and mRNA (SO:0000234)
  // Good resource: https://ontobee.org/tutorial/sparql
  // This query gets "member_of"s, and then traverses all "is_a"s of the child.
  // Takes ~15s for 415 results for "gene", ~2s of that is loading the data
  const bindingsStream = await engine.queryBindings(
    `
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX so: <http://purl.obolibrary.org/obo/so#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT DISTINCT ?childOrSubClass ?label
    WHERE {
      ?parentOrSubClass (rdfs:subClassOf*) obo:SO_0000704.
      ?partOfOrSubProperty (rdfs:subPropertyOf*) so:part_of.
      ?childOrSubClass (rdfs:subClassOf*) ?restriction;
        rdfs:label ?label.
      ?restriction a owl:Restriction;
        owl:onProperty ?partOfOrSubProperty;
        owl:someValuesFrom ?parentOrSubClass.
    }
`,
    { sources: [store] },
  )
  console.log('child\tlabel')
  // Can also convert to array with
  // const bindings = await bindingsStream.toArray()
  bindingsStream.on('data', (binding) => {
    const child = binding.get('childOrSubClass')?.value
    const label = binding.get('label')?.value
    console.log(`${child}\t${label}`)
  })
}

main()
