
const data = window.LOCAL_TRIP_DATA;
const views = [...document.querySelectorAll(".view")];

function showView(id){
  views.forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".bottom-nav button").forEach(
    b=>b.classList.toggle("active",b.dataset.target===id)
  );
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-target]").forEach(
  b=>b.addEventListener("click",()=>showView(b.dataset.target))
);

function parseCSV(text){
  const rows=[];
  let row=[], field="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"'){
      if(q && n === '"'){ field+='"'; i++; }
      else q=!q;
    } else if(c === ',' && !q){
      row.push(field); field="";
    } else if((c === '\n' || c === '\r') && !q){
      if(c === '\r' && n === '\n') i++;
      row.push(field); field="";
      if(row.some(v=>v.trim()!=="")) rows.push(row);
      row=[];
    } else field+=c;
  }
  if(field.length || row.length){
    row.push(field);
    if(row.some(v=>v.trim()!=="")) rows.push(row);
  }
  return rows;
}

function normalizeHeader(h){
  return String(h||"").trim().replace(/\s+/g,"").toLowerCase();
}

function scheduleFromRows(rows){
  if(!rows.length) return [];
  const headers=rows[0].map(normalizeHeader);
  const idx=(...names)=>{
    for(const name of names){
      const i=headers.indexOf(normalizeHeader(name));
      if(i>=0) return i;
    }
    return -1;
  };

  const iDate=idx("날짜");
  const iDay=idx("DAY","day");
  const iTime=idx("시간");
  const iCity=idx("도시");
  const iType=idx("구분");
  const iTitle=idx("일정");
  const iPlace=idx("장소");
  const iMove=idx("이동수단");
  const iMemo=idx("메모");

  const grouped=new Map();

  rows.slice(1).forEach(r=>{
    const date=(r[iDate]||"").trim();
    const dayRaw=(r[iDay]||"").trim();
    const title=(r[iTitle]||"").trim();
    if(!date && !dayRaw && !title) return;

    const m=dayRaw.match(/(\d+)/);
    const day=m ? Number(m[1]) : null;
    if(!day) return;

    // Accept 2026/11/03 or 2026-11-03
    const iso=date.replace(/\./g,"/").replace(/-/g,"/");
    const parts=iso.split("/").map(s=>s.trim()).filter(Boolean);
    let isoDate=date;
    if(parts.length===3){
      isoDate = `${parts[0]}-${String(parts[1]).padStart(2,"0")}-${String(parts[2]).padStart(2,"0")}`;
    }

    if(!grouped.has(day)){
      grouped.set(day,{
        day,
        date: isoDate,
        city:(r[iCity]||"").trim(),
        title:"",
        items:[]
      });
    }

    const g=grouped.get(day);
    if(!g.city) g.city=(r[iCity]||"").trim();

    const bits=[];
    if(iPlace>=0 && (r[iPlace]||"").trim()) bits.push((r[iPlace]||"").trim());
    if(iMove>=0 && (r[iMove]||"").trim()) bits.push((r[iMove]||"").trim());
    if(iMemo>=0 && (r[iMemo]||"").trim()) bits.push((r[iMemo]||"").trim());

    g.items.push({
      time:iTime>=0 ? (r[iTime]||"").trim() : "",
      title:title || (iType>=0 ? (r[iType]||"").trim() : "일정"),
      place:iPlace>=0 ? (r[iPlace]||"").trim() : "",
      note:bits.filter(Boolean).join(" · ")
    });
  });

  return [...grouped.values()]
    .sort((a,b)=>a.day-b.day)
    .map(g=>{
      const names=g.items.map(x=>x.title).filter(Boolean);
      g.title=names.length ? names.slice(0,3).join(" · ") : "일정 준비 중";
      return g;
    });
}

function fmtDate(iso){
  const d=new Date(iso+"T12:00:00");
  if(Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function getTodayDay(){
  const now=new Date();
  const localIso=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  return data.days.find(d=>d.date===localIso)||null;
}

function renderAll(){
  const overview=document.getElementById("overviewList");
  const tabs=document.getElementById("dayTabs");
  overview.innerHTML="";
  tabs.innerHTML="";

  const todayDay=getTodayDay();
  const title=document.getElementById("todayTitle");
  const summary=document.getElementById("todaySummary");

  if(todayDay){
    title.textContent=`DAY ${todayDay.day} · ${todayDay.title}`;
    summary.textContent=`${fmtDate(todayDay.date)} · ${todayDay.city}`;
  }else{
    title.textContent="여행 전입니다";
    summary.textContent="여행이 시작되면 오늘 일정이 자동으로 표시됩니다.";
  }

  data.days.forEach(d=>{
    const el=document.createElement("button");
    el.className="overview-item card";
    el.innerHTML=`<div><small>DAY ${d.day} · ${fmtDate(d.date)}</small><strong>${d.title}</strong></div><span>›</span>`;
    el.onclick=()=>{showView("schedule");renderDay(d.day)};
    overview.appendChild(el);

    const b=document.createElement("button");
    b.textContent=`DAY ${d.day}`;
    b.dataset.day=d.day;
    b.onclick=()=>renderDay(d.day);
    tabs.appendChild(b);
  });

  document.getElementById("goTodayBtn").onclick=()=>{
    showView("schedule");
    renderDay(todayDay?.day || data.days[0]?.day || 1);
  };

  renderDay(todayDay?.day || data.days[0]?.day || 1);
}

function renderDay(dayNo){
  const d=data.days.find(x=>x.day===dayNo) || data.days[0];
  if(!d) return;

  document.querySelectorAll(".day-tabs button").forEach(
    b=>b.classList.toggle("active",Number(b.dataset.day)===d.day)
  );

  const items=d.items.length
    ? d.items.map(i=>`
      <article class="timeline-item card">
        <div class="time">${i.time||"—"}</div>
        <div>
          <h3>${i.title}</h3>
          <p>${i.place||""}${i.note?`<br>${i.note}`:""}</p>
        </div>
      </article>`).join("")
    : `<article class="timeline-item card"><div class="time">—</div><div><h3>일정 준비 중</h3><p>Google Sheets에 일정을 추가하면 새로고침 후 자동 반영됩니다.</p></div></article>`;

  document.getElementById("dayDetail").innerHTML=
    `<article class="day-hero card">
      <p class="eyebrow">DAY ${d.day} · ${fmtDate(d.date)}</p>
      <h2>${d.title}</h2>
      <p class="muted">${d.city}</p>
    </article>
    <div class="timeline">${items}</div>`;
}

// Local guides / phrases
const guideList=document.getElementById("guideList");
Object.entries(data.guides||{}).forEach(([k,g])=>{
  const el=document.createElement("article");
  el.className="guide-card card";
  el.dataset.guide=k;
  el.innerHTML=`<h3>${g.title}</h3><p>${g.text}</p><a class="secondary" href="${g.map}" target="_blank" rel="noopener">지도 열기</a>`;
  guideList.appendChild(el);
});

const phraseList=document.getElementById("phraseList");
(data.phrases||[]).forEach(([ko,zh,roman])=>{
  const el=document.createElement("article");
  el.className="phrase-card card";
  el.innerHTML=`<div><p class="ko">${ko}</p><div class="zh">${zh}</div><small class="muted">${roman}</small></div><button class="copy-btn">복사</button>`;
  el.querySelector("button").onclick=async e=>{
    await navigator.clipboard.writeText(zh);
    e.currentTarget.textContent="복사됨";
    setTimeout(()=>e.currentTarget.textContent="복사",1000);
  };
  phraseList.appendChild(el);
});

async function loadSchedule(){
  const url=window.TRIP_CONFIG?.scheduleCsvUrl;
  if(!url){ renderAll(); return; }
  try{
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const rows=parseCSV(text);
    const remote=scheduleFromRows(rows);
    if(remote.length) data.days=remote;
  }catch(err){
    console.warn("Google Sheets schedule load failed; using local fallback.",err);
  }
  renderAll();
}

loadSchedule();

if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
