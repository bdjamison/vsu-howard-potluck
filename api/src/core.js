const categories=[
 {id:'protein',name:'Protein / Main Dish',icon:'🍗',ratio:1,unit:'servings'},
 {id:'starch',name:'Starches',icon:'🥔',ratio:1,unit:'servings'},
 {id:'vegetable',name:'Vegetables',icon:'🥦',ratio:.8,unit:'servings'},
 {id:'fruit',name:'Fruit',icon:'🍓',ratio:.5,unit:'servings'},
 {id:'side',name:'Other Sides',icon:'🥗',ratio:.8,unit:'servings'},
 {id:'drink',name:'Drinks',icon:'🥤',ratio:1.5,unit:'drinks'},
 {id:'dessert',name:'Desserts',icon:'🍰',ratio:.7,unit:'servings'}
];
const initialGuests=40;
function targets(guests=initialGuests){return categories.map(c=>({...c,target:Math.ceil(guests*c.ratio)}));}
function summarize(rows,guests=initialGuests){return targets(guests).map(c=>{const approved=rows.filter(r=>r.category===c.id&&r.status==='approved').reduce((n,r)=>n+Number(r.servings||0),0);const pending=rows.filter(r=>r.category===c.id&&r.status==='pending').reduce((n,r)=>n+Number(r.servings||0),0);return {...c,approved,pending,shortage:Math.max(0,c.target-approved)};});}
function validate(input){if(!input||typeof input!=='object')throw Error('Invalid submission');const name=String(input.name||'').trim(),phone=String(input.phone||'').trim(),dish=String(input.dish||'').trim(),category=String(input.category||'');const servings=Number(input.servings),adults=Number(input.adults),children=Number(input.children||0);if(name.length<2||name.length>100)throw Error('Enter a valid name');if(!/^\+?[\d\s().-]{10,22}$/.test(phone)||phone.replace(/\D/g,'').length<10)throw Error('Enter a valid mobile number');if(!categories.some(c=>c.id===category))throw Error('Select a valid category');if(dish.length<2||dish.length>160)throw Error('Enter a dish description');if(!Number.isInteger(servings)||servings<1||servings>500)throw Error('Servings must be between 1 and 500');if(!Number.isInteger(adults)||adults<0||adults>50||!Number.isInteger(children)||children<0||children>50||adults+children<1)throw Error('Enter attendees (at least one)');const notes=String(input.notes||'').trim().slice(0,500);return {name,phone,dish,category,servings,adults,children,notes};}
module.exports={categories,targets,summarize,validate,initialGuests};
