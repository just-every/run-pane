#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
// Session credentials stay in a private file and never in command arguments.
const [command,...args]=process.argv.slice(2),options={}
for(let i=0;i<args.length;i+=2) {if(!args[i]?.startsWith('--')||!args[i+1])throw Error('Expected --flag value');options[args[i].slice(2)]=args[i+1]}
const routes={status:'',prepare:'prepare',publish:'publish',rollback:'rollback','import-plan':'import/dry-run','import-apply':'import/apply','import-undo':'import/undo',erase:'messages/erase'}
if(!(command in routes)||!options.origin||!options['session-file'])throw Error('Usage: node scripts/pane.mjs status|prepare|publish|rollback|import-plan|import-apply|import-undo|erase --origin URL --session-file PRIVATE_FILE [--input FILE] [--revision ID] [--fingerprint HASH] [--job ID] [--id ID]')
const origin=new URL(options.origin)
if(origin.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw Error('Use HTTPS or loopback.')
const cookie=(await readFile(options['session-file'],'utf8')).trim()
let body={revision:options.revision,fingerprint:options.fingerprint,job:options.job,id:options.id}
if(options.input){const value=await readFile(options.input,'utf8');if(command==='prepare')body.site=JSON.parse(value);else body.source=value}
const response=await fetch(new URL('/api/pane'+(routes[command]?'/'+routes[command]:''),origin),{method:command==='status'?'GET':'POST',headers:{Cookie:cookie,Origin:origin.origin,'Content-Type':'application/json'},body:command==='status'?undefined:JSON.stringify(body),redirect:'error'})
const value=await response.json();console.log(JSON.stringify(value,null,2));if(!response.ok)process.exitCode=1
