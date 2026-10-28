// Independently specified nonempty records exercise filtering, sorting and limits.
export const catalogProjects={id:'synthetic-pane-projects',prefix:'projects',title:'Workshop projects',fields:[{id:'rank',label:'Display rank',type:'number'},{id:'featured',label:'Featured',type:'option',options:['yes','no']}],items:[
 {id:'porch',slug:'porch',title:'Porch repairs',values:{rank:2,featured:'yes'}},
 {id:'shelves',slug:'shelves',title:'Library shelves',values:{rank:1,featured:'yes'}},
 {id:'table',slug:'table',title:'Workshop table',values:{rank:3,featured:'yes'}},
 {id:'cabinet',slug:'cabinet',title:'Back room cabinet',values:{rank:0,featured:'no'}},
]}

// Fixed all-day records exercise real collection delivery and multi-day cells.
export const catalogEvents={id:'synthetic-pane-events',prefix:'workshops',title:'Workshop dates',fields:[{id:'start',label:'Starts',type:'date',required:true},{id:'end',label:'Ends',type:'date',required:true}],items:[
 {id:'open-studio',slug:'open-studio',title:'Open studio',values:{start:'2026-11-01',end:'2026-11-01'}},
 {id:'woodworking',slug:'woodworking',title:'Woodworking weekend',values:{start:'2026-11-07',end:'2026-11-08'}},
 {id:'winter',slug:'winter',title:'Winter workshop',values:{start:'2026-12-02',end:'2026-12-02'}},
]}
export const catalogHandoffs=[
 ['booking','dial','https://book.example.test/workshop','Book with Dial'],
 ['booking','calendly','https://calendly.com/synthetic-pane-14/visit','Book with Calendly'],
 ['booking','acuity','https://app.acuityscheduling.com/schedule.php?owner=14','Book with Acuity'],
 ['product','stall','https://shop.example.test/workshop','Buy workshop kit'],
 ['buy-button','stripe','https://buy.stripe.com/synthetic-pane-14','Pay with Stripe'],
 ['buy-button','paypal','https://www.sandbox.paypal.com/buy?item=synthetic-pane-14','Pay with PayPal'],
]
