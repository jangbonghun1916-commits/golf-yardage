const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const COURSES={
  '아크로CC':{
    source:'아크로CC 공식 코스 공략도 · 개인 참고용', official:'https://www.acrogolf.co.kr/html/course/course_03_01_01.asp',
    loops:{
      '챌린지':{slug:'challenge',par:[5,4,4,3,4,4,3,4,5]},
      '스카이':{slug:'sky',par:[4,5,4,3,4,5,4,3,4]},
      '마스터':{slug:'master',par:[4,3,5,4,3,4,4,4,5]}
    }
  },
  '어등산CC':{
    source:'어등산CC 코스 등록 완료 · 내 도면·사진을 홀별로 추가하세요',official:'https://www.eodeungsancc.com/course-introduction',
    loops:{
      '어등':{par:[4,4,3,4,5,4,4,3,5]},
      '송정':{par:[4,4,4,3,5,4,3,5,4]},
      '하남':{par:[4,4,3,5,4,3,4,4,5]}
    }
  }
};
const state={tool:'ball',points:[],lineStart:null};
const selection=()=>({club:$('#courseName').value,loop:$('#courseLoop').value,hole:+$('#holeSelect').value});
const key=()=>{const s=selection();return `yardage:v2:${s.club}:${s.loop}:${s.hole}`};
const imageKey=()=>`${key()}:image`;
const imageKeyFor=(club,loop,hole)=>`yardage:v2:${club}:${loop}:${hole}:image`;
const openImageDB=()=>new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('저장소 미지원'));return}const req=indexedDB.open('my-yardage-images',1);req.onupgradeneeded=()=>req.result.createObjectStore('images');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function imageGet(k){const db=await openImageDB();return new Promise((resolve,reject)=>{const req=db.transaction('images').objectStore('images').get(k);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function imagePut(k,value){const db=await openImageDB();return new Promise((resolve,reject)=>{const req=db.transaction('images','readwrite').objectStore('images').put(value,k);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
async function imageDelete(k){const db=await openImageDB();return new Promise((resolve,reject)=>{const req=db.transaction('images','readwrite').objectStore('images').delete(k);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}

for(let i=1;i<=9;i++) $('#holeSelect').add(new Option(`${i}번 홀`,i));
function fillLoops(){const selected=$('#courseLoop').value,loops=Object.keys(COURSES[$('#courseName').value].loops);$('#courseLoop').innerHTML='';loops.forEach(v=>$('#courseLoop').add(new Option(`${v} 코스`,v)));if(loops.includes(selected))$('#courseLoop').value=selected}
function holeMeta(){const s=selection();return COURSES[s.club].loops[s.loop]}
function currentData(){return {par:$('#parSelect').value,strategy:$('#strategy').value,putting:$('#putting').value,points:state.points}}
function getNotes(){try{return JSON.parse(localStorage.getItem(`${key()}:notes`))||[]}catch{return []}}
function defaultImage(){const s=selection(),meta=holeMeta(),path=s.club==='아크로CC'?`course-images/acro/${meta.slug}/${s.hole}.jpg`:'';return path&&window.EMBEDDED_IMAGES?.[path]||path}
async function updateImage(){
  const wantedKey=imageKey(),img=$('#courseImage');let custom='';
  try{const blob=await imageGet(wantedKey);if(blob)custom=URL.createObjectURL(blob)}catch{}
  if(wantedKey!==imageKey())return;
  const legacy=localStorage.getItem(wantedKey),src=custom||legacy||defaultImage();
  img.style.display=src?'block':'none';img.src=src||'';
  $('.course-art').style.display=src?'none':'block';
  const club=COURSES[selection().club];$('#mapSource').innerHTML=`${(custom||legacy)?'내가 등록한 홀 도면':club.source} · <a href="${club.official}" target="_blank" rel="noreferrer">공식 코스 안내</a>`;
}
function load(){
  let data={};try{data=JSON.parse(localStorage.getItem(key()))||{}}catch{}
  const par=holeMeta().par[selection().hole-1]||4;
  $('#strategy').value=data.strategy||'';$('#putting').value=data.putting||'';$('#parSelect').value=data.par||String(par);
  state.points=data.points||[];state.lineStart=null;render();renderNotes();updateImage();updateTitle();
}
function updateTitle(){const s=selection();$('#holeTitle').textContent=`${s.club} · ${s.loop} ${s.hole}번 홀 · PAR ${$('#parSelect').value}`}
function render(){
  const layer=$('#markers');layer.innerHTML='';
  state.points.forEach(p=>{
    if(p.type==='line'){const dx=p.x2-p.x,dy=p.y2-p.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI,el=document.createElement('span');el.className='strategy-line';el.style.cssText=`left:${p.x}%;top:${p.y}%;width:${len}%;transform:rotate(${angle}deg)`;layer.append(el);return}
    const el=document.createElement('span');el.className=`marker ${p.type}`;el.style.left=`${p.x}%`;el.style.top=`${p.y}%`;el.textContent=p.type==='ball'?'':p.type==='pin'?'⚑':'➜';layer.append(el);
  });
}
function setTool(tool){state.tool=tool;state.lineStart=null;$$('.tools button').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));$('#modeHelp').textContent=tool==='line'?'시작점과 끝점을 차례로 누르세요':'지도를 눌러 위치를 표시하세요'}
$$('.tools button').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('#courseMap').addEventListener('pointerdown',e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;if(state.tool==='line'){if(!state.lineStart){state.lineStart={x,y};$('#modeHelp').textContent='공략선의 끝점을 누르세요';return}state.points.push({type:'line',x:state.lineStart.x,y:state.lineStart.y,x2:x,y2:y});state.lineStart=null}else{if(['ball','pin'].includes(state.tool))state.points=state.points.filter(p=>p.type!==state.tool);state.points.push({type:state.tool,x,y})}render()});
$('#undoBtn').onclick=()=>{state.points.pop();render()};
$('#saveBtn').onclick=()=>{localStorage.setItem(key(),JSON.stringify(currentData()));flash('저장했습니다. 다음 방문에도 그대로 보여요.')};
$('#clearBtn').onclick=()=>{if(confirm('현재 홀의 표시와 메모를 모두 지울까요?')){localStorage.removeItem(key());localStorage.removeItem(`${key()}:notes`);load();flash('현재 홀 기록을 지웠습니다.')}};
function flash(msg){$('#saveStatus').textContent=msg;setTimeout(()=>$('#saveStatus').textContent='',2500)}
$$('.quick-notes button').forEach(b=>b.onclick=()=>{$('#putting').value+=($('#putting').value?' · ':'')+b.textContent});
function renderNotes(){const notes=getNotes(),ul=$('#historyList');ul.innerHTML='';notes.forEach((n,i)=>{const li=document.createElement('li');li.innerHTML=`<span>${escapeHtml(n.text)} <small>${n.date}</small></span><button data-i="${i}">삭제</button>`;ul.append(li)});ul.querySelectorAll('button').forEach(b=>b.onclick=()=>{const a=getNotes();a.splice(+b.dataset.i,1);localStorage.setItem(`${key()}:notes`,JSON.stringify(a));renderNotes()})}
$('#addNoteBtn').onclick=()=>{const input=$('#roundNote'),text=input.value.trim();if(!text)return;const a=getNotes();a.unshift({text,date:new Date().toLocaleDateString('ko-KR')});localStorage.setItem(`${key()}:notes`,JSON.stringify(a));input.value='';renderNotes()};
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
$('#courseName').onchange=()=>{fillLoops();load()};$('#courseLoop').onchange=load;$('#holeSelect').onchange=load;$('#parSelect').onchange=updateTitle;
$('#imageUpload').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;const s=selection(),img=$('#courseImage');if(files.length===1){const file=files[0],selectedKey=imageKey(),instant=URL.createObjectURL(file);img.src=instant;img.style.display='block';$('.course-art').style.display='none';$('#mapSource').textContent=`${s.loop} ${s.hole}번 홀 사진을 저장하는 중입니다…`;try{await imagePut(selectedKey,file);if(selectedKey===imageKey()){await updateImage();flash(`${s.hole}번 홀 도면을 등록했습니다.`)}}catch{img.src=instant;$('#mapSource').textContent='사진은 표시했지만 이 브라우저에서 영구 저장이 제한되었습니다.';flash('사진을 표시했습니다.')}}else{const batch=files.slice(0,9);$('#mapSource').textContent=`1~${batch.length}번 홀 사진을 저장하는 중입니다…`;try{for(let i=0;i<batch.length;i++)await imagePut(imageKeyFor(s.club,s.loop,i+1),batch[i]);$('#holeSelect').value='1';await load();flash(`${s.loop} 코스 1~${batch.length}번 홀을 순서대로 등록했습니다.`)}catch{alert('사진 일괄 저장이 제한되었습니다. 브라우저에서 웹 주소로 실행해주세요.')}}e.target.value=''};
$('#removeImageBtn').onclick=async()=>{try{await imageDelete(imageKey())}catch{}localStorage.removeItem(imageKey());await updateImage();flash('내 사진을 제거했습니다.')};
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
fillLoops();load();
