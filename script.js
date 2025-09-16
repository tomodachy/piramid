/* Логика карты и загрузки данных из Google Sheets */
(function(){
  const cfg = window.SHEET_CONFIG;
  const map = L.map('map', { worldCopyJump: true }).setView([20, 0], 2);

  // Тёмные тайлы (Carto Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const allMarkers = []; // для поиска

  // Поиск
  const searchInput = document.getElementById('search');
  const debounce = (fn, ms=300) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms);} };
  const applySearch = () => {
    const q = (searchInput.value || '').trim().toLowerCase();
    markersLayer.clearLayers();
    allMarkers.forEach(m => {
      const hay = `${m.__data.title} ${m.__data.country}`.toLowerCase();
      if (!q || hay.includes(q)) {
        markersLayer.addLayer(m);
      }
    });
  };
  searchInput.addEventListener('input', debounce(applySearch, 200));

  // Генерация URL экспорта CSV из Google Sheets
  function buildCsvUrl(sheetId, gid){
    // Прямая выдача CSV активного листа
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  function parseCoords(val){
    if(!val) return null;
    const parts = String(val).split(/[,;]\s*/).map(s=>s.trim()).filter(Boolean);
    if(parts.length>=2){
      const lat = parseFloat(parts[0].replace(',', '.'));
      const lng = parseFloat(parts[1].replace(',', '.'));
      if(Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
    return null;
  }

  function makePopupHTML(row){
    const c = cfg.columns;
    const title = row[c.title] || 'Без названия';
    const country = row[c.country] || '';
    const size = row[c.size] || '';
    const year = row[c.year] || '';
    const desc = row[c.desc] || '';
    const maps = row[c.maps] || '';
    const photo = row[c.photo] || '';
    const myth = row[c.myth] || '';
    const visa = row[c.visa] || '';

    // безопасные ссылки в новой вкладке
    const mapsLink = maps ? `<a href="${maps}" target="_blank" rel="noopener">Открыть в Google Maps ↗</a>` : '';
    let photoImg = '';
    if (photo) {
      // покажем картинку, а если это не прямая картинка — просто ссылка ниже
      const extOK = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(photo);
      if (extOK) {
        photoImg = `<img src="${photo}" alt="${title}" onerror="this.style.display='none'">`;
      }
    }
    const photoLink = photo ? `<div class="row"><a href="${photo}" target="_blank" rel="noopener">Фото/галерея ↗</a></div>` : '';

    return `<div class="popup">
      <h3>${title}</h3>
      <div class="meta">${country}${year ? ' · ' + year : ''}</div>
      ${photoImg}
      <div class="row"><strong>Высота/размер:</strong> ${size || '—'}</div>
      <div class="row"><strong>Описание:</strong> ${desc || '—'}</div>
      ${myth ? `<div class="row"><strong>Мифы и легенды:</strong> ${myth}</div>` : ''}
      ${visa ? `<div class="row"><span class="badge">Визы (UA): ${visa}</span></div>` : ''}
      <div class="row">${mapsLink}</div>
      ${photoLink}
    </div>`;
  }

  function addRow(row){
    const coords = parseCoords(row[cfg.columns.coords]);
    if (!coords) return;
    const marker = L.marker(coords);
    marker.__data = {
      title: row[cfg.columns.title] || '',
      country: row[cfg.columns.country] || ''
    };
    marker.bindPopup(makePopupHTML(row), { maxWidth: 360, autoPanPadding: [24,24] });
    marker.on('mouseover', function(){ this.openPopup(); });
    marker.on('click', function(){ this.openPopup(); });
    markersLayer.addLayer(marker);
    allMarkers.push(marker);
  }

  function fitToMarkers(){
    try{
      const bounds = L.latLngBounds([]);
      markersLayer.eachLayer(m => bounds.extend(m.getLatLng()));
      if(bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    }catch(e){ /* no-op */ }
  }

  function loadData(){
    const url = buildCsvUrl(cfg.sheetId, cfg.gid);
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(res){
        if(!res || !res.data){ console.error('Нет данных'); return; }
        res.data.forEach(addRow);
        fitToMarkers();
        applySearch();
      },
      error: function(err){ console.error('Ошибка загрузки CSV', err); }
    });
  }

  loadData();
})();