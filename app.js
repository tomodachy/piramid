async function fetchSheet({ sheetId, sheetName = "" }) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({ tqx: "out:json" });
  if (sheetName) params.set("sheet", sheetName);
  const res = await fetch(`${base}?${params.toString()}`);
  const text = await res.text();
  const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const cols = json.table.cols.map(c => (c.label || c.id || "").trim());
  const rows = json.table.rows
    .filter(r => r && r.c && r.c.some(cell => cell && cell.v !== null))
    .map(r => r.c.map(c => (c && c.v != null ? String(c.v) : "")).reduce((acc, v, i) => {
      acc[cols[i] || `col_${i+1}`] = v.trim();
      return acc;
    }, {}));
  return { cols, rows };
}
function openModal(data){
  const modal=document.getElementById("modal");
  modal.querySelector("#modal-title").textContent=data.title||"";
  modal.querySelector(".modal__meta").textContent=data.location||"";
  modal.querySelector('[data-field="height"]').textContent=data.height||"";
  modal.querySelector('[data-field="description"]').textContent=data.description||"";
  modal.querySelector('[data-field="myths"]').textContent=data.myths||"";
  modal.querySelector('[data-field="mapsUrl"]').href=data.mapsUrl||"#";
  modal.querySelector('[data-field="imagesUrl"]').href=data.imagesUrl||"#";
  modal.querySelector('[data-field="visa"]').textContent=data.visa||"";
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  document.getElementById("modal").setAttribute("aria-hidden","true");
}
document.addEventListener("DOMContentLoaded",async()=>{
  const {rows}=await fetchSheet({sheetId:window.SHEET_ID,sheetName:window.SHEET_NAME});
  const list=document.getElementById("list");
  rows.forEach(row=>{
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`<h3>${row["Название"]||""}</h3><div class="meta">${row["Страна"]||""}</div>`;
    card.addEventListener("click",()=>openModal({
      title:row["Название"],location:row["Страна"],height:row["Высота/размер"],
      description:row["Описание"],myths:row["Мифы и легенды"],
      mapsUrl:row["Ссылка на карту"],imagesUrl:row["Ссылка на фото"],visa:row["Визы (UA)"]
    }));
    list.appendChild(card);
  });
  document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",closeModal));
  document.getElementById("modal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal()});
});
