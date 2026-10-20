'use strict';
const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const state = { data:null, mode:'usd', period:'26', filter:'all', page:0, demo:new URLSearchParams(location.search).get('demo')==='1' };
const fmt = (v,n=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
const money = (v, exact=false)=>v==null||!Number.isFinite(Number(v))?'—':exact?'$'+fmt(v,2):Math.abs(v)>=1e9?'$'+fmt(v/1e9,2)+'B':Math.abs(v)>=1e6?'$'+fmt(v/1e6,2)+'M':Math.abs(v)>=1e3?'$'+fmt(v/1e3,1)+'K':'$'+fmt(v,2);
const linkFmt = v=>v==null?'—':Math.abs(v)>=1e6?fmt(v/1e6,3)+'M':Math.abs(v)>=1e3?fmt(v/1e3,2)+'K':fmt(v,2);
const dateFmt = t=>t?new Date(t).toLocaleString('en-GB',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false}):'—';
const $set = (id,text)=>{ $(id).textContent=text; };
const isFresh = t=>t&&Date.now()-Date.parse(t)<24*60*60*1000;
function setStatus(text,type='idle'){ $set('state-text',text); $('live-dot').className='dot'+(type==='ok'?' good':type==='bad'?' bad':''); }
function showNotice(html){ const el=$('status-notice');el.textContent=html;el.hidden=!html; }
function weekStart(v){ const d=new Date(v); const wd=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-wd);d.setUTCHours(0,0,0,0);return d.toISOString().slice(0,10); }
function weeklySeries(data){
  const map=new Map();
  for(const e of data.events||[]){const key=weekStart(e.timestamp);const cur=map.get(key)||{date:key,link:0,usd:0,missing:false};
    if(e.direction==='in'){cur.link+=e.link;if(e.usd_estimate==null)cur.missing=true;else cur.usd+=e.usd_estimate;}
    map.set(key,cur);
  }
  const days=(data.daily||[]).slice();
  const earliest=new Date((days[0]||{}).date||'2025-08-04');
  let current=new Date(weekStart(earliest));const end=new Date(weekStart(new Date()));const result=[];
  for(let i=0;current<=end&&i<300;i++){const k=current.toISOString().slice(0,10);const val=map.get(k)||{date:k,link:0,usd:0,missing:false}; result.push(val);current.setUTCDate(current.getUTCDate()+7);}
  let balance=0;let i=0;const inputs=(data.events||[]).slice().sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  for(const w of result){const e=new Date(w.date+'T00:00:00Z');e.setUTCDate(e.getUTCDate()+7);while(i<inputs.length&&Date.parse(inputs[i].timestamp)<e.getTime()){balance+=inputs[i].link*(inputs[i].direction==='in'?1:-1);i++;}w.balance=balance;}
  return result;
}
function renderNumbers(){
  const d=state.data;if(!d)return;
  $set('reserve-usd',money(d.reserve.usd_value));$set('reserve-link',linkFmt(d.reserve.balance_link));
  $set('market-cap',money(d.market.market_cap_usd));
  $set('market-share',d.reserve.market_cap_share_pct==null?'—':fmt(d.reserve.market_cap_share_pct,3)+'%');
  $set('spot-price',d.market.link_usd==null?'—':'· LINK '+money(d.market.link_usd,true));
  $set('updated-at','수집 '+dateFmt(d.updated_at)+' UTC');
  const last=d.last_deposit;
  $set('last-usd',last?money(last.usd_estimate,true):'—');
  $set('last-link',last?fmt(last.link,3)+' LINK':'— LINK');
  $set('last-time',last?dateFmt(last.timestamp):'—');
  $set('last-price',last&&last.usd_estimate!=null&&last.link?money(last.usd_estimate/last.link,true):'—');
  if(last){$('last-tx').href='https://etherscan.io/tx/'+encodeURIComponent(last.tx_hash); $('last-tx').textContent=last.tx_hash.slice(0,10)+'… ↗';}
  const weeks=weeklySeries(d);const lastComplete=weeks.slice(0,-1); const recent=lastComplete.slice(-4), earlier=lastComplete.slice(-8,-4);
  function total(items){return items.length===4&&!items.some(x=>x.missing)?items.reduce((a,x)=>a+x.usd,0):null;}
  const r=total(recent), p=total(earlier);
  $set('four-weeks',money(r));$set('previous-four-weeks',money(p));
  const change=r!=null&&p!=null&&p>0?(r/p-1)*100:null;
  $set('change-percent',change==null?'—':(change>0?'+':'')+fmt(change,1)+'%');
  $('change-percent').style.color=change==null?'':change>=0?'#68e8c2':'#ffa6a8';
}
function createSvg(tag,attributes={},text=''){const node=document.createElementNS(SVG_NS,tag);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,String(v));if(text)node.textContent=text;return node;}
function renderChart(){
  const d=state.data; const svg=$('main-chart');svg.replaceChildren();
  if(!d)return;
  const weeks=weeklySeries(d);
  const amount=state.period==='all'?weeks.length:Number(state.period);const cut=weeks.slice(-amount);
  const barMode=state.mode!=='balance';
  const vals=cut.map(w=>state.mode==='usd'?(w.missing?null:w.usd):state.mode==='link'?w.link:w.balance);
  const nonnull=vals.filter(v=>v!=null);if(nonnull.length===0){$('chart-empty').hidden=false;return;}$('chart-empty').hidden=true;
  const margin={left:67,right:16,top:19,bottom:41},W=860,H=308;
  const cw=W-margin.left-margin.right,ch=H-margin.top-margin.bottom;
  const max=Math.max(...nonnull,1)*1.16;const steps=4;
  for(let i=0;i<=steps;i++){
    const y=margin.top+ch-(ch*i/steps);
    svg.append(createSvg('line',{x1:margin.left,x2:W-margin.right,y1:y,y2:y,stroke:'#293753','stroke-dasharray':i===0?'0':'4 5','stroke-width':'.8'}));
    const cap=state.mode==='usd'?money(max*i/steps):linkFmt(max*i/steps);
    svg.append(createSvg('text',{x:margin.left-11,y:y+4,'text-anchor':'end',fill:'#7484a2','font-size':11,'font-family':'monospace'},cap));
  }
  const spacing=cw/cut.length;const barWidth=Math.min(29,spacing*.67);
  if(barMode){
    for(let i=0;i<cut.length;i++){const v=vals[i];if(v===null)continue;
      const bh=Math.max(1.5,ch*v/max),x=margin.left+i*spacing+spacing/2-barWidth/2,y=margin.top+ch-bh;
      const rect=createSvg('rect',{x,y,width:barWidth,height:bh,rx:2,fill:state.mode==='usd'?'#638aff':'#5ee1c8',opacity:i===cut.length-1?1:.83});
      rect.append(createSvg('title',{},cut[i].date+' UTC\n'+(state.mode==='usd'?money(v,true):fmt(v,3)+' LINK')));svg.append(rect);
    }
  }else{
    const points=vals.map((v,i)=>[margin.left+(i+.5)*spacing,margin.top+ch-ch*v/max]);
    const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' ');
    const area=path+' L'+points.at(-1)[0].toFixed(2)+','+(margin.top+ch)+' L'+points[0][0].toFixed(2)+','+(margin.top+ch)+' Z';
    svg.append(createSvg('path',{d:area,fill:'#567efa',opacity:'.12'}));svg.append(createSvg('path',{d:path,fill:'none',stroke:'#77a0ff','stroke-width':2.7,'stroke-linecap':'round','stroke-linejoin':'round'}));
    const last=points.at(-1);svg.append(createSvg('circle',{cx:last[0],cy:last[1],r:4,fill:'#83a8ff',stroke:'#111b31','stroke-width':2}));
  }
  const every=Math.max(1,Math.ceil(cut.length/7));cut.forEach((w,i)=>{
    if(i%every===0||i===cut.length-1){const x=margin.left+(i+.5)*spacing; svg.append(createSvg('text',{x,y:H-13,'text-anchor':'middle',fill:'#8494b0','font-size':11,'font-family':'monospace'},w.date.slice(5)));}
  });
  $set('legend-label',state.mode==='usd'?'입금 당시 달러 추정액':state.mode==='link'?'주간 LINK 유입 수량':'누적 리저브 LINK 잔액');
}
function renderLedger(){
  const d=state.data;if(!d)return;
  const list=(d.transactions||[]).filter(x=>state.filter==='all'||x.direction===state.filter).slice().reverse();
  const perPage=8,pages=Math.max(1,Math.ceil(list.length/perPage));state.page=Math.min(state.page,pages-1);
  const body=$('ledger-body');body.replaceChildren();
  if(!list.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.className='no-rows';td.textContent='해당하는 거래가 없습니다.';tr.append(td);body.append(tr);}
  for(const item of list.slice(state.page*perPage,(state.page+1)*perPage)){
    const tr=document.createElement('tr');const c1=document.createElement('td');c1.textContent=dateFmt(item.timestamp);
    const c2=document.createElement('td'),tag=document.createElement('span');tag.className='tag'+(item.direction==='out'?' out':'');tag.textContent=item.direction==='in'?'IN ↓':'OUT ↑';c2.append(tag);
    const c3=document.createElement('td');c3.className='align-right';c3.textContent=(item.direction==='in'?'+':'−')+fmt(item.link,3);
    const c4=document.createElement('td');c4.className='align-right';c4.textContent=money(item.usd_estimate,true);
    const c5=document.createElement('td');c5.className='align-right';const a=document.createElement('a');a.className='tx-link';a.href='https://etherscan.io/tx/'+encodeURIComponent(item.tx_hash);a.target='_blank';a.rel='noreferrer';a.textContent=item.tx_hash.slice(0,10)+'… ↗';c5.append(a);
    tr.append(c1,c2,c3,c4,c5);body.append(tr);
  }
  $set('table-summary','전체 '+fmt(list.length)+'건 / '+fmt(d.history.unpriced_inflow_events)+'건의 가격 미확인 입금');
  $set('page-number',(state.page+1)+' / '+pages);
  $('prev-btn').disabled=state.page===0;$('next-btn').disabled=state.page>=pages-1;
}
function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
function saveFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function exportCsv(){if(!state.data)return;const fields=['timestamp','direction','link','usd_estimate','tx_hash','entry_count'];const rows=[fields.join(',')];for(const t of state.data.transactions){rows.push(fields.map(k=>csvCell(t[k])).join(','));}saveFile(new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'}),'chainlink-reserve-ledger.csv');}
function cardCanvas(){
  if(!state.data)return;const d=state.data;const c=document.createElement('canvas');c.width=1600;c.height=900;const x=c.getContext('2d');
  function rect(px,py,w,h,color,r=0){x.fillStyle=color;x.beginPath();x.roundRect(px,py,w,h,r);x.fill();}
  function txt(t,px,py,size,color='#f2f6ff',bold=false,mono=false){x.fillStyle=color;x.font=`${bold?700:500} ${size}px ${mono?'ui-monospace,monospace':'sans-serif'}`;x.fillText(t,px,py);}
  rect(0,0,1600,900,'#08101f');const g=x.createLinearGradient(0,0,1600,900);g.addColorStop(0,'rgba(54,92,179,.25)');g.addColorStop(.7,'rgba(19,30,57,.04)');g.addColorStop(1,'rgba(71,94,160,.12)');rect(0,0,1600,900,g);rect(0,0,1600,9,'#648aff');
  txt('⬡  LINK / RESERVE',80,85,31,'#83a5ff',true,true);txt('ON-CHAIN INTELLIGENCE',80,121,16,'#8796b7',false,true);txt('CHAINLINK RESERVE TRACKER',80,198,53,'#f0f5ff',true);
  txt('Ethereum on-chain reserve · USD valuation / circulating market cap',80,235,19,'#96a8c8');
  const cards=[['RESERVE VALUE',money(d.reserve.usd_value)],['RESERVE HOLDINGS',linkFmt(d.reserve.balance_link)+' LINK'],['LINK MARKET CAP',money(d.market.market_cap_usd)],['MCAP RESERVE SHARE',d.reserve.market_cap_share_pct==null?'N/A':fmt(d.reserve.market_cap_share_pct,3)+'%']];
  cards.forEach(([label,value],i)=>{const xx=80+i*366;rect(xx,285,350,160,i===3?'#16294e':'#152239',14);txt(label,xx+25,329,17,'#93a8cc',false,true);txt(value,xx+25,402,36,i===3?'#8cb0ff':'#f3f7ff',true,true);});
  txt('WEEKLY RESERVE INFLOW  /  ESTIMATED USD',80,515,22,'#bdd0f8',true,true);
  const raw=weeklySeries(d).slice(-24);const heights=raw.map(w=>w.missing?null:w.usd);const hi=Math.max(1,...heights.filter(v=>v!=null));
  const bottom=775;for(let i=0;i<5;i++){const yy=bottom-i*42;x.strokeStyle='#2a3853';x.beginPath();x.moveTo(80,yy);x.lineTo(1505,yy);x.stroke();}
  const slot=1420/Math.max(raw.length,1);raw.forEach((w,i)=>{const v=heights[i];if(v==null)return;rect(83+i*slot,bottom-v/hi*165,Math.max(5,slot*.58),v/hi*165,'#668dff',2);});
  txt('Estimate ≠ execution cost · CoinGecko / DefiLlama / Ethereum Blockscout',80,843,17,'#8496b4');
  txt('AS OF '+dateFmt(d.updated_at)+' UTC'+(state.demo?' · DEMO DATA':''),1087,843,16,'#8194b6',false,true);
  if(state.demo){rect(1150,32,360,57,'#714520',8);txt('DEMO · NOT LIVE DATA',1172,67,20,'#ffe4b1',true);}
  saveFileFromCanvas(c);
}
function saveFileFromCanvas(c){c.toBlob(b=>{if(b)saveFile(b,'LINK-Reserve-'+new Date().toISOString().slice(0,10)+(state.demo?'-DEMO':'')+'.png');},'image/png');}
function renderAll(){renderNumbers();renderChart();renderLedger();$('download-btn').disabled=false;$('csv-btn').disabled=false;}
async function load(){
  const path=state.demo?'data/demo.json':'data/latest.json';
  try{
    const res=await fetch(path+'?t='+Date.now(),{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);const doc=await res.json();
    if(!doc||doc.schema_version!==1||!Array.isArray(doc.events)||!Array.isArray(doc.transactions)||!doc.reserve)throw new Error('데이터 형식이 잘못됨');
    if(!doc.reserve.reconciled)throw new Error('온체인 잔액과 전송기록의 합이 일치하지 않음');
    state.data=doc;renderAll();
    if(state.demo){setStatus('데모 데이터 · 실제 아님','idle');showNotice('미리보기용 가상 데이터입니다. 실제 리저브 수치는 사용하지 않았습니다. 실제 데이터는 GitHub Actions 첫 수집 후 확인하세요.');}
    else if(!isFresh(doc.updated_at)){setStatus('업데이트 지연','bad');showNotice('데이터 수집이 24시간 이상 지연되었습니다. GitHub Actions 실행 상태를 확인하세요. 마지막으로 성공한 데이터만 표시합니다.');}
    else if(!doc.market.market_cap_usd||!doc.market.link_usd){setStatus('시장 데이터 불완전','bad');showNotice('현재 LINK 시세 또는 유통 시가총액을 조회하지 못했습니다. 해당 지표는 — 로 표시하며, 수집된 온체인 데이터는 유지합니다.');}
    else if(!isFresh(doc.market.quoted_at)){setStatus('시세 갱신 지연','bad');showNotice('시장가격 및 시가총액이 24시간 이상 오래된 스냅샷입니다. 시가총액 대비 비율을 최신 값으로 간주하지 마세요.');}
    else {setStatus('온체인 데이터 동기화됨','ok');showNotice(doc.history.unpriced_inflow_events?'일부 과거 입금의 시점별 USD 가격을 확보하지 못했습니다. 해당 칸은 — 로 표시합니다.':'');}
  }catch(e){console.error('데이터 로딩 실패:',e);setStatus('첫 수집 필요','bad');showNotice('아직 검증된 실제 데이터가 없습니다. GitHub 저장소 Actions → Update reserve data & deploy → Run workflow를 실행하세요. 샘플 미리보기는 주소 끝에 ?demo=1을 붙여 볼 수 있습니다.');$('chart-empty').hidden=false;}
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;document.querySelectorAll('.tab').forEach(z=>{z.classList.toggle('active',z===b);z.setAttribute('aria-selected',z===b?'true':'false');});renderChart();}));
document.querySelectorAll('.period-btn').forEach(b=>b.addEventListener('click',()=>{state.period=b.dataset.period;document.querySelectorAll('.period-btn').forEach(z=>z.classList.toggle('active',z===b));renderChart();}));
$('filter-select').addEventListener('change',e=>{state.filter=e.target.value;state.page=0;renderLedger();});
$('prev-btn').addEventListener('click',()=>{state.page--;renderLedger();});$('next-btn').addEventListener('click',()=>{state.page++;renderLedger();});
$('csv-btn').addEventListener('click',exportCsv);$('download-btn').addEventListener('click',cardCanvas);
load();
