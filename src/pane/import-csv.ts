/** Quoted CSV fields retain commas, escaped quotes, CRLF and embedded newlines. */
export function csvRows(source:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false
 const cell=()=>{row.push(field);field='';closed=false},line=()=>{cell();if(row.some(value=>value!==''))rows.push(row);row=[]}
 source=source.replace(/^\uFEFF/,'')
 for(let i=0;i<source.length;i++){
  const c=source[i]
  if(quoted){if(c!=='"')field+=c;else if(source[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}
  else if(c===',')cell()
  else if(c==='\r'||c==='\n'){line();if(c==='\r'&&source[i+1]==='\n')i++}
  else if(closed){if(c!==' '&&c!=='\t')throw Error('Text after CSV closing quote.')}
  else if(c==='"'){if(field)throw Error('CSV quote must start a field.');quoted=true}
  else field+=c
 }
 if(quoted)throw Error('Unclosed CSV quote.');line();return rows
}
