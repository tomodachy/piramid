// ======= Построение попапа (добавлены год, описание, мифы) =======
function buildPopupHTML(d){
  const esc = (s)=> (s||"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  const title = esc(d.title);
  const countryLine = [d.country, d.type].filter(Boolean).join(" · ");
  const height = esc(d.height);
  const year = esc(d.years);                 // добавлен год
  const desc = esc(d.description);           // краткое описание
  const myths = esc(d.myths);                // мифы, легенды, известные люди
  const visa = esc(d.visa);

  const links = `
    <div class="links">
      ${d.mapUrl ? `<a href="${d.mapUrl}" target="_blank" rel="noopener">Открыть в Google Maps ↗</a>`: ""}
      ${d.imagesUrl ? `<a href="${d.imagesUrl}" target="_blank" rel="noopener">Открыть фото (Google Images) ↗</a>`: ""}
    </div>
  `;

  return `
    <div class="popup">
      <h3>${title}</h3>
      <div class="meta">${esc(countryLine)}</div>

      ${height ? `<div><strong>Высота/размер:</strong> ${height}</div>`: ""}
      ${year ? `<div><strong>Год постройки:</strong> ${year}</div>`: ""}
      ${desc ? `<div><strong>Краткое описание:</strong> ${desc}</div>`: ""}
      ${myths ? `<div><strong>Мифы/легенды/известные люди:</strong> ${myths}</div>`: ""}

      ${links}

      ${visa ? `<div class="visa">${visa}</div>`: ""}
    </div>
  `;
}
