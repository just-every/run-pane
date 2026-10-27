// Independently specified nonempty records exercise filtering, sorting and limits.
export const catalogProjects={id:'synthetic-pane-projects',prefix:'projects',title:'Workshop projects',fields:[{id:'rank',label:'Display rank',type:'number'},{id:'featured',label:'Featured',type:'option',options:['yes','no']}],items:[
 {id:'porch',slug:'porch',title:'Porch repairs',values:{rank:2,featured:'yes'}},
 {id:'shelves',slug:'shelves',title:'Library shelves',values:{rank:1,featured:'yes'}},
 {id:'table',slug:'table',title:'Workshop table',values:{rank:3,featured:'yes'}},
 {id:'cabinet',slug:'cabinet',title:'Back room cabinet',values:{rank:0,featured:'no'}},
]}
