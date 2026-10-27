// Derive the acceptance inventory and claim index from the contract alone.
import {readFile,writeFile} from 'node:fs/promises'
import {parseContract} from '../src/base/seed-contract.mjs'
const mode=process.argv[2]
if(!['write','check'].includes(mode))throw Error('Choose write or check.')
let source=await readFile('CONTRACT.md','utf8')
const rows=[...source.matchAll(/^\| `([^`]+)` \| ([^|]+) \| (published|target|push-further) \| (done|partial|missing) \|\s*(.*?)\s*\|\s*(.*?)\s*\|$/gm)]
const tally=list=>({done:list.filter(row=>row[4]==='done').length,partial:list.filter(row=>row[4]==='partial').length,missing:list.filter(row=>row[4]==='missing').length,total:list.length})
for(const [label,list] of [['Published',rows.filter(row=>row[3]==='published')],['Target and push further',rows.filter(row=>row[3]!=='published')],['All',rows]]){
 const count=tally(list);source=source.replace(new RegExp('^\\| '+label+' \\|.*$','m'),`| ${label} | ${count.done} | ${count.partial} | ${count.missing} | ${count.total} |`)
}
const contract=parseContract(source),count=contract.counts
let acceptance=`# Pane acceptance\n\nGenerated from [CONTRACT.md](CONTRACT.md) by \`node scripts/contract-docs.mjs write\`. Edit the contract to change acceptance or status.\n\nCurrent row counts: ${count.total} clauses: ${count.done} done, ${count.partial} partial, ${count.missing} missing.\n`
for(const area of contract.areas){
 acceptance+='\n## '+area.name+'\n'
 for(const id of area.clauses){const clause=contract.clauses.find(clause=>clause.id===id)
  // Keep every source paragraph, including CT riders and boundaries, before its status.
  const prose=clause.text.replace(/\s*\*Status:\*[\s\S]*$/,'').trim()
  const evidence=rows.find(row=>row[1]===id)[5].trim()
  acceptance+=`\n- **${id} — ${clause.title}** (${clause.status}). ${prose}${evidence?' Evidence: '+evidence+'.':''}${clause.gap?' Gap: '+clause.gap:''}\n`
 }
}
const claims='# Pane claims\n\nGenerated from CONTRACT.md by `node scripts/contract-docs.mjs write`. Status describes application proof; provider and legal boundaries remain in the contract.\n\n| Clause | Status | Evidence | Gap |\n| --- | --- | --- | --- |\n'+rows.map(row=>`| \`${row[1]}\` | ${row[4]} | ${row[5].trim()} | ${row[6].trim()} |`).join('\n')+'\n'
for(const [file,expected] of [['CONTRACT.md',source],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]]){
 if(mode==='write')await writeFile(file,expected)
 else if(await readFile(file,'utf8').catch(()=>null)!==expected)throw Error(file+' is stale; run node scripts/contract-docs.mjs write.')
}
console.log('Contract documents '+(mode==='check'?'are current.':'regenerated.'))
