(function(){
  const map = L.map('map', { worldCopyJump:true }).setView([20, 0], 2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const clusters = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnEveryZoom: false,
    maxClusterRadius: 60
  });
  map.addLayer(clusters);

  const allMarkers = [];
  const searchEl = document.getElementById('search');

  function parseCoords(val){
    if(!val) return null;
    const p = String(val).split(/[,;]\s*/).map(s=>s.trim()).filter(Boolean);
    if(p.length>=2){
      const lat = parseFloat(p[0].replace(',', '.'));
      const lng = parseFloat(p[1].replace(',', '.'));
      if(Number.isFinite(lat) && Number.isFinite(lng)) return [lat,lng];
    }
    return null;
  }

  function safeLink(url, text){
    if(!url) return '';
    const t = text || url;
    return `<a href="${url}" target="_blank" rel="noopener">${t}</a>`;
  }

  function makePopup(row){
    const title = row["Название"] || "Без названия";
    const country = row["Страна"] || "";
    const type = row["Тип"] || "";
    const size = row["Высота/размер"] || "";
    const year = row["Год постройки"] || "";
    const desc = row["Краткое описание"] || "";
    const maps = row["Google Maps"] || "";
    const photo = row["Фото"] || "";
    const myth = row["Мифы/легенды/известные люди"] || "";
    const visa = row["Визовый режим (для граждан Украины)"] || "";

    const html = `<div class="popup">
      <h3>${title}</h3>
      <div class="meta">${country}${type ? " · " + type : ""}${year ? " · " + year : ""}</div>
      ${size ? `<div class="row"><strong>Высота/размер:</strong> ${size}</div>` : ""}
      ${desc ? `<div class="row"><strong>Описание:</strong> ${desc}</div>` : ""}
      ${myth ? `<div class="row"><strong>Мифы и легенды:</strong> ${myth}</div>` : ""}
      ${visa ? `<div class="row"><span class="badge">Визы (UA): ${visa}</span></div>` : ""}
      ${maps ? `<div class="row">${safeLink(maps, "Открыть в Google Maps ↗")}</div>` : ""}
      ${photo ? `<div class="row">${safeLink(photo, "Открыть фото (Google Images) ↗")}</div>` : ""}
    </div>`;
    return html;
  }

  function addRow(row){
    const coords = parseCoords(row["Координаты"]);
    if(!coords) return;
    const marker = L.marker(coords);
    marker.__data = {
      title: row["Название"] || "",
      country: row["Страна"] || "",
      type: row["Тип"] || ""
    };
    marker.bindPopup(makePopup(row), { maxWidth: 380, autoPanPadding:[24,24] });
    marker.on('mouseover', function(){ this.openPopup(); });
    marker.on('click', function(){ this.openPopup(); });
    clusters.addLayer(marker);
    allMarkers.push(marker);
  }

  const debounce = (fn, ms=250) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms);} };
  const applySearch = () => {
    const q = (searchEl.value || '').trim().toLowerCase();
    clusters.clearLayers();
    allMarkers.forEach(m => {
      const hay = `${m.__data.title} ${m.__data.country} ${m.__data.type}`.toLowerCase();
      if(!q || hay.includes(q)){
        clusters.addLayer(m);
      }
    });
  };
  searchEl.addEventListener('input', debounce(applySearch, 250));

  function fitToMarkers(){
    try{
      const bounds = L.latLngBounds([]);
      clusters.eachLayer(m => bounds.extend(m.getLatLng()));
      if(bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    }catch(e){/* noop */}
  }

  // Загружаем локальный CSV
  Papa.parse('data.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(res){
      if(!res || !res.data) return;
      res.data.forEach(addRow);
      fitToMarkers();
    },
    error: function(err){
      console.error('Ошибка загрузки CSV', err);
    }
  });
})();