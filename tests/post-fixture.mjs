import {richText} from '../public/pane-rich.mjs'
export function postBody(image,{post,file,page='about'}){
 const text=value=>({tag:'text',text:value}),node=(tag,...children)=>({tag,children})
 const linked=(href,label)=>({tag:'a',href,newTab:false,children:[text(label)]})
 const rich=[node('h2',text('Decorating celebration cakes')),node('h3',text('Prepare the layers')),node('ul',node('li',text('Vanilla sponge'),node('ul',node('li',text('Lemon curd'))))),node('p',node('strong',text('Fold gently')),text(' and '),node('em',text('cool first')),text('. '),linked('post:'+post,'Read our bakery story'),text(' '),linked('file:'+file,'Download cake guide'),text(' '),linked('tel:+13125550123','Call the bakery'))]
 const values=[{id:'story',kind:'text',format:'div',text:richText(rich),content:rich},{id:'photo-one',kind:'image',text:'A lemon celebration cake ready for a birthday',image:{...image,alt:'A lemon celebration cake ready for a birthday'},caption:'Lemon cake with flowers'},{id:'photo-two',kind:'image',text:'A chocolate celebration cake with piped decoration',image:{...image,alt:'A chocolate celebration cake with piped decoration'},caption:'Chocolate cake for a celebration'},{id:'quote',kind:'quote',text:'A celebration starts with something made with care.',attribution:'Riverbend baking team'},{id:'video',kind:'video',text:'How to decorate a cake',embed:{title:'How to decorate a cake',url:'https://www.youtube-nocookie.com/embed/syntheticPane1'}},{id:'button',kind:'button',text:'Meet the bakers',link:{href:'page:'+page,newTab:false}}]
 const blocks=values.map((block,index)=>({...block,column:1,span:12,row:index+1,order:0,align:'left',vertical:'start'}))
 const sections=[{id:'post-body',kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks}]
 return {sections,body:blocks.map(block=>[block.text,block.caption,block.attribution].filter(Boolean).join('\n')).join('\n\n')}
}
