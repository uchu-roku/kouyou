// app.js
import { fmt } from './utils.js';
import { state, controls, bindControls, setRows, getRows, setPredicted } from './state.js';
import { initIO } from './io.js';
import { applyFilters } from './filters.js';
import { initMap, renderMap, updateSpeciesLegend, updateSpeciesSummary, focusOnRow } from './map.js';
import { initTable, renderTable, wireSortHandlers, setSort, getSort } from './table.js';
import { exportCsv } from './exportCsv.js';
import { saveSettings, loadSettings } from './state.js';

function byId(id){ return document.getElementById(id); }

window.addEventListener('DOMContentLoaded', ()=>{
  // Bind controls
  bindControls({
    markerMode: byId('markerMode'),
    minDbh: byId('minDbh'),
    speciesFilter: byId('speciesFilter'),
    prioFilter: byId('prioFilter'),
    standFilter: byId('standFilter'),
    harvestDbh: byId('harvestDbh'),
    search: byId('search'),
    years: byId('years'),
    yearsOut: byId('yearsOut'),
    priceMul: byId('priceMul'),
    priceOut: byId('priceOut')
  });

  // Load saved settings if any
  loadSettings();
  syncOutputs();

  // Init IO
  initIO(byId('file'), byId('dropzone'), ()=>{
    // populate species select
    const rows = getRows();
    const species = Array.from(new Set(rows.map(r=>r['樹種']).filter(Boolean))).sort();
    const sel = controls.speciesFilter;
    sel.innerHTML = '<option value="">（全て）</option>' + species.map(s=>`<option>${s}</option>`).join('');
    applyAndRender();
  });

  // Init Map & Table
  initMap(byId('map'), { yearsRef: controls.years, priceMulRef: controls.priceMul, tbodyRef: document.querySelector('#table tbody') });
  initTable(document.querySelector('#table tbody'), (row)=>{
    // 地図へフォーカス＋ポップアップ
    focusOnRow(row, {zoom: 15, openPopup: true});
    // 既存のテーブル側フォーカス（ハイライト＆スクロール）は継続
    focusMapRow(row);
  });
  wireSortHandlers(document.querySelector('#table thead'), (k, asc)=>{ setSort(k, asc); renderTable(state.predicted); });

  // Wire controls
  [
    controls.markerMode, controls.minDbh, controls.speciesFilter, controls.prioFilter,
    controls.standFilter, controls.harvestDbh, controls.search,
    controls.years, controls.priceMul
  ].forEach(el=> el && el.addEventListener('input', ()=>{ syncOutputs(); applyAndRender(); saveSettings(); }));

  // CSV export
  byId('exportCsv')?.addEventListener('click', ()=> exportCsv(state.predicted));

  // Reset
  byId('resetFilters')?.addEventListener('click', ()=>{
    if(controls.markerMode) controls.markerMode.value='icon';
    if(controls.minDbh) controls.minDbh.value=0;
    if(controls.speciesFilter) controls.speciesFilter.value='';
    if(controls.prioFilter) controls.prioFilter.value='';
    if(controls.standFilter) controls.standFilter.value='';
    if(controls.search) controls.search.value='';
    if(controls.years) controls.years.value=0;
    if(controls.priceMul) controls.priceMul.value=1.00;
    syncOutputs();
    applyAndRender();
    saveSettings();
  });

  // Play
  const playBtn = byId('play');
  let timer=null;
  playBtn?.addEventListener('click', ()=>{
    if(timer){ clearInterval(timer); timer=null; playBtn.textContent='▶ 再生'; return; }
    playBtn.textContent='⏸ 一時停止';
    timer = setInterval(()=>{
      let v = Number(controls.years.value||0);
      v = (v>=10)? 0 : (v+1);
      controls.years.value = String(v);
      syncOutputs();
      applyAndRender();
      saveSettings();
    }, 900);
  });

  // First render (empty)
  applyAndRender();
});

function syncOutputs(){
  if(controls.yearsOut) controls.yearsOut.value = String(controls.years?.value||0);
  if(controls.priceOut) controls.priceOut.value = '×' + Number(controls.priceMul?.value||1).toFixed(2);
}

function applyAndRender(){
  const { predicted, speciesShown } = applyFilters(getRows(), controls);
  setPredicted(predicted);
  // KPI
  let v=0,p=0;
  for(const r of predicted){
    const vv=Number(r['材積(m³)']); const pp=Number(r['粗利(円)']);
    if(isFinite(vv)) v+=vv; if(isFinite(pp)) p+=pp;
  }
  const kCount = predicted.length.toLocaleString('ja-JP');
  const kVol = v.toLocaleString('ja-JP',{maximumFractionDigits:2});
  const kProfit = Math.round(p).toLocaleString('ja-JP');
  const kpiCount = document.getElementById('kpiCount');
  const kpiVol = document.getElementById('kpiVol');
  const kpiProfit = document.getElementById('kpiProfit');
  if(kpiCount) kpiCount.textContent = kCount;
  if(kpiVol) kpiVol.textContent = kVol;
  if(kpiProfit) kpiProfit.textContent = kProfit;
  const rowCount = document.getElementById('rowCount');
  if(rowCount) rowCount.textContent = kCount;

  // Renderers
  renderMap(predicted, controls.markerMode?.value, focusTableRow);
  renderTable(predicted);
  updateSpeciesLegend(speciesShown);
  updateSpeciesSummary(predicted);
}

function focusMapRow(row){
  // Scroll to table row (simple implementation)
  const tbody = document.querySelector('#table tbody');
  const idx = Array.from(tbody.children).findIndex(tr=> tr.firstChild && tr.firstChild.textContent==String(row['木ID']));
  if(idx>=0){
    tbody.children[idx].scrollIntoView({behavior:'smooth',block:'center'});
    tbody.children[idx].style.background='#162447';
    setTimeout(()=> tbody.children[idx].style.background='',1200);
  }
}

function focusTableRow(row){
  // Map click -> table focus（従来動作は維持）
  focusMapRow(row);
}
