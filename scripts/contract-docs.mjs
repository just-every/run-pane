// Generate the acceptance register and clause claims from the pinned contract parser.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {parseContract} from '../src/base/seed-contract.mjs'
const command=process.argv[2]
if(!['write','check'].includes(command))throw Error('Use contract-docs.mjs write or check.')
let source=readFileSync('CONTRACT.md','utf8')
const rows=source.split('\n').filter(line=>/^\| `[A-Z][A-Z0-9-]+` \|/.test(line)).map(line=>line.split(/(?<!\\)\|/).slice(1,-1).map(cell=>cell.trim()))
function summary(label,select){const own=rows.filter(row=>select(row[2]));return `| ${label} | ${['done','partial','missing'].map(status=>own.filter(row=>row[3]===status).length).join(' | ')} | ${own.length} |`}
for(const [label,select] of [['Published',kind=>kind==='published'],['Target and push further',kind=>kind!=='published'],['All',()=>true]])source=source.replace(new RegExp('^\\| '+label+' \\|.*$','m'),summary(label,select))
const contract=parseContract(source),byId=new Map(rows.map(row=>[row[0].replaceAll('`',''),row]))
const tally=`${contract.counts.total} clauses: ${contract.counts.done} done, ${contract.counts.partial} partial, ${contract.counts.missing} missing.`
let acceptance=`# Pane acceptance\n\nGenerated from [CONTRACT.md](CONTRACT.md) by the seed contract-docs command. Edit the contract source, then regenerate. ${tally}\n\n`
let claims=`# Pane clause claims\n\nGenerated from [CONTRACT.md](../CONTRACT.md). These are implementation statuses, subject to exact-commit verification and guarded landing. Provider and field-proof boundaries remain in the source contract. ${tally}\n\n| Clause | Status | Title |\n| --- | --- | --- |\n`
for(const area of contract.areas){
 acceptance+=`## ${area.name}\n\n`
 for(const id of area.clauses){
  const clause=contract.clauses.find(value=>value.id===id),row=byId.get(id)
  if(!clause.text.includes('**Acceptance evidence:**'))throw Error(id+' has no source acceptance journey.')
  for(const path of clause.evidence)if(!existsSync(path))throw Error(id+' evidence path is missing: '+path)
  const text=clause.text.replace(/\*Status:\*\s*(?:done|partial|missing)\./g,'Implementation:').trim()
  acceptance+=`- **${id} — ${clause.title}** (${clause.status}). ${text}${row[4]?` Evidence: ${row[4]}`:''}${clause.gap?` Gap: ${row[5]}`:''}\n`
  claims+=`| ${id} | ${clause.status} | ${clause.title.replaceAll('|','\\|')} |\n`
 }
 acceptance+='\n'
}
const outputs=new Map([['CONTRACT.md',source],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]])
if(command==='write')mkdirSync('docs',{recursive:true})
for(const [path,content] of outputs){if(command==='write')writeFileSync(path,content);else if(!existsSync(path)||readFileSync(path,'utf8')!==content)throw Error(path+' is stale; run node scripts/contract-docs.mjs write.')}
console.log(`Contract documents ${command==='write'?'generated':'fresh'}; ${tally}`)
