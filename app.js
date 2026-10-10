const data = window.LOCAL_TRIP_DATA;
const views = [...document.querySelectorAll(".view")];

let placeGuideData = [];
let expenseData = null;


// ===============================
// 화면 이동
// ===============================

function showView(id){

  views.forEach(
    v=>v.classList.toggle(
      "active",
      v.id===id
    )
  );

  document
    .querySelectorAll(".bottom-nav button")
    .forEach(
      b=>b.classList.toggle(
        "active",
        b.dataset.target===id
      )
    );

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}


document
  .querySelectorAll("[data-target]")
  .forEach(
    b=>b.addEventListener(
      "click",
      ()=>showView(
        b.dataset.target
      )
    )
  );


// ===============================
// CSV 읽기
// ===============================

function parseCSV(text){

  const rows=[];

  let row=[];
  let field="";
  let q=false;


  for(
    let i=0;
    i<text.length;
    i++
  ){

    const c=text[i];
    const n=text[i+1];


    if(c === '"'){

      if(
        q
        && n === '"'
      ){

        field+='"';
        i++;

      }else{

        q=!q;

      }


    }else if(
      c === ","
      && !q
    ){

      row.push(field);
      field="";


    }else if(
      (
        c === "\n"
        || c === "\r"
      )
      && !q
    ){

      if(
        c === "\r"
        && n === "\n"
      ){
        i++;
      }


      row.push(field);
      field="";


      if(
        row.some(
          v=>v.trim()!==""
        )
      ){

        rows.push(row);

      }


      row=[];


    }else{

      field+=c;

    }

  }


  if(
    field.length
    || row.length
  ){

    row.push(field);


    if(
      row.some(
        v=>v.trim()!==""
      )
    ){

      rows.push(row);

    }

  }


  return rows;

}


function normalizeHeader(h){

  return String(h||"")
    .trim()
    .replace(/\s+/g,"")
    .toLowerCase();

}


function getIndex(
  headers,
  ...names
){

  for(
    const name of names
  ){

    const i=
      headers.indexOf(
        normalizeHeader(name)
      );


    if(i>=0){
      return i;
    }

  }


  return -1;

}


// ===============================
// 일정 데이터
// ===============================

function scheduleFromRows(rows){

  if(!rows.length){
    return [];
  }


  const headers=
    rows[0].map(
      normalizeHeader
    );


  const iDate=
    getIndex(
      headers,
      "날짜"
    );

  const iDayTitle=
    getIndex(
      headers,
      "DAY 제목",
      "DAY제목",
      "day 제목",
      "day제목"
    );

  const iDay=
    getIndex(
      headers,
      "DAY",
      "day"
    );

  const iTime=
    getIndex(
      headers,
      "시간"
    );

  const iCity=
    getIndex(
      headers,
      "도시"
    );

  const iType=
    getIndex(
      headers,
      "구분"
    );

  const iTitle=
    getIndex(
      headers,
      "일정"
    );

  const iPlace=
    getIndex(
      headers,
      "장소"
    );

  const iMove=
    getIndex(
      headers,
      "이동수단"
    );

  const iMemo=
    getIndex(
      headers,
      "메모"
    );


  const grouped=
    new Map();


  rows
    .slice(1)
    .forEach(r=>{

      const date=
        (r[iDate]||"")
          .trim();

      const dayRaw=
        (r[iDay]||"")
          .trim();

      const title=
        (r[iTitle]||"")
          .trim();

      const dayTitle=
        iDayTitle>=0
          ? (r[iDayTitle]||"").trim()
          : "";


      if(
        !date
        && !dayRaw
        && !title
      ){
        return;
      }


      const m=
        dayRaw.match(
          /(\d+)/
        );


      const day=
        m
          ? Number(m[1])
          : null;


      if(!day){
        return;
      }


      const iso=
        date
          .replace(/\./g,"/")
          .replace(/-/g,"/");


      const parts=
        iso
          .split("/")
          .map(
            s=>s.trim()
          )
          .filter(Boolean);


      let isoDate=date;


      if(
        parts.length===3
      ){

        isoDate=
          `${parts[0]}-`
          +`${String(parts[1]).padStart(2,"0")}-`
          +`${String(parts[2]).padStart(2,"0")}`;

      }


      if(
        !grouped.has(day)
      ){

        grouped.set(
          day,
          {
            day,
            date:isoDate,

            city:
              (r[iCity]||"")
                .trim(),

            dayTitle:"",
            title:"",
            items:[]
          }
        );

      }


      const g=
        grouped.get(day);


      if(!g.city){

        g.city=
          (r[iCity]||"")
            .trim();

      }


      if(
        !g.dayTitle
        && dayTitle
      ){

        g.dayTitle=
          dayTitle;

      }


      const bits=[];


      if(
        iMove>=0
        && (r[iMove]||"").trim()
      ){

        bits.push(
          (r[iMove]||"")
            .trim()
        );

      }


      if(
        iMemo>=0
        && (r[iMemo]||"").trim()
      ){

        bits.push(
          (r[iMemo]||"")
            .trim()
        );

      }


      g.items.push({

        time:
          iTime>=0
            ? (r[iTime]||"").trim()
            : "",

        title:
          title
          || (
            iType>=0
              ? (r[iType]||"").trim()
              : "일정"
          ),

        place:
          iPlace>=0
            ? (r[iPlace]||"").trim()
            : "",

        note:
          bits
            .filter(Boolean)
            .join(" · ")

      });

    });


  return [
    ...grouped.values()
  ]

    .sort(
      (a,b)=>a.day-b.day
    )

    .map(g=>{

      const names=
        g.items
          .map(
            x=>x.title
          )
          .filter(Boolean);


      const autoTitle=
        names.length

          ? names
              .slice(0,3)
              .join(" · ")

          : "일정 준비 중";


      g.title=
        g.dayTitle
        || autoTitle;


      return g;

    });

}


// ===============================
// 장소 가이드 데이터
// ===============================

function placeGuideFromRows(rows){

  if(!rows.length){
    return [];
  }


  const headers=
    rows[0].map(
      normalizeHeader
    );


  const iDay=
    getIndex(
      headers,
      "DAY",
      "day"
    );

  const iName=
    getIndex(
      headers,
      "장소명"
    );

  const iIntro=
    getIndex(
      headers,
      "한줄소개"
    );

  const iDesc=
    getIndex(
      headers,
      "상세설명"
    );

  const iDuration=
    getIndex(
      headers,
      "체류시간"
    );

  const iCaution=
    getIndex(
      headers,
      "주의사항"
    );

  const iMap=
    getIndex(
      headers,
      "지도URL",
      "지도url"
    );

  const iImage=
    getIndex(
      headers,
      "이미지URL",
      "이미지url"
    );


  return rows
    .slice(1)
    .map(r=>{

      const dayRaw=
        (r[iDay]||"")
          .trim();


      const m=
        dayRaw.match(
          /(\d+)/
        );


      return {

        day:
          m
            ? Number(m[1])
            : null,

        name:
          iName>=0
            ? (r[iName]||"").trim()
            : "",

        intro:
          iIntro>=0
            ? (r[iIntro]||"").trim()
            : "",

        description:
          iDesc>=0
            ? (r[iDesc]||"").trim()
            : "",

        duration:
          iDuration>=0
            ? (r[iDuration]||"").trim()
            : "",

        caution:
          iCaution>=0
            ? (r[iCaution]||"").trim()
            : "",

        mapUrl:
          iMap>=0
            ? (r[iMap]||"").trim()
            : "",

        imageUrl:
          iImage>=0
            ? (r[iImage]||"").trim()
            : ""

      };

    })

    .filter(
      x=>x.day && x.name
    );

}


// ===============================
// 날짜
// ===============================

function fmtDate(iso){

  const d=
    new Date(
      iso+"T12:00:00"
    );


  if(
    Number.isNaN(
      d.getTime()
    )
  ){

    return iso;

  }


  return (
    `${d.getMonth()+1}`
    +`/${d.getDate()}`
  );

}


function getTodayDay(){

  const now=
    new Date();


  const localIso=
    `${now.getFullYear()}-`
    +`${String(now.getMonth()+1).padStart(2,"0")}-`
    +`${String(now.getDate()).padStart(2,"0")}`;


  return (
    data.days.find(
      d=>d.date===localIso
    )
    || null
  );

}


function getTripStart(){

  const firstDay=
    [...data.days]
      .sort(
        (a,b)=>a.day-b.day
      )[0];


  return firstDay

    ? new Date(
        firstDay.date
        +"T00:00:00"
      )

    : new Date(
        "2026-11-03T00:00:00"
      );

}


function getTripEnd(){

  const lastDay=
    [...data.days]
      .sort(
        (a,b)=>b.day-a.day
      )[0];


  return lastDay

    ? new Date(
        lastDay.date
        +"T23:59:59"
      )

    : new Date(
        "2026-11-09T23:59:59"
      );

}


function getDaysUntil(date){

  const now=
    new Date();


  const todayStart=
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  const targetStart=
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );


  return Math.ceil(
    (
      targetStart
      - todayStart
    )
    /
    (
      1000
      * 60
      * 60
      * 24
    )
  );

}


// ===============================
// 홈 / 전체 일정
// ===============================

function renderAll(){

  const overview=
    document.getElementById(
      "overviewList"
    );


  const tabs=
    document.getElementById(
      "dayTabs"
    );


  if(
    !overview
    || !tabs
  ){
    return;
  }


  overview.innerHTML="";
  tabs.innerHTML="";


  const todayDay=
    getTodayDay();


  const title=
    document.getElementById(
      "todayTitle"
    );


  const summary=
    document.getElementById(
      "todaySummary"
    );


  const now=
    new Date();


  const tripStart=
    getTripStart();


  const tripEnd=
    getTripEnd();


  if(
    title
    && summary
  ){

    // 여행 중
    if(todayDay){

      title.textContent=
        `DAY ${todayDay.day} · ${todayDay.title}`;


      if(
        todayDay.day===1
      ){

        summary.textContent=
          "드디어 여행 당일입니다 ✈️";

      }else{

        summary.textContent=
          `오늘은 ${todayDay.title}의 날입니다`;

      }


    // 여행 전
    }else if(
      now < tripStart
    ){

      const diff=
        getDaysUntil(
          tripStart
        );


      if(
        diff===0
      ){

        title.textContent=
          "오늘 출국합니다 ✈️";

      }else{

        title.textContent=
          `출국까지 D-${diff}`;

      }


      summary.textContent=
        "대만으로 떠납니다 ✈️";


    // 여행 종료
    }else if(
      now > tripEnd
    ){

      title.textContent=
        "대만 가족여행 완료";


      summary.textContent=
        "즐거운 여행이었기를 바랍니다 🇹🇼";


    }else{

      title.textContent=
        "오늘 일정 확인";


      summary.textContent=
        "오늘의 여행 일정을 확인해보세요.";

    }

  }


  data.days.forEach(d=>{

    const el=
      document.createElement(
        "button"
      );


    el.className=
      "overview-item card";


    el.innerHTML=`

      <div>

        <small>
          DAY ${d.day}
          ·
          ${fmtDate(d.date)}
        </small>

        <strong>
          ${d.title}
        </strong>

      </div>

      <span>
        ›
      </span>

    `;


    el.onclick=()=>{

      showView(
        "schedule"
      );

      renderDay(
        d.day
      );

    };


    overview.appendChild(
      el
    );


    const b=
      document.createElement(
        "button"
      );


    b.textContent=
      `DAY ${d.day}`;


    b.dataset.day=
      d.day;


    b.onclick=
      ()=>renderDay(
        d.day
      );


    tabs.appendChild(
      b
    );

  });


  const goTodayBtn=
    document.getElementById(
      "goTodayBtn"
    );


  if(goTodayBtn){

    goTodayBtn.onclick=()=>{

      showView(
        "schedule"
      );


      renderDay(
        todayDay?.day
        || data.days[0]?.day
        || 1
      );

    };

  }


  renderDay(
    todayDay?.day
    || data.days[0]?.day
    || 1
  );

}


// ===============================
// DAY 상세 일정
// ===============================

function renderDay(dayNo){

  const d=
    data.days.find(
      x=>x.day===dayNo
    )
    || data.days[0];


  if(!d){
    return;
  }


  document
    .querySelectorAll(
      "#dayTabs button"
    )
    .forEach(
      b=>
        b.classList.toggle(
          "active",
          Number(
            b.dataset.day
          )===d.day
        )
    );


  const items=
    d.items.length

      ? d.items
          .map(i=>`

            <article
              class="timeline-item card"
            >

              <div class="time">
                ${i.time||"—"}
              </div>

              <div>

                <h3>
                  ${i.title}
                </h3>

                <p>

                  ${i.place||""}

                  ${
                    i.note
                      ? `<br>${i.note.replace(/\n/g, "<br>")}`
                      : ""
                  }

                </p>

              </div>

            </article>

          `)
          .join("")

      : `

          <article
            class="timeline-item card"
          >

            <div class="time">
              —
            </div>

            <div>

              <h3>
                일정 준비 중
              </h3>

              <p>
                Google Sheets에
                일정을 추가하면
                새로고침 후 자동 반영됩니다.
              </p>

            </div>

          </article>

        `;


  const dayDetail=
    document.getElementById(
      "dayDetail"
    );


  if(dayDetail){

    dayDetail.innerHTML=`

      <article
        class="day-hero card"
      >

        <p class="eyebrow">

          DAY ${d.day}
          ·
          ${fmtDate(d.date)}

        </p>

        <h2>
          ${d.title}
        </h2>

        <p class="muted">
          ${d.city}
        </p>

      </article>


      <div class="timeline">

        ${items}

      </div>

    `;

  }

}


// ===============================
// 장소 가이드
// ===============================

function renderPlaceGuide(
  selectedDay
){

  const guideList=
    document.getElementById(
      "guideList"
    );


  if(!guideList){
    return;
  }


  if(
    !placeGuideData.length
  ){

    guideList.innerHTML=`

      <article class="card">

        <h3>
          장소 가이드 준비 중
        </h3>

        <p>
          PLACE_GUIDE 시트 내용을
          불러오지 못했습니다.
        </p>

      </article>

    `;

    return;

  }


  const days=
    [
      ...new Set(
        placeGuideData.map(
          x=>x.day
        )
      )
    ]
      .sort(
        (a,b)=>a-b
      );


  const day=
    selectedDay
    && days.includes(
      selectedDay
    )

      ? selectedDay

      : days[0];


  const tabs=
    days
      .map(d=>`

        <button
          class="${
            d===day
              ? "active"
              : ""
          }"
          data-guide-day="${d}"
        >

          DAY ${d}

        </button>

      `)
      .join("");


  const cards=
    placeGuideData

      .filter(
        x=>x.day===day
      )

      .map(g=>`

        <article
          class="guide-card card"
        >

          ${
            g.imageUrl

              ? `

                <img
                  src="${g.imageUrl}"
                  alt="${g.name}"
                  loading="lazy"
                  style="
                    width:100%;
                    border-radius:14px;
                    margin-bottom:14px;
                  "
                >

              `

              : ""
          }


          <p class="eyebrow">
            DAY ${g.day}
          </p>


          <h3>
            ${g.name}
          </h3>


          ${
            g.intro

              ? `

                <p>
                  <strong>
                    ${g.intro}
                  </strong>
                </p>

              `

              : ""
          }


          ${
            g.description

              ? `

                <p>
                  ${g.description}
                </p>

              `

              : ""
          }


          ${
            g.duration

              ? `

                <p>

                  <strong>
                    체류시간
                  </strong>

                  <br>

                  ${g.duration}

                </p>

              `

              : ""
          }


          ${
            g.caution

              ? `

                <p>

                  <strong>
                    주의사항
                  </strong>

                  <br>

                  ${g.caution}

                </p>

              `

              : ""
          }


          ${
            g.mapUrl

              ? `

                <a
                  class="secondary"
                  href="${g.mapUrl}"
                  target="_blank"
                  rel="noopener"
                >
                  지도 열기
                </a>

              `

              : ""
          }

        </article>

      `)
      .join("");


  guideList.innerHTML=`

    <div
      class="day-tabs"
      id="guideDayTabs"
    >

      ${tabs}

    </div>


    <div
      style="height:12px"
    ></div>


    ${cards}

  `;


  guideList
    .querySelectorAll(
      "[data-guide-day]"
    )
    .forEach(btn=>{

      btn.addEventListener(
        "click",
        ()=>renderPlaceGuide(
          Number(
            btn.dataset.guideDay
          )
        )
      );

    });

}


// ===============================
// 지출
// ===============================

function moneyNumber(value){

  const n=
    Number(
      String(
        value ?? ""
      )
        .replace(
          /[₩,\s]/g,
          ""
        )
        .replace(
          /[^\d.-]/g,
          ""
        )
    );


  return Number.isFinite(n)
    ? n
    : 0;

}


function formatWon(value){

  return (
    "₩"
    +
    Math.round(
      Number(value)||0
    )
      .toLocaleString(
        "ko-KR"
      )
  );

}


function expenseFromRows(rows){

  if(!rows.length){
    return null;
  }


  let exchangeRate=0;


  let totalBudget=
    window.TRIP_CONFIG
      ?.totalBudget
    || 5000000;


  let sheetSpent=0;
  let sheetRemaining=0;


  rows.forEach(row=>{

    row.forEach(
      (cell,index)=>{

        const label=
          String(cell||"")
            .trim();


        if(
          label.includes(
            "실시간 NT$1"
          )
        ){

          exchangeRate=
            moneyNumber(
              row[index+1]
            );

        }


        if(
          label.includes(
            "여행 예산"
          )
        ){

          totalBudget=
            moneyNumber(
              row[index+1]
            )
            || totalBudget;

        }


        if(
          label.includes(
            "지출 총합"
          )
        ){

          sheetSpent=
            moneyNumber(
              row[index+1]
            );

        }


        if(
          label.includes(
            "남은 예산"
          )
        ){

          sheetRemaining=
            moneyNumber(
              row[index+1]
            );

        }

      }
    );

  });


  const headerRowIndex=
    rows.findIndex(row=>{

      const headers=
        row.map(
          normalizeHeader
        );


      return (

        headers.includes(
          normalizeHeader(
            "날짜"
          )
        )

        &&

        headers.includes(
          normalizeHeader(
            "항목"
          )
        )

        &&

        headers.includes(
          normalizeHeader(
            "최종지출"
          )
        )

      );

    });


  if(
    headerRowIndex<0
  ){

    return {

      exchangeRate,

      totalBudget,

      spent:
        sheetSpent,

      remaining:
        sheetRemaining,

      items:[]

    };

  }


  const headers=
    rows[headerRowIndex]
      .map(
        normalizeHeader
      );


  const iDate=
    getIndex(
      headers,
      "날짜"
    );

  const iCategory=
    getIndex(
      headers,
      "구분"
    );

  const iItem=
    getIndex(
      headers,
      "항목"
    );

  const iCurrency=
    getIndex(
      headers,
      "통화"
    );

  const iUnitPrice=
    getIndex(
      headers,
      "단가"
    );

  const iQuantity=
    getIndex(
      headers,
      "수량",
      "인원/수량"
    );

  const iRate=
    getIndex(
      headers,
      "적용환율"
    );

  const iFinal=
    getIndex(
      headers,
      "최종지출"
    );

  const iStatus=
    getIndex(
      headers,
      "결제상태"
    );

  const iMemo=
    getIndex(
      headers,
      "메모"
    );


  const items=
    rows

      .slice(
        headerRowIndex+1
      )

      .map(r=>({

        date:
          iDate>=0
            ? (r[iDate]||"").trim()
            : "",

        category:
          iCategory>=0
            ? (r[iCategory]||"").trim()
            : "",

        item:
          iItem>=0
            ? (r[iItem]||"").trim()
            : "",

        currency:
          iCurrency>=0
            ? (r[iCurrency]||"").trim()
            : "",

        unitPrice:
          iUnitPrice>=0
            ? moneyNumber(
                r[iUnitPrice]
              )
            : 0,

        quantity:
          iQuantity>=0
            ? moneyNumber(
                r[iQuantity]
              )
            : 0,

        rate:
          iRate>=0
            ? moneyNumber(
                r[iRate]
              )
            : 0,

        final:
          iFinal>=0
            ? moneyNumber(
                r[iFinal]
              )
            : 0,

        status:
          iStatus>=0
            ? (r[iStatus]||"").trim()
            : "",

        memo:
          iMemo>=0
            ? (r[iMemo]||"").trim()
            : ""

      }))

      .filter(
        x=>x.item
      );


  const calculatedSpent=
    items.reduce(
      (
        sum,
        item
      )=>
        sum
        + item.final,
      0
    );


  const spent=
    sheetSpent
    || calculatedSpent;


  const remaining=
    sheetRemaining
    || (
      totalBudget
      - spent
    );


  return {

    exchangeRate,

    totalBudget,

    spent,

    remaining,

    items

  };

}


function renderExpenses(){

  if(!expenseData){
    return;
  }


  let expenseView=

    document.getElementById(
      "expense"
    )

    ||

    document.getElementById(
      "expenses"
    )

    ||

    document.getElementById(
      "budget"
    );


  if(!expenseView){

    expenseView=
      [
        ...document.querySelectorAll(
          ".view"
        )
      ]
        .find(
          v=>
            v.textContent.includes(
              "지출"
            )
        );

  }


  if(!expenseView){

    console.warn(
      "지출현황 화면을 찾지 못했습니다."
    );

    return;

  }


  const {
    exchangeRate,
    totalBudget,
    spent,
    remaining,
    items
  }=
    expenseData;


  const itemHTML=
    items.length

      ? items
          .map(item=>`

            <article
              class="card"
              style="
                margin-bottom:12px;
                padding:16px;
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:16px;
                  align-items:flex-start;
                "
              >

                <div
                  style="
                    min-width:0;
                  "
                >

                  <div
                    style="
                      font-size:12px;
                      opacity:.6;
                      margin-bottom:5px;
                    "
                  >

                    ${item.date||""}

                    ${
                      item.category
                        ? ` · ${item.category}`
                        : ""
                    }

                  </div>


                  <strong
                    style="
                      display:block;
                      font-size:16px;
                      margin-bottom:5px;
                    "
                  >

                    ${item.item}

                  </strong>


                  ${
                    item.currency==="NT$"

                      ? `

                        <div
                          style="
                            font-size:12px;
                            opacity:.65;
                            margin-bottom:4px;
                          "
                        >

                          NT$${item.unitPrice.toLocaleString()}
                          ×
                          ${item.quantity||1}

                        </div>

                      `

                      : ""
                  }


                  ${
                    item.status

                      ? `

                        <span
                          style="
                            font-size:12px;
                            opacity:.65;
                          "
                        >

                          ${item.status}

                        </span>

                      `

                      : ""
                  }


                  ${
                    item.memo

                      ? `

                        <div
                          style="
                            font-size:12px;
                            opacity:.65;
                            margin-top:5px;
                          "
                        >

                          ${item.memo}

                        </div>

                      `

                      : ""
                  }

                </div>


                <strong
                  style="
                    white-space:nowrap;
                    font-size:16px;
                  "
                >

                  ${formatWon(item.final)}

                </strong>

              </div>

            </article>

          `)
          .join("")

      : `

          <article class="card">

            <p>
              아직 등록된 지출이 없습니다.
            </p>

          </article>

        `;


  expenseView.innerHTML=`

    <div
      style="
        padding-bottom:24px;
      "
    >

      <p class="eyebrow">
        TAIWAN FAMILY TRIP
      </p>


      <h2
        style="
          margin-bottom:18px;
        "
      >

        지출 현황

      </h2>


      <div
        class="card"
        style="
          padding:18px;
          margin-bottom:14px;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:16px;
          "
        >

          <div>

            <div
              style="
                font-size:12px;
                opacity:.6;
                margin-bottom:5px;
              "
            >

              총 예산

            </div>


            <strong
              style="
                font-size:21px;
              "
            >

              ${formatWon(totalBudget)}

            </strong>

          </div>


          <div
            style="
              text-align:right;
            "
          >

            <div
              style="
                font-size:12px;
                opacity:.6;
                margin-bottom:5px;
              "
            >

              현재 대만 환율

            </div>


            <strong
              style="
                font-size:17px;
                color:#e53935;
              "
            >

              NT$1 = ₩${
                exchangeRate

                  ? exchangeRate
                      .toFixed(2)

                  : "-"
              }

            </strong>

          </div>

        </div>

      </div>


      <div
        style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-bottom:22px;
        "
      >

        <div
          class="card"
          style="
            padding:16px;
          "
        >

          <div
            style="
              font-size:12px;
              opacity:.6;
              margin-bottom:5px;
            "
          >

            현재 지출

          </div>


          <strong
            style="
              font-size:19px;
            "
          >

            ${formatWon(spent)}

          </strong>

        </div>


        <div
          class="card"
          style="
            padding:16px;
          "
        >

          <div
            style="
              font-size:12px;
              opacity:.6;
              margin-bottom:5px;
            "
          >

            남은 예산

          </div>


          <strong
            style="
              font-size:19px;
            "
          >

            ${formatWon(remaining)}

          </strong>

        </div>

      </div>


      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:end;
          margin-bottom:10px;
        "
      >

        <h3
          style="
            margin:0;
          "
        >

          지출 내역

        </h3>


        <span
          style="
            font-size:12px;
            opacity:.55;
          "
        >

          ${items.length}개 항목

        </span>

      </div>


      ${itemHTML}

    </div>

  `;

}


// ===============================
// 중국어 음성
// ===============================

function speakChinese(text){

  if(
    !("speechSynthesis" in window)
  ){

    alert(
      "이 기기에서는 음성 재생을 지원하지 않습니다."
    );

    return;

  }


  window
    .speechSynthesis
    .cancel();


  const utterance=
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang=
    "zh-TW";


  utterance.rate=
    0.85;


  utterance.pitch=
    1;


  const voices=
    window
      .speechSynthesis
      .getVoices();


  const taiwanVoice=
    voices.find(
      voice=>
        voice.lang
          .toLowerCase()
          .includes(
            "zh-tw"
          )
    );


  if(taiwanVoice){

    utterance.voice=
      taiwanVoice;

  }


  window
    .speechSynthesis
    .speak(
      utterance
    );

}


// ===============================
// 여행 회화
// ===============================

function renderPhrases(){

  const phraseList=
    document.getElementById(
      "phraseList"
    );


  if(!phraseList){
    return;
  }


  phraseList.innerHTML="";


  (
    data.phrases
    || []
  )
    .forEach(
      ([ko,zh,roman])=>{

        const el=
          document.createElement(
            "article"
          );


        el.className=
          "phrase-card card";


        el.innerHTML=`

          <div
            style="
              flex:1;
              min-width:0;
            "
          >

            <p class="ko">
              ${ko}
            </p>


            <div class="zh">
              ${zh}
            </div>


            <small class="muted">
              ${roman}
            </small>

          </div>


          <div
            style="
              display:flex;
              flex-direction:column;
              gap:7px;
              flex-shrink:0;
            "
          >

            <button
              class="speak-btn"
              type="button"
            >
              🔊 듣기
            </button>


            <button
              class="copy-btn"
              type="button"
            >
              복사
            </button>

          </div>

        `;


        const speakBtn=
          el.querySelector(
            ".speak-btn"
          );


        const copyBtn=
          el.querySelector(
            ".copy-btn"
          );


        speakBtn.onclick=()=>{

          speakChinese(
            zh
          );

        };


        copyBtn.onclick=
          async e=>{

            try{

              await navigator
                .clipboard
                .writeText(
                  zh
                );


              e.currentTarget
                .textContent=
                  "복사됨";


              setTimeout(
                ()=>{
                  e.currentTarget
                    .textContent=
                      "복사";
                },
                1000
              );


            }catch(err){

              console.warn(
                "복사 실패",
                err
              );

            }

          };


        phraseList
          .appendChild(
            el
          );

      }
    );

}


// ===============================
// Google Sheets 로드
// ===============================

async function loadCSV(url){

  const res=
    await fetch(
      url,
      {
        cache:"no-store"
      }
    );


  if(!res.ok){

    throw new Error(
      `HTTP ${res.status}`
    );

  }


  return await res.text();

}


async function loadAllData(){

  const scheduleUrl=
    window.TRIP_CONFIG
      ?.scheduleCsvUrl;


  const placeGuideUrl=
    window.TRIP_CONFIG
      ?.placeGuideCsvUrl;


  const expenseUrl=
    window.TRIP_CONFIG
      ?.expenseCsvUrl;


  // 일정
  if(scheduleUrl){

    try{

      const text=
        await loadCSV(
          scheduleUrl
        );


      const remote=
        scheduleFromRows(
          parseCSV(text)
        );


      if(remote.length){

        data.days=
          remote;

      }


    }catch(err){

      console.warn(
        "Google Sheets schedule load failed; using local fallback.",
        err
      );

    }

  }


  // 장소 가이드
  if(placeGuideUrl){

    try{

      const text=
        await loadCSV(
          placeGuideUrl
        );


      placeGuideData=
        placeGuideFromRows(
          parseCSV(text)
        );


    }catch(err){

      console.warn(
        "Google Sheets place guide load failed.",
        err
      );

    }

  }


  // 지출
  if(expenseUrl){

    try{

      const text=
        await loadCSV(
          expenseUrl
        );


      expenseData=
        expenseFromRows(
          parseCSV(text)
        );


    }catch(err){

      console.warn(
        "Google Sheets expense load failed.",
        err
      );

    }

  }


  renderAll();

  renderPlaceGuide(1);

  renderExpenses();

  renderPhrases();

}


// ===============================
// 시작
// ===============================

loadAllData();


if(
  "serviceWorker"
  in navigator
){

  navigator
    .serviceWorker
    .register(
      "./sw.js"
    );

}
/* =========================================================
   WEB_EMERGENCY · 긴급/안전 정보
   ========================================================= */

(async function loadEmergencyInfo() {

  const url = window.TRIP_CONFIG?.emergencyCsvUrl;

  if (!url) {
    console.log("emergencyCsvUrl이 없습니다.");
    return;
  }


  /* CSV 읽기 */
  function parseEmergencyCSV(text) {

    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {

      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !quoted) {

        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(cell.trim());

        if (row.some(value => value !== "")) {
          rows.push(row);
        }

        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    row.push(cell.trim());

    if (row.some(value => value !== "")) {
      rows.push(row);
    }

    if (!rows.length) {
      return [];
    }

    const headers = rows[0];

    return rows.slice(1).map(values => {

      const obj = {};

      headers.forEach((header, index) => {
        obj[header.trim()] = (values[index] || "").trim();
      });

      return obj;

    }).filter(item => item["제목"]);

  }


  /* 이모지 열이 없어도 자동으로 붙임 */
  function getEmoji(item) {

    if (item["이모지"]) {
      return item["이모지"];
    }

    const text =
      `${item["구분"] || ""} ${item["제목"] || ""}`;

    if (text.includes("여권")) return "🛂";
    if (text.includes("대표부") || text.includes("대사관")) return "🇰🇷";
    if (text.includes("경찰")) return "👮";
    if (text.includes("소방") || text.includes("구급") || text.includes("응급")) return "🚑";
    if (text.includes("긴급")) return "🆘";
    if (text.includes("관광")) return "ℹ️";
    if (
      text.includes("태풍") ||
      text.includes("지진") ||
      text.includes("자연재해")
    ) return "🌪️";

    return "📌";
  }


  /* HTML 안전 처리 */
  function escapeHTML(value = "") {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  /* 화면에 출력 */
  function renderEmergency(items) {

    const infoView = document.querySelector("#info");

    if (!infoView) {
      return;
    }


    /* 이미 한 번 생성됐다면 제거 */
    document
      .querySelector("#emergencySection")
      ?.remove();


    const section = document.createElement("div");

    section.id = "emergencySection";

    section.innerHTML = `

      <div class="section-head emergency-heading">
        <div>
          <p class="eyebrow">EMERGENCY</p>
          <h2>긴급 · 안전 정보</h2>
          <p class="emergency-sub">
            여행 중 문제가 생겼을 때 바로 확인하세요.
          </p>
        </div>
      </div>

      <div class="stack emergency-list">

        ${items.map(item => {

          const emoji = getEmoji(item);

          const title =
            escapeHTML(item["제목"]);

          const description =
            escapeHTML(item["설명"]);

          const phone =
            escapeHTML(item["전화번호"]);

          const hours =
            escapeHTML(item["운영시간"]);

          const action =
            escapeHTML(item["행동요령"]);

          const link =
            item["링크"] || "";

          const phoneLink =
            String(item["전화번호"] || "")
              .replace(/[^0-9+]/g, "");


          return `

            <article class="card info-card emergency-card">

              <div class="emergency-title">

                <span class="emergency-emoji">
                  ${emoji}
                </span>

                <div>
                  <h3>${title}</h3>

                  ${
                    description
                      ? `<p class="emergency-description">${description}</p>`
                      : ""
                  }
                </div>

              </div>


              ${
                phone
                  ? `
                    <a
                      class="emergency-phone"
                      href="tel:${phoneLink}"
                    >
                      📞 ${phone}
                    </a>
                  `
                  : ""
              }


              ${
                hours
                  ? `
                    <p class="emergency-meta">
                      <strong>운영시간</strong>
                      ${hours}
                    </p>
                  `
                  : ""
              }


              ${
                action
                  ? `
                    <div class="emergency-action">
                      <strong>이렇게 하세요</strong>
                      <p>${action}</p>
                    </div>
                  `
                  : ""
              }


              ${
                /^https?:\/\//i.test(link)
                  ? `
                    <a
                      class="emergency-link"
                      href="${escapeHTML(link)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      관련 정보 보기 →
                    </a>
                  `
                  : ""
              }

            </article>

          `;

        }).join("")}

      </div>

    `;


    /* 숙소 정보 아래에 긴급정보 추가 */
    infoView.appendChild(section);

  }


  /* 필요한 CSS도 JS에서 자동 추가 */
  function addEmergencyStyle() {

    if (document.querySelector("#emergencyStyle")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "emergencyStyle";

    style.textContent = `

      #emergencySection {
        margin-top: 34px;
        padding-bottom: 20px;
      }

      .emergency-heading {
        margin-bottom: 14px;
      }

      .emergency-sub {
        margin: 5px 0 0;
        font-size: 14px;
        opacity: 0.65;
      }

      .emergency-card {
        padding: 20px;
      }

      .emergency-title {
        display: flex;
        align-items: flex-start;
        gap: 13px;
      }

      .emergency-title h3 {
        margin: 0;
      }

      .emergency-emoji {
        flex-shrink: 0;
        font-size: 27px;
        line-height: 1;
      }

      .emergency-description {
        margin: 6px 0 0;
        font-size: 14px;
        line-height: 1.55;
        opacity: 0.7;
      }

      .emergency-phone {
        display: block;
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(31, 95, 82, 0.09);
        color: #1f5f52;
        font-size: 17px;
        font-weight: 700;
        text-decoration: none;
      }

      .emergency-meta {
        margin: 14px 0 0;
        font-size: 13px;
        opacity: 0.7;
      }

      .emergency-meta strong {
        margin-right: 6px;
      }

      .emergency-action {
        margin-top: 14px;
        padding: 14px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.035);
      }

      .emergency-action strong {
        display: block;
        margin-bottom: 5px;
        font-size: 13px;
      }

      .emergency-action p {
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
      }

      .emergency-link {
        display: inline-block;
        margin-top: 14px;
        color: #1f5f52;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }

    `;

    document.head.appendChild(style);

  }


  try {

    /* Google Sheets 캐시 방지 */
    const separator =
      url.includes("?") ? "&" : "?";

    const response = await fetch(
      `${url}${separator}v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const text =
      await response.text();

    const items =
      parseEmergencyCSV(text);


    if (!items.length) {

      console.log(
        "WEB_EMERGENCY 데이터가 없습니다."
      );

      return;

    }


    addEmergencyStyle();

    renderEmergency(items);


  } catch (error) {

    console.error(
      "WEB_EMERGENCY 불러오기 실패:",
      error
    );

  }

})();
/* =========================================================
   WEB_PHRASES · 여행 회화
   Google Sheets 연동 + 상황별 탭 + TTS + 복사
   ========================================================= */

(function () {

  const PHRASES_URL = window.TRIP_CONFIG?.phrasesCsvUrl;

  if (!PHRASES_URL) {
    console.log("phrasesCsvUrl이 없습니다.");
    return;
  }


  /* =========================
     CSV 읽기
  ========================= */

  function parsePhrasesCSV(text) {

    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {

      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !quoted) {

        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(cell.trim());

        if (row.some(value => value !== "")) {
          rows.push(row);
        }

        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    row.push(cell.trim());

    if (row.some(value => value !== "")) {
      rows.push(row);
    }


    if (!rows.length) {
      return [];
    }


    const headers = rows[0].map(header => header.trim());


    return rows
      .slice(1)
      .map(values => {

        const item = {};

        headers.forEach((header, index) => {
          item[header] = (values[index] || "").trim();
        });

        return item;

      })
      .filter(item =>
        item["한국어"] &&
        item["중국어"]
      );

  }



  /* =========================
     HTML 안전 처리
  ========================= */

  function escapePhraseHTML(value = "") {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }



  /* =========================
     중국어 듣기
  ========================= */

  function speakPhrase(chinese) {

    if (!("speechSynthesis" in window)) {
      alert("이 기기에서는 음성 재생을 지원하지 않습니다.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(chinese);

    utterance.lang = "zh-TW";
    utterance.rate = 0.82;
    utterance.pitch = 1;

    const voices =
      window.speechSynthesis.getVoices();

    const taiwanVoice =
      voices.find(voice =>
        voice.lang?.toLowerCase().includes("zh-tw")
      );

    if (taiwanVoice) {
      utterance.voice = taiwanVoice;
    }

    window.speechSynthesis.speak(utterance);

  }



  /* =========================
     복사
  ========================= */

  async function copyPhrase(item) {

    const text = [
      item["한국어"],
      item["중국어"],
      item["병음"] || "",
      item["한글발음"] || ""
    ]
      .filter(Boolean)
      .join("\n");


    try {

      await navigator.clipboard.writeText(text);

      alert("문장을 복사했습니다.");

    } catch (error) {

      console.error(error);

      alert("복사하지 못했습니다.");

    }

  }



  /* =========================
     스타일
  ========================= */

  function addPhraseStyles() {

    if (document.querySelector("#webPhrasesStyle")) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = "webPhrasesStyle";

    style.textContent = `

      .phrase-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 2px 0 12px;
        margin-bottom: 8px;
        scrollbar-width: none;
      }

      .phrase-tabs::-webkit-scrollbar {
        display: none;
      }

      .phrase-tab {
        flex: 0 0 auto;
        border: 0;
        border-radius: 999px;
        padding: 9px 14px;
        background: rgba(31,95,82,0.08);
        color: #1f5f52;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .phrase-tab.active {
        background: #1f5f52;
        color: white;
      }

      .phrase-card {
        padding: 20px;
      }

      .phrase-korean {
        margin: 0 0 9px;
        font-size: 17px;
        font-weight: 700;
      }

      .phrase-chinese {
        margin: 0;
        font-size: 25px;
        font-weight: 700;
        line-height: 1.35;
      }

      .phrase-pinyin {
        margin: 7px 0 0;
        font-size: 15px;
        font-style: italic;
        opacity: 0.67;
      }

      .phrase-korean-pronunciation {
        margin: 5px 0 0;
        font-size: 14px;
        opacity: 0.72;
      }

      .phrase-note {
        margin: 10px 0 0;
        font-size: 13px;
        opacity: 0.62;
      }

      .phrase-actions {
        display: flex;
        gap: 8px;
        margin-top: 15px;
      }

      .phrase-action-btn {
        flex: 1;
        border: 0;
        border-radius: 12px;
        padding: 11px 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .phrase-listen-btn {
        background: rgba(31,95,82,0.10);
        color: #1f5f52;
      }

      .phrase-copy-btn {
        background: rgba(0,0,0,0.055);
        color: inherit;
      }

    `;

    document.head.appendChild(style);

  }



  /* =========================
     카드 출력
  ========================= */

  function createPhraseCard(item) {

    const korean =
      escapePhraseHTML(item["한국어"]);

    const chinese =
      escapePhraseHTML(item["중국어"]);

    const pinyin =
      escapePhraseHTML(item["병음"]);

    const pronunciation =
      escapePhraseHTML(item["한글발음"]);

    const note =
      escapePhraseHTML(item["메모"]);


    const article =
      document.createElement("article");

    article.className =
      "card phrase-card";


    article.innerHTML = `

      <p class="phrase-korean">
        ${korean}
      </p>

      <p class="phrase-chinese">
        ${chinese}
      </p>

      ${
        pinyin
          ? `
            <p class="phrase-pinyin">
              ${pinyin}
            </p>
          `
          : ""
      }

      ${
        pronunciation
          ? `
            <p class="phrase-korean-pronunciation">
              ${pronunciation}
            </p>
          `
          : ""
      }

      ${
        note
          ? `
            <p class="phrase-note">
              ${note}
            </p>
          `
          : ""
      }

      <div class="phrase-actions">

        <button
          type="button"
          class="phrase-action-btn phrase-listen-btn"
        >
          🔊 듣기
        </button>

        <button
          type="button"
          class="phrase-action-btn phrase-copy-btn"
        >
          📋 복사
        </button>

      </div>

    `;


    article
      .querySelector(".phrase-listen-btn")
      .addEventListener(
        "click",
        () => speakPhrase(item["중국어"])
      );


    article
      .querySelector(".phrase-copy-btn")
      .addEventListener(
        "click",
        () => copyPhrase(item)
      );


    return article;

  }



  /* =========================
     화면 출력
  ========================= */

  function renderWebPhrases(items) {

    const phraseList =
      document.querySelector("#phraseList");

    if (!phraseList) {
      return;
    }


    /* 기존 data.js 회화 삭제 */
    phraseList.innerHTML = "";


    /* 기존 탭이 있으면 삭제 */
    document
      .querySelector("#phraseCategoryTabs")
      ?.remove();


    /* 시트에 적힌 순서대로 카테고리 생성 */
    const categories = [];

    items.forEach(item => {

      const category =
        item["구분"] || "기타";

      if (!categories.includes(category)) {
        categories.push(category);
      }

    });


    const allCategories =
      ["전체", ...categories];


    /* 탭 만들기 */
    const tabs =
      document.createElement("div");

    tabs.id =
      "phraseCategoryTabs";

    tabs.className =
      "phrase-tabs";


    allCategories.forEach((category, index) => {

      const button =
        document.createElement("button");

      button.type =
        "button";

      button.className =
        `phrase-tab ${index === 0 ? "active" : ""}`;

      button.textContent =
        category;


      button.addEventListener(
        "click",
        () => {

          tabs
            .querySelectorAll(".phrase-tab")
            .forEach(tab =>
              tab.classList.remove("active")
            );

          button
            .classList
            .add("active");


          drawCards(category);

        }
      );


      tabs.appendChild(button);

    });


    phraseList.before(tabs);



    /* 카드 그리기 */
    function drawCards(category) {

      phraseList.innerHTML = "";


      const filtered =
        category === "전체"
          ? items
          : items.filter(
              item =>
                (item["구분"] || "기타") === category
            );


      filtered.forEach(item => {

        phraseList.appendChild(
          createPhraseCard(item)
        );

      });

    }


    drawCards("전체");

  }



  /* =========================
     Google Sheets 불러오기
  ========================= */

  async function loadWebPhrases() {

    try {

      const separator =
        PHRASES_URL.includes("?")
          ? "&"
          : "?";


      const response =
        await fetch(
          `${PHRASES_URL}${separator}v=${Date.now()}`,
          {
            cache: "no-store"
          }
        );


      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status}`
        );

      }


      const text =
        await response.text();


      const items =
        parsePhrasesCSV(text);


      if (!items.length) {

        console.log(
          "WEB_PHRASES 데이터가 없습니다."
        );

        return;

      }


      addPhraseStyles();

      renderWebPhrases(items);


    } catch (error) {

      console.error(
        "WEB_PHRASES 불러오기 실패:",
        error
      );

    }

  }



  /* 기존 app.js 초기화가 끝난 뒤 실행 */
  window.addEventListener(
    "load",
    () => {

      setTimeout(
        loadWebPhrases,
        300
      );

    }
  );

})();
