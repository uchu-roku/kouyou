import { fmt, safe } from './utils.js';

let tbody, sortKey='木ID', sortAsc=true, onRowClickCb;

export function initTable(tbodyEl, onRowClick){
  tbody = tbodyEl;
  onRowClickCb = onRowClick;
}

export function wireSortHandlers(theadEl, onSortChanged){
  Array.from(theadEl.querySelectorAll('th')).forEach(th=>{
    th.addEventListener('click', ()=>{
      const k=th.dataset.key; if(!k) return;
      if(sortKey===k){ sortAsc=!sortAsc; } else { sortKey=k; sortAsc=true; }
      onSortChanged?.(sortKey, sortAsc);
    });
  });
}

export function setSort(k, asc){ sortKey=k; sortAsc=asc; }
export function getSort(){ return {key:sortKey, asc:sortAsc}; }

export function renderTable(rows){
  if(!tbody) return;
  const key=sortKey, asc=sortAsc?1:-1;
  const data=[...(rows||[])].sort((a,b)=>{
    const va=a[key], vb=b[key];
    if(va==null && vb==null) return 0;
    if(va==null) return 1; if(vb==null) return -1;
    if(typeof va==='number' && typeof vb==='number') return (va-vb)*asc;
    return String(va).localeCompare(String(vb),'ja')*asc;
  });
  tbody.innerHTML='';
  data.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${safe(r['木ID'])}</td>
      <td>${safe(r['樹種'])}</td>
      <td>${safe(r['林分ID'])}</td>
      <td><span class="tag ${safe(r['伐採優先度'])}">${safe(r['伐採優先度'])}</span></td>
      <td>${safe(r['直径(cm)'])}</td>
      <td>${safe(r['高さ(m)'])??''}</td>
      <td>${safe(r['材積(m³)'])}</td>
      <td>${safe(r['推定樹齢(年)'])??''}</td>
      <td>${fmt(r['単価(円/m³)'])}</td>
      <td>${fmt(r['粗利(円)'])}</td>
      <td>${safe(r['予測_直径_1年後(cm)'])??''}</td>
      <td>${safe(r['予測_材積_1年後(m³)'])??''}</td>
      <td>${safe(r['伐採可能年'])}</td>
    `;
    tr.addEventListener('click', ()=> onRowClickCb?.(r));
    tbody.appendChild(tr);
  });
  const cntEl = document.getElementById('rowCount');
  if(cntEl) cntEl.textContent = data.length.toLocaleString('ja-JP');
}
