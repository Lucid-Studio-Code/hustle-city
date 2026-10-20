const rec=require('./rec.js'),boot=require('./boot.js');(async()=>{const R=await rec();const p=R.p;await boot(R,{name:'Momo',skin:'gold',lingots:40});
const O='/tmp/claude-501/v2/ig/';const clk=async(a,id)=>{await p.evaluate(([a,id])=>{const b=document.createElement('b');b.dataset.act=a;if(id)b.dataset.id=id;document.body.appendChild(b);b.click();b.remove();},[a,id]);await R.wait(2500);await p.evaluate(()=>window.__sync());};
await clk('phoneApp','crypto');console.log(await p.evaluate(()=>[...document.querySelectorAll('[data-act]')].filter(e=>/coin|crypto/i.test(e.dataset.act)).map(e=>e.dataset.act+':'+e.dataset.id).join(' ')));const c=p.locator('[data-act=coinSel]').first();if(await c.count()){await c.click();await R.wait(2500);await p.evaluate(()=>window.__sync())}await p.screenshot({path:O+'crypto.png'});
await p.reload();await R.wait(6000);await p.evaluate(()=>document.getElementById('st-go')?.click());await R.wait(2500);
for(let i=0;i<8;i++){await p.evaluate(()=>document.querySelector('.dlg button')?.click());await R.wait(700)}
await p.evaluate(()=>{const s=document.createElement('style');s.textContent='#ph-banner,#toast,#quest{display:none!important}';document.head.appendChild(s)});
await p.evaluate(()=>document.querySelector('.bld[data-id=club]:not(.plq-copy)').click());await R.wait(1200);
await p.evaluate(()=>document.querySelector('[data-act=clubGo]').click());await R.wait(1500);
await R.wait(6000);await p.evaluate(()=>{GAME.st.club.cast['z-vip']=1;document.querySelectorAll('.rain,.confetti,[class*=rain]').forEach(e=>e.remove())});await p.evaluate(()=>window.__sync());await p.screenshot({path:O+'club.png'});
await R.tap('[data-act=clubSpot][data-id=z-vip]');await R.wait(1600);await p.evaluate(()=>window.__sync());await p.screenshot({path:O+'club-vip.png'});
console.log(R.errs);await R.close()})();
