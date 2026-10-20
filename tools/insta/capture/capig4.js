const rec=require('./rec.js'),boot=require('./boot.js');(async()=>{const R=await rec();const p=R.p;await boot(R,{name:'Momo',skin:'gold',lingots:40});
const O='/tmp/claude-501/v2/ig/';
await p.evaluate(()=>{const s=document.createElement('style');s.textContent='#cardzoom .tcg-card{box-shadow:none!important}#cardzoom .tcg-holo{display:none!important}';document.head.appendChild(s)});
console.log('nb cartes',await p.evaluate(()=>{const I=(window.HC_DATA||window.DATA).ITEMS;return I.filter(i=>i.cat==='card').length}));
for(const id of ['k-t1','c-goat','cr-parrain','cr-kaiju','cr-phenix','cr-cosmo','j-f4','j-b7','c-psa10','c-ballon','k-cob-numero1','k-cob-flambeur','k-cob-professeur','k-cob-collectionneur','k-cob-trader','k-cob-fetard','k-cob-parieur','k-cob-gratteur','k-cdm-coupe']){
 await p.evaluate(id=>{GAME.st.owned[id]=[{paid:0,t:Date.now()}];const b=document.createElement('b');b.dataset.act='cardZoom';b.dataset.id=id;document.body.appendChild(b);b.click();b.remove();},id);
 await R.wait(1200);await p.evaluate(()=>window.__sync());
 await p.locator('#cardzoom .tcg').first().screenshot({path:O+'cards/'+id+'.png',omitBackground:true});
 await p.evaluate(()=>{const z=document.getElementById('cardzoom');z.className='';z.innerHTML=''});await R.wait(300);}
await R.close()})();
