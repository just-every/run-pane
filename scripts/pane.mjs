#!/usr/bin/env node
import { readFile, open } from 'node:fs/promises'
import { constants } from 'node:fs'
// Session credentials stay in a private file and never in command arguments.
const [command,...args]=process.argv.slice(2),options={}
for(let i=0;i<args.length;i+=2) {if(!args[i]?.startsWith('--')||!args[i+1])throw Error('Expected --flag value');options[args[i].slice(2)]=args[i+1]}
const routes={'ai-history':'/ai/history',posts:'/posts','post-save':'/posts/save','post-submit':'/posts/submit','ai-propose':'/ai/propose','ai-decide':'/ai/decide','ai-undo':'/ai/undo',status:'',prepare:'/prepare',publish:'/publish',rollback:'/rollback','import-crawl-challenge':'/import/crawl-challenge','import-crawl':'/import/crawl','import-plan':'/import/dry-run','import-apply':'/import/apply','import-undo':'/import/undo',erase:'/messages/erase',pages:'/pages',collections:'/collections'}
if(!(command in routes)||!options.origin||(!options['session-file']&&!options['token-file'])||(options['session-file']&&options['token-file']))throw Error('Usage: node scripts/pane.mjs status|prepare|posts|post-save|post-submit|ai-propose|ai-decide|ai-undo|ai-history|publish|rollback|import-crawl-challenge|import-crawl|import-plan|import-apply|import-undo|erase --origin URL --session-file PRIVATE_FILE (or --token-file PRIVATE_FILE) [--input FILE] [--revision ID] [--fingerprint HASH] [--job ID] [--id ID]')
const origin=new URL(options.origin)
if(origin.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw Error('Use HTTPS or loopback.')
const file=await open(options['session-file']??options['token-file'],constants.O_RDONLY|(constants.O_NOFOLLOW??0))
let credential
try {
 const info=await file.stat()
 if(!info.isFile()||(info.mode&0o777)!==0o600||(process.getuid&&info.uid!==process.getuid()))throw Error('Credential file must be owned by you, regular and mode 0600.')
 credential=(await file.readFile('utf8')).trim()
 if(!credential||/[\r\n\0]/.test(credential))throw Error('Invalid credential file.')
}finally{await file.close()}
const authorization=options['token-file']?{Authorization:'Bearer '+credential}:{Cookie:credential}
const read=['status','pages','collections','posts','ai-history'].includes(command)
let body={revision:options.revision,fingerprint:options.fingerprint,job:options.job,id:options.id}
if(options.input){const value=await readFile(options.input,'utf8');if(command.startsWith('import-crawl'))body=JSON.parse(value);else if(command==='prepare')body.site=JSON.parse(value);else if(command.startsWith('post-')||command.startsWith('ai-'))body=JSON.parse(value);else body.source=value}
const target=new URL('/api/pane'+(routes[command]??''),origin)
if(command==='ai-history'&&options.post)target.searchParams.set('post',options.post)
const response=await fetch(target,{method:read?'GET':'POST',headers:{...authorization,Origin:origin.origin,'Content-Type':'application/json'},body:read?undefined:JSON.stringify(body),redirect:'error'})
const value=await response.json();console.log(JSON.stringify(value,null,2));if(!response.ok)process.exitCode=1
