
const data = window.LOCAL_TRIP_DATA;
const views = [...document.querySelectorAll(".view")];
let placeGuideData = [];

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
  const rows=[]; let row=[], field="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"'){
      if(q && n === '"'){ field+='"'; i++; } else q=!q;
    }else if(c === ',' && !q){
      row.push(field); field="";
    }else if((c === '\n' || c === '\r') && !q){
      if(c === '\r' && n === '\n') i++;
      row.push(field); field="";
      if(row.some(v=>v.trim()!=="")) rows.push(row);
      row=[];
    }else{
      field+=c;
    }
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
function getIndex(headers,...names){
  for(const name of names){
    const i=headers.indexOf(normalizeHeader(name));
    if(i>=0) return i;
  }
  return -1;
}

function scheduleFromRows(rows){
  if(!rows.length) return [];
  const headers=rows[0].map(normalizeHeader);
  const iDate=getIndex(headers,"날짜");
  const iDay=getIndex(headers,"DAY","day");
  const iTime=getIndex(headers,"시간");
  const iCity=getIndex(headers,"도시");
  const iType=getIndex(headers,"구분");
  const iTitle=getIndex(headers,"일정");
  const iPlace=getIndex(headers,"장소");
  const iMove=getIndex(headers,"이동수단");
  const iMemo=getIndex(headers,"메모");

  const grouped=new Map();

  rows.slice(1).forEach(r=>{
    const date=(r[iDate]||"").trim();
    const dayRaw=(r[iDay]||"").trim();
    const title=(r[iTitle]||"").trim();
    if(!date && !dayRaw && !title) return;

    const m=dayRaw.match(/(\d+)/);
    const day=m ? Number(m[1]) : null;
    if(!day) return;

    const iso=date.replace(/\./g,"/").replace(/-/g,"/");
    const parts=iso.split("/").map(s=>s.trim()).filter(Boolean);
    let isoDate=date;
    if(parts.length===3){
      isoDate=`${parts[0]}-${String(parts[1]).padStart(2,"0")}-${String(parts[2]).padStart(2,"0")}`;
    }

    if(!grouped.has(day)){
      grouped.set(day,{
        day,
        date:isoDate,
        city:(r[iCity]||"").trim(),
        title:"",
        items:[]
      });
    }

    const g=grouped.get(day);
    if(!g.city) g.city=(r[iCity]||"").trim();

    const bits=[];
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

function placeGuideFromRows(rows){
  if(!rows.length) return [];
  const headers=rows[0].map(normalizeHeader);

  const iDay=getIndex(headers,"DAY","day");
  const iName=getIndex(headers,"장소명");
  const iIntro=getIndex(headers,"한줄소개");
  const iDesc=getIndex(headers,"상세설명");
  const iDuration=getIndex(headers,"체류시간");
  const iCaution=getIndex(headers,"주의사항");
  const iMap=getIndex(headers,"지도URL","지도url");
  const iImage=getIndex(headers,"이미지URL","이미지url");

  return rows.slice(1).map(r=>{
    const dayRaw=(r[iDay]||"").trim();
    const m=dayRaw.match(/(\d+)/);
    return {
      day:m ? Number(m[1]) : null,
      name:iName>=0 ? (r[iName]||"").trim() : "",
      intro:iIntro>=0 ? (r[iIntro]||"").trim() : "",
      description:iDesc>=0 ? (r[iDesc]||"").trim() : "",
      duration:iDuration>=0 ? (r[iDuration]||"").trim() : "",
      caution:iCaution>=0 ? (r[iCaution]||"").trim() : "",
      mapUrl:iMap>=0 ? (r[iMap]||"").trim() : "",
      imageUrl:iImage>=0 ? (r[iImage]||"").trim() : ""
    };
  }).filter(x=>x.day && x.name);
}

function fmtDate(iso){
  const d=new Date(iso+"T12:00:00");
  if(Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function getTodayDay(){
  const now=new Date();
  const localIso=
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  return data.days.find(d=>d.date===localIso)||null;
}

function getTripStart(){
  const firstDay=[...data.days].sort((a,b)=>a.day-b.day)[0];
  return firstDay ? new Date(firstDay.date+"T00:00:00") : new Date("2026-11-03T00:00:00");
}
function getTripEnd(){
  const lastDay=[...data.days].sort((a,b)=>b.day-a.day)[0];
  return lastDay ? new Date(lastDay.date+"T23:59:59") : new Date("2026-11-09T23:59:59");
}
function getDaysUntil(date){
  const now=new Date();
  const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const targetStart=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  return Math.ceil((targetStart-todayStart)/(1000*60*60*24));
}

function renderAll(){
  const overview=document.getElementById("overviewList");
  const tabs=document.getElementById("dayTabs");
  overview.innerHTML="";
  tabs.innerHTML="";

  const todayDay=getTodayDay();
  const title=document.getElementById("todayTitle");
  const summary=document.getElementById("todaySummary");
  const now=new Date();
  const tripStart=getTripStart();
  const tripEnd=getTripEnd();

  if(todayDay){
    title.textContent=`DAY ${todayDay.day} · ${todayDay.title}`;
    summary.textContent=`${fmtDate(todayDay.date)} · ${todayDay.city}`;
  }else if(now < tripStart){
    const diff=getDaysUntil(tripStart);
    title.textContent=diff===0 ? "오늘 출국합니다 ✈️" : `출국까지 D-${diff}`;
    summary.textContent=diff===0 ? "대만 가족여행 D-DAY" : `대만 가족여행까지 ${diff}일 남았습니다 ✈️`;
  }else if(now > tripEnd){
    title.textContent="대만 가족여행 완료";
    summary.textContent="즐거운 여행이었기를 바랍니다 🇹🇼";
  }else{
    title.textContent="오늘 일정 확인";
    summary.textContent="오늘의 여행 일정을 확인해보세요.";
  }

  data.days.forEach(d=>{
    const el=document.createElement("button");
    el.className="overview-item card";
    el.innerHTML=`
      <div>
        <small>DAY ${d.day} · ${fmtDate(d.date)}</small>
        <strong>${d.title}</strong>
      </div>
      <span>›</span>
    `;
    el.onclick=()=>{ showView("schedule"); renderDay(d.day); };
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
          <p>${i.place||""}${i.note ? `<br>${i.note}` : ""}</p>
        </div>
      </article>
    `).join("")
    : `
      <article class="timeline-item card">
        <div class="time">—</div>
        <div>
          <h3>일정 준비 중</h3>
          <p>Google Sheets에 일정을 추가하면 새로고침 후 자동 반영됩니다.</p>
        </div>
      </article>
    `;

  document.getElementById("dayDetail").innerHTML=`
    <article class="day-hero card">
      <p class="eyebrow">DAY ${d.day} · ${fmtDate(d.date)}</p>
      <h2>${d.title}</h2>
      <p class="muted">${d.city}</p>
    </article>
    <div class="timeline">${items}</div>
  `;
}

function renderPlaceGuide(selectedDay){
  const guideList=document.getElementById("guideList");
  if(!guideList) return;

  if(!placeGuideData.length){
    guideList.innerHTML=`
      <article class="card">
        <h3>장소 가이드 준비 중</h3>
        <p>PLACE_GUIDE 시트 내용을 불러오지 못했습니다.</p>
      </article>
    `;
    return;
  }

  const days=[...new Set(placeGuideData.map(x=>x.day))].sort((a,b)=>a-b);
  const day=selectedDay && days.includes(selectedDay) ? selectedDay : days[0];

  const tabs=days.map(d=>`
    <button class="${d===day ? "active" : ""}" data-guide-day="${d}">
      DAY ${d}
    </button>
  `).join("");

  const cards=placeGuideData
    .filter(x=>x.day===day)
    .map(g=>`
      <article class="guide-card card">
        ${g.imageUrl ? `<img src="${g.imageUrl}" alt="${g.name}" loading="lazy" style="width:100%;border-radius:14px;margin-bottom:14px;">` : ""}
        <p class="eyebrow">DAY ${g.day}</p>
        <h3>${g.name}</h3>
        ${g.intro ? `<p><strong>${g.intro}</strong></p>` : ""}
        ${g.description ? `<p>${g.description}</p>` : ""}
        ${g.duration ? `<p><strong>체류시간</strong><br>${g.duration}</p>` : ""}
        ${g.caution ? `<p><strong>주의사항</strong><br>${g.caution}</p>` : ""}
        ${g.mapUrl ? `<a class="secondary" href="${g.mapUrl}" target="_blank" rel="noopener">지도 열기</a>` : ""}
      </article>
    `).join("");

  guideList.innerHTML=`
    <div class="day-tabs" id="guideDayTabs">${tabs}</div>
    <div style="height:12px"></div>
    ${cards}
  `;

  guideList.querySelectorAll("[data-guide-day]").forEach(btn=>{
    btn.addEventListener("click",()=>renderPlaceGuide(Number(btn.dataset.guideDay)));
  });
}

const phraseList=document.getElementById("phraseList");
(data.phrases||[]).forEach(([ko,zh,roman])=>{
  const el=document.createElement("article");
  el.className="phrase-card card";
  el.innerHTML=`
    <div>
      <p class="ko">${ko}</p>
      <div class="zh">${zh}</div>
      <small class="muted">${roman}</small>
    </div>
    <button class="copy-btn">복사</button>
  `;
  el.querySelector("button").onclick=async e=>{
    await navigator.clipboard.writeText(zh);
    e.currentTarget.textContent="복사됨";
    setTimeout(()=>e.currentTarget.textContent="복사",1000);
  };
  phraseList.appendChild(el);
});

async function loadCSV(url){
  const res=await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function loadAllData(){
  const scheduleUrl=window.TRIP_CONFIG?.scheduleCsvUrl;
  const placeGuideUrl=window.TRIP_CONFIG?.placeGuideCsvUrl;

  if(scheduleUrl){
    try{
      const text=await loadCSV(scheduleUrl);
      const remote=scheduleFromRows(parseCSV(text));
      if(remote.length) data.days=remote;
    }catch(err){
      console.warn("Google Sheets schedule load failed; using local fallback.",err);
    }
  }

  if(placeGuideUrl){
    try{
      const text=await loadCSV(placeGuideUrl);
      placeGuideData=placeGuideFromRows(parseCSV(text));
    }catch(err){
      console.warn("Google Sheets place guide load failed.",err);
    }
  }

  renderAll();
  renderPlaceGuide(1);
}

loadAllData();

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js");
}
