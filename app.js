/* =========================================================
   DAY 한줄설명 표시
   ========================================================= */

(async function () {

  const url = window.TRIP_CONFIG?.scheduleCsvUrl;
  if (!url) return;

  try {

    const res = await fetch(
      url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) return;

    const text = await res.text();
    const rows = parseCSV(text);

    if (!rows.length) return;

    const headers = rows[0].map(normalizeHeader);

    const dayIndex = getIndex(
      headers,
      "DAY",
      "day"
    );

    const descIndex = getIndex(
      headers,
      "DAY 한줄설명",
      "DAY한줄설명"
    );

    if (dayIndex < 0 || descIndex < 0) {
      console.log("DAY 한줄설명 열 없음");
      return;
    }


    /* DAY별 설명 저장 */
    const descriptions = {};

    rows.slice(1).forEach(row => {

      const dayText =
        String(row[dayIndex] || "");

      const match =
        dayText.match(/\d+/);

      const description =
        String(row[descIndex] || "").trim();

      if (!match || !description) return;

      const day =
        Number(match[0]);

      if (!descriptions[day]) {
        descriptions[day] =
          description;
      }

    });


    /* 기존 renderDay 보관 */
    const oldRenderDay =
      window.renderDay || renderDay;


    /* DAY 화면 그린 뒤 설명 추가 */
    window.renderDay =
    renderDay =
      function (dayNo) {

        oldRenderDay(dayNo);

        const current =
          data.days.find(
            d => d.day === Number(dayNo)
          ) || data.days[0];

        if (!current) return;


        const hero =
          document.querySelector(
            "#dayDetail .day-hero"
          );

        if (!hero) return;


        /* 지역명 */
        let location =
          hero.querySelector(
            ".day-location-pill"
          );

        if (!location) {

          location =
            hero.querySelector(".muted");

          if (location) {
            location.className =
              "day-location-pill";
          }

        }


        /* 예전 설명 있으면 제거 */
        hero
          .querySelectorAll(
            ".day-description"
          )
          .forEach(el => el.remove());


        const description =
          descriptions[current.day];

        if (!description) return;


        const p =
          document.createElement("p");

        p.className =
          "day-description";

        p.textContent =
          description;


        if (location) {
          location.after(p);
        } else {
          hero.appendChild(p);
        }

      };


    /* 스타일 */
    if (
      !document.querySelector(
        "#dayDescriptionCss"
      )
    ) {

      const style =
        document.createElement("style");

      style.id =
        "dayDescriptionCss";

      style.textContent = `

        .day-location-pill {
          display: inline-flex;
          width: fit-content;
          padding: 6px 12px;
          margin: 14px 0 0;
          border-radius: 999px;
          background: rgba(31,95,82,.08);
          color: #1f5f52;
          font-size: 14px;
          font-weight: 700;
        }

        .day-description {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: #746b62;
        }

      `;

      document.head.appendChild(style);

    }


    /* 현재 DAY 다시 표시 */
    const active =
      document.querySelector(
        "#dayTabs button.active"
      );

    const currentDay =
      active
        ? Number(active.dataset.day)
        : data.days[0]?.day;

    if (currentDay) {
      renderDay(currentDay);
    }

  } catch (err) {

    console.error(
      "DAY 한줄설명 오류",
      err
    );

  }

})();
