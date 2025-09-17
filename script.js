// ======= Вспомогательные логгеры =======
const log = (...a) => console.log("[pyramids]", ...a);
const warn = (...a) => console.warn("[pyramids]", ...a);
const err = (...a) => console.error("[pyramids]", ...a);

// ======= Загрузка из Google Sheets (GViz) =======
async function fetchSheet({ sheetId, sheetName = "" }) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({ tqx: "out:json" });
  if (sheetName) params.set("sheet", sheetName);

  const url = `${base}?${params.toString()}`;
  log("fetching sheet:", url);
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));

  const cols = json.table.cols.map(c => (c.label || c.id || "").trim());
  const rows = json.table.rows
    .filter(r => r && r.c && r.c.some(cell => cell && cell.v !== null))
    .map(r => r.c.map(c => (c && c.v != null ? String(c.v) : "")).reduce((acc, v, i) => {
      acc[cols[i] || `col_${i+1}`] = v.trim();
      return acc;
    }, {}));

  log("sheet loaded:", { columns: cols.length, rows: rows.length });
  return { cols, rows };
}

// ======= Утилиты =======
function parseCoords(str){
  if(!str) return null;
  const m = String(str).replace(/\s+/g,"").match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if(!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

function mapsSearchLink(coordsStr, fallbackUrl){
  const c = parseCoords(coordsStr);
  if(c) return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  return fallbackUrl || "#";
}

function pick(row, variants=[], def=""){
  const keys = Object.keys(row);
  const found = keys.find(k => variants.some(v => k.toLowerCase() === v));
  return (found ? row[found] : def) || def;
}

function normalizeRow(row){
  const lowerMap = {};
  for(const k of Object.keys(row)) lowerMap[k.toLowerCase()] = row[k];

  const get = (arr, def="") => pick(lowerMap, arr.map(a=>a.toLowerCase()), def);

  const title = get(["Название","name","title"]);
  const country = get(["Страна","локация","страна, регион","location","country"]);
  const type = get(["Тип","категория","type"]);
  const years = get(["Год постройки","годы","даты","years"]);
  const height = get(["Высота/размер","высота","height"]);
  const description = get(["Краткое описание","Описание","description"]);
  const myths = get(["Мифы/легенды/известные люди","Мифы и легенды","мифы","легенды","myths"]);
  const coords = get(["Координаты","координаты","coords","lat,lng","latlon"]);
  const mapUrl = get(["Google Maps","Ссылка на карту","карта","map url","maps"]);
  const imagesUrl = get(["Фото","Ссылка на фото","фото","images"]);
  const visa = get(["Визовый режим (для граждан Украины)","Визы (UA)","визы","visa"]);

  const link = mapsSearchLink(coords, mapUrl);
  return { title, country, type, years, height, description, myths, coords, mapUrl: link, imagesUrl, visa };
}

// ======= Инициализация карты =======
function initMap(){
  const mapEl = document.getElementById('map');
  if(!mapEl){
    err("Элемент #map не найден в DOM");
    const el = document.createElement("div");
    el.id = "map";
    el.style.cssText = "position:fixed;inset:0;height:100vh;width:100vw;";
    document.body.appendChild(el);
    warn("Создал #map динамически");
  }
  const m = L.map('map', { zoomControl: true });
  const { lat, lng, zoom } = window.DEFAULT_VIEW || { lat:30, lng:10, zoom:2 };
  m.setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
  }).addTo(m);
  return m;
}

// ======= Попап =======
function buildPopupHTML(d){
  const esc = (s)=> (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  const title = esc(d.title);
  const countryLine = [d.country, d.type].filter(Boolean).join(" · ");
  const height = esc(d.height);
  const year = esc(d.years);
  const desc = esc(d.description);
  const myths = esc(d.myths);
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

// ======= Main =======
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const map = initMap();
    const { rows } = await fetchSheet({ sheetId: window.SHEET_ID, sheetName: window.SHEET_NAME });
    const markers = [];

    rows.forEach(r => {
      const d = normalizeRow(r);
      const c = parseCoords(d.coords);
      if(!c){ return; }
      const marker = L.marker([c.lat, c.lng]).addTo(map);
      marker.bindPopup(buildPopupHTML(d));
      markers.push(marker);
    });

    log("markers:", markers.length);
    if(markers.length){
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      warn("Нет валидных координат или строки пустые — карта оставлена в дефолтном виде");
    }
  } catch (e) {
    err("Ошибка при инициализации страницы:", e);
    alert("Ошибка загрузки данных. Открой консоль (F12) → Console для подробностей.");
  }
});
