import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {parseContract} from '../src/base/seed-contract.mjs'

const mode=process.argv[2]
if(!['write','check'].includes(mode))throw Error('Use node scripts/contract-docs.mjs write or check.')
const original=readFileSync('CONTRACT.md','utf8')
const cells=line=>line.replace(/^\|\s*|\s*\|$/g,'').split(/(?<!\\)\|/).map(cell=>cell.trim())
const rows=original.split('\n').filter(line=>/^\| `[A-Z][A-Z0-9-]+` \|/.test(line)).map(cells)
let source=original
for(const [name,selected] of [['Published',rows.filter(row=>row[2]==='published')],['Target and push further',rows.filter(row=>row[2]!=='published')],['All',rows]]){
 const counts=['done','partial','missing'].map(status=>selected.filter(row=>row[3]===status).length)
 source=source.replace(new RegExp('^\\| '+name+' \\|.*$','m'),'| '+name+' | '+[...counts,selected.length].join(' | ')+' |')
}
const contract=parseContract(source),proof=new Map(rows.map(row=>[row[0].replaceAll('`',''),row[4]]))
const prose=value=>value.split(/(`[^`]*`)/).map(part=>part.startsWith('`')?part:part.replace(/(?<![\w./:-])([A-Za-z][\w-]*)\/([A-Za-z][\w-]*)(?![\w./:-])/g,'$1&#47;$2')).join('')
const cell=value=>prose(value).replaceAll('|','\\|').replace(/\s*\n\s*/g,' ')
const acceptance='# Pane acceptance record\n\nGenerated from [CONTRACT.md](CONTRACT.md). Edit the contract and run `node scripts/contract-docs.mjs write`.\n\n'+
 `**Status: ${contract.counts.done} of ${contract.counts.total} clauses done, ${contract.counts.partial} partial, ${contract.counts.missing} missing.**\n\n`+
 '| Clause | Acceptance evidence | Proof | Status | Gap |\n| --- | --- | --- | --- | --- |\n'+
 contract.clauses.map(clause=>{
  const acceptance=(clause.text.split('**Acceptance evidence:**')[1]??clause.text).split('\n\n*Status:*')[0].trim()
  return `| ${clause.id} | ${cell(acceptance)} | ${prose(proof.get(clause.id)??'')} | ${clause.status} | ${cell(clause.gap)} |`
 }).join('\n')+'\n'
const homepage=source.split('## Homepage claims\n')[1].split('\n## Status')[0].trim()
const claims='# Pane homepage claims and proof\n\nGenerated from the Homepage claims section of [CONTRACT.md](../CONTRACT.md).\n\n'+prose(homepage)+'\n'
for(const [path,expected] of [['CONTRACT.md',source],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]]){
 if(mode==='write')writeFileSync(path,expected)
 else if(!existsSync(path)||readFileSync(path,'utf8')!==expected)throw Error(path+' is stale; run node scripts/contract-docs.mjs write.')
}
console.log(`contract-docs ${mode}: ${contract.counts.total} clauses, ${contract.counts.done} done, ${contract.counts.partial} partial, ${contract.counts.missing} missing`)
