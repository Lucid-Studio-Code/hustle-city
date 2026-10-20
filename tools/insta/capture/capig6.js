const rec=require('./rec.js'),boot=require('./boot.js');(async()=>{const R=await rec();const p=R.p;await boot(R,{name:'Momo',skin:'gold',lingots:40,cash:248250});
const O='/tmp/claude-501/v2/ig/';const snap=async n=>{await R.wait(1800);await p.evaluate(()=>window.__sync());await p.screenshot({path:O+n+'.png'})};
const clk=async(a,id)=>{await p.evaluate(([a,id])=>{const b=document.createElement('b');b.dataset.act=a;if(id)b.dataset.id=id;document.body.appendChild(b);b.click();b.remove();},[a,id]);};
console.log(await p.evaluate(()=>[...document.querySelectorAll('.bld')].map(b=>b.dataset.id).join(' ')));
await clk('phone');await R.wait(800);await clk('phoneApp','immo');await snap('v-immo');
await p.reload();await R.wait(6000);await p.evaluate(()=>document.getElementById('st-go')?.click());await R.wait(2500);for(let i=0;i<8;i++){await p.evaluate(()=>document.querySelector('.dlg button')?.click());await R.wait(600)}
await p.evaluate(()=>{const s=document.createElement('style');s.textContent='#ph-banner,#toast,#quest{display:none!important}';document.head.appendChild(s)});
await p.evaluate(()=>{document.querySelector('.bld[data-id=shop]:not(.plq-copy)').click()});await snap('v-comptoir');
console.log(R.errs);await R.close()})();
