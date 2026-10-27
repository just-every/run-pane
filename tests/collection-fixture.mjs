export const serviceFields=[
 {id:'name',label:'Service name',type:'text',required:true,help:'A short human name.'},
 {id:'description',label:'Description',type:'richText',required:true,help:'Describe the work and care involved.'},
 {id:'price',label:'Price',type:'price',required:true},
 {id:'duration',label:'Hours',type:'number'},
 {id:'available',label:'Available from',type:'date'},
 {id:'details',label:'More information',type:'link'},
 {id:'team',label:'Specialist',type:'reference',reference:'team',required:true},
 {id:'category',label:'Category',type:'option',options:['Repair','Commission']},
 {id:'image',label:'Service image',type:'image'},
 {id:'notes',label:'Care notes',type:'text'},
]
export const serviceItem=index=>({id:'service-'+index,slug:'service-'+index,title:'Furniture care '+index,values:{name:'Furniture care '+index,description:{body:'Thoughtful repairs for well-loved furniture.'},price:125.5,duration:2,available:'2026-11-01',details:'https://example.test/care',team:'june',category:'Repair',notes:'Bring a photograph of your piece.'}})
