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
function normalizeMobile(value){
 let digits=String(value||'').replace(/\D/g,'');
 if(digits.length===11&&digits.startsWith('1'))digits=digits.slice(1);
 if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits))throw Error('Enter a valid 10-digit U.S. mobile number');
 return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
}
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid submission');
 const name=String(input.name||'').trim();
 const email=String(input.email||'').trim().toLowerCase();
 const phone=normalizeMobile(input.phone);
 const dish=String(input.dish||'').trim();
 const category=String(input.category||'');
 const servings=Number(input.servings);
 const attendees=Number(input.attendees);
 if(name.length<2||name.length>100)throw Error('Enter a valid name');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address');
 if(!categories.some(c=>c.id===category))throw Error('Select a valid category');
 if(dish.length<2||dish.length>160)throw Error('Enter a dish description');
 if(!Number.isInteger(servings)||servings<1||servings>500)throw Error('Servings must be between 1 and 500');
 if(!Number.isInteger(attendees)||attendees<1||attendees>50)throw Error('Attendees must be between 1 and 50');
 const notes=String(input.notes||'').trim().slice(0,500);
 return {name,email,phone,dish,category,servings,attendees,notes};
}

module.exports={categories,targets,summarize,validate,normalizeMobile,initialGuests};
