/* =========================================================
   DAY 한줄설명 + 지역 pill
   WEB_SCHEDULE의 "DAY 한줄설명"을 DAY 상세 카드에 표시
   ========================================================= */

(async function setupDayDescription() {

  const url = window.TRIP_CONFIG?.scheduleCsvUrl;

  if (!url) return;


  /* 스타일 자동 추가 */
  if (!document.querySelector("#dayDescriptionStyle")) {

    const style = document.createElement("style");

    style.id = "dayDescriptionStyle";

    style.textContent = `

      .day-location-pill {
        display: inline-flex;
        align-items: center;
        width: fit-content;

        margin-top: 14px;
        margin-bottom: 0;

        padding: 6px 12px;

        border-radius: 999px;

        background: rgba(31, 95, 82, 0.08);

        color: #1f5f52;

        font-size: 14px;
        font-weight: 700;
      }


      .day-description {
        margin: 11px 0 0;

        font-size: 15px;
        line-height: 1.6;

        color: #756d65;
      }

    `;

    document.head.appendChild(style);

  }


  try {

    const separator =
      url.includes("?")
        ? "&"
        : "?";


    const response =
      await fetch(
        `${url}${separator}daydesc=${Date.now()}`,
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


    /* 기존 app.js의 CSV 함수 사용 */
    const rows =
      parseCSV(text);


    if (!rows.length) return;


    const headers =
      rows[0].map(
        normalizeHeader
      );


    const dayIndex =
      getIndex(
        headers,
        "DAY",
        "day"
      );


    const descriptionIndex =
      getIndex(
        headers,
        "DAY 한줄설명",
        "DAY한줄설명",
        "day 한줄설명",
        "day한줄설명"
      );


    if (
      dayIndex < 0 ||
      descriptionIndex < 0
    ) {

      console.log(
        "WEB_SCHEDULE에서 DAY 한줄설명 열을 찾지 못했습니다."
      );

      return;

    }


    /* DAY별 한줄설명 저장 */
    const dayDescriptions =
      new Map();


    rows
      .slice(1)
      .forEach(row => {

        const dayRaw =
          String(
            row[dayIndex] || ""
          ).trim();


        const description =
          String(
            row[descriptionIndex] || ""
          ).trim();


        const match =
          dayRaw.match(
            /(\d+)/
          );


        if (
          !match ||
          !description
        ) {
          return;
        }


        const dayNo =
          Number(
            match[1]
          );


        /* 각 DAY 첫 번째 설명만 사용 */
        if (
          !dayDescriptions.has(dayNo)
        ) {

          dayDescriptions.set(
            dayNo,
            description
          );

        }

      });


    /* 기존 renderDay 저장 */
    const originalRenderDay =
      renderDay;


    /* renderDay 확장 */
    renderDay = function(dayNo) {

      originalRenderDay(dayNo);


      const d =
        data.days.find(
          item =>
            item.day === dayNo
        )
        ||
        data.days[0];


      if (!d) return;


      const hero =
        document.querySelector(
          "#dayDetail .day-hero"
        );


      if (!hero) return;


      /*
        기존 도시 표시 영역 찾기
        - 이미 pill로 바꿨다면 .day-location-pill
        - 예전 코드라면 .muted
      */
      let location =
        hero.querySelector(
          ".day-location-pill"
        );


      if (!location) {

        location =
          hero.querySelector(
            ".muted"
          );


        if (location) {

          location.classList.remove(
            "muted"
          );

          location.classList.add(
            "day-location-pill"
          );

        }

      }


      /* 기존 설명 중복 방지 */
      hero
        .querySelector(
          ".day-description"
        )
        ?.remove();


      const description =
        dayDescriptions.get(
          d.day
        );


      if (!description) {
        return;
      }


      const descriptionElement =
        document.createElement(
          "p"
        );


      descriptionElement.className =
        "day-description";


      descriptionElement.textContent =
        description;


      if (location) {

        location.insertAdjacentElement(
          "afterend",
          descriptionElement
        );

      } else {

        hero.appendChild(
          descriptionElement
        );

      }

    };


    /* 현재 화면 즉시 다시 그리기 */
    const activeButton =
      document.querySelector(
        "#dayTabs button.active"
      );


    const currentDay =
      activeButton
        ? Number(
            activeButton.dataset.day
          )
        : data.days[0]?.day;


    if (currentDay) {

      renderDay(
        currentDay
      );

    }


  } catch (error) {

    console.error(
      "DAY 한줄설명 적용 실패:",
      error
    );

  }

})();
