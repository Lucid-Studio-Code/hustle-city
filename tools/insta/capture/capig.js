const rec=require('./rec.js'),boot=require('./boot.js');(async()=>{const R=await rec();const p=R.p;await boot(R,{name:'Momo',skin:'gold',lingots:40});
const O='/tmp/claude-501/v2/ig/';
for(const id of ['k-cob-numero1','k-cdm-coupe']){
 await p.evaluate(id=>{GAME.st.owned[id]=[{paid:0,t:Date.now()}];const b=document.createElement('b');b.dataset.act='cardZoom';b.dataset.id=id;document.body.appendChild(b);b.click();b.remove();},id);
 await R.wait(1500);await p.evaluate(()=>window.__sync());
 const el=p.locator('#cardzoom .tcg').first();console.log(id,await el.count(),await el.boundingBox());
 await p.screenshot({path:O+id+'-full.png'});
 await el.screenshot({path:O+id+'.png',omitBackground:true});
 await p.evaluate(()=>{const z=document.getElementById('cardzoom');z.className='';z.innerHTML=''});await R.wait(500);}
await p.evaluate(()=>{const b=document.createElement('b');b.dataset.act='phoneGo';document.body.appendChild(b);});
await p.evaluate(()=>{try{GAME.st.cash=48250}catch(e){}});
await p.evaluate(()=>{const f=[...document.querySelectorAll('[data-act]')].map(e=>e.dataset.act);window.__acts=[...new Set(f)]});console.log(await p.evaluate(()=>window.__acts.join(' ')));
console.log(R.errs);await R.close()})();
