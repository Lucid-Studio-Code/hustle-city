const rec=require('./rec.js'),boot=require('./boot.js');(async()=>{const R=await rec();const p=R.p;await boot(R,{name:'Momo',skin:'gold',lingots:40});
const O='/tmp/claude-501/v2/ig/';
await p.evaluate(()=>document.querySelector('[data-act=cdmGo]').click());await R.wait(2500);await p.evaluate(()=>window.__sync());await p.screenshot({path:O+'cdm1.png'});
const acts=await p.evaluate(()=>[...document.querySelectorAll('.dlg [data-act], #modal [data-act], [data-act^=cdm]')].map(e=>e.dataset.act+':'+(e.dataset.id||'')+':'+e.textContent.trim().slice(0,30)));console.log(acts.join('\n'));
await p.evaluate(()=>document.querySelector('[data-act=cdmPick][data-id=vampires]').click());await R.wait(2500);for(let i=0;i<4;i++){await p.evaluate(()=>document.querySelector('.dlg button')?.click());await R.wait(600)}
await p.evaluate(()=>{const b=document.querySelector('[data-act=cdmGo]');b&&b.click()});await R.wait(2500);await p.evaluate(()=>window.__sync());await p.screenshot({path:O+'cdm2.png'});
console.log((await p.evaluate(()=>[...document.querySelectorAll('[data-act]')].map(e=>e.dataset.act+':'+(e.dataset.id||'')))).filter(x=>/cdm|shop|tab/i.test(x)).join(' '));
for(const sel of ['[data-act=cdmTab][data-id=shop]','[data-act=cdmShop]']){const l=p.locator(sel);if(await l.count()){await l.first().click();await R.wait(2000);await p.evaluate(()=>window.__sync());await p.screenshot({path:O+'cdm3.png'});break}}
console.log(R.errs);await R.close()})();
