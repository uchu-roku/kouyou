// map.js
import { escapeHtml, fmt, getCSS } from './utils.js';

// ==============================
// 絵文字割当（必要に応じて自由に調整可）
// ==============================
const EMOJI_BY_SPECIES = {
  'アカエゾマツ': '🌲',
  'トドマツ':     '🌲',
  'カラマツ':     '🌴', // 区別のため木以外も許容
  'シラカバ':     '🌳',
  '白樺':         '🌳',
  'シラカンバ':   '🌳',
  'ミズナラ':     '🍂',
  'ハルニレ':     '🌿',
  'イタヤカエデ': '🍁',
  'ヤチダモ':     '🍃'
};
const DEFAULT_EMOJI = '🌳';

// 互換のため残す（値は使わない）
const SPECIES_DRAW = {};

// 共通：樹種→絵文字
function emojiForSpecies(species){
  return EMOJI_BY_SPECIES[species] || DEFAULT_EMOJI;
}

let map, markersLayer, tbodyRef, yearsRef, priceMulRef, baseLayer;

export function initMap(mapEl, opts){
  if(!mapEl) return;
  yearsRef = opts?.yearsRef;
  priceMulRef = opts?.priceMulRef;
  tbodyRef = opts?.tbodyRef;

  map = L.map(mapEl,{zoomControl:true, preferCanvas:false});

  // OSM ベースレイヤ
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
  baseLayer = osm;

  // レイヤ切替（拡張用）
  L.control.layers({"OpenStreetMap": osm}, {}, {collapsed: true, position: 'topleft'}).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  map.setView([43.05,141.25],11);

  // Legend（右上）
  const legend = L.control({position:'topright'});
  legend.onAdd = function(){
    const d = L.DomUtil.create('div','legend small');
    d.innerHTML = `
      <div class="head">
        <b>凡例</b><span class="spacer"></span>
        <button id="legendToggle" class="btn" title="樹種サマリの表示/非表示">最小化</button>
      </div>
      <div class="sectionTitle"><u>伐採優先度（枠色）</u></div>
      <div class="item"><span class="swatch" style="background:var(--prioA)"></span> A（優先）</div>
      <div class="item"><span class="swatch" style="background:var(--prioB)"></span> B</div>
      <div class="item"><span class="swatch" style="background:var(--prioC)"></span> C</div>
      <div class="sectionTitle"><u>樹種（表示中）</u></div>
      <div id="speciesLegend"></div>
      <div class="meta" id="legendMeta"></div>
    `;
    return d;
  };
  legend.addTo(map);

  // Summary（左下）
  const summaryCtl = L.control({position:'bottomleft'});
  summaryCtl.onAdd = function(){
    const d = L.DomUtil.create('div','speciesSummary small');
    d.innerHTML = `
      <div class="head">
        <b>種別サマリ（現表示・予測反映）</b>
        <span class="spacer"></span>
        <button id="ssToggle" class="btn" title="最小化/展開">最小化</button>
      </div>
      <div class="list">
        <table>
          <thead><tr><th></th><th>樹種</th><th>本数</th><th>材積(m³)</th><th>粗利(円)</th></tr></thead>
          <tbody id="speciesSummaryBody"></tbody>
        </table>
      </div>
      <div id="speciesSummaryMeta" class="meta"></div>
    `;
    return d;
  };
  summaryCtl.addTo(map);

  // 表示の安定化（初回レンダ後にサイズ再計算）
  setTimeout(()=> map.invalidateSize(true), 150);
  setTimeout(bindToggles, 80);
}

function bindToggles(){
  const lg = document.getElementById('legendToggle');
  if(lg) lg.addEventListener('click', ()=>{
    const el = document.querySelector('.legend');
    const minimized = el?.classList.toggle('min');
    if(lg) lg.textContent = minimized ? '展開' : '最小化';
  });
  const ss = document.getElementById('ssToggle');
  if(ss) ss.addEventListener('click', ()=>{
    const el = document.querySelector('.speciesSummary');
    const minimized = el?.classList.toggle('min');
    if(ss) ss.textContent = minimized ? '展開' : '最小化';
  });
}

function ringClass(pr){ return pr==='A'?'ring-A':pr==='B'?'ring-B':pr==='C'?'ring-C':''; }

// マーカーは絵文字で統一
function iconForSpecies(species, prio){
  const ring = ringClass(prio);
  const emoji = emojiForSpecies(species);
  return L.divIcon({
    className:'',
    iconSize:[0,0],
    iconAnchor:[13,13],
    html:`<div class="mark ${ring}"><span class="emoji">${emoji}</span></div>`
  });
}

export function renderMap(predicted, markerMode, onMarkerClick){
  if(!markersLayer) return;
  markersLayer.clearLayers();
  if(!predicted || !predicted.length) return;
  const pts=[];
  const mode=markerMode||'icon';
  const t = Number(yearsRef?.value||0);
  const pm = Number(priceMulRef?.value||1);

  predicted.forEach(r=>{
    const lat=r._geom? r._geom[0]:r['緯度'];
    const lon=r._geom? r._geom[1]:r['経度'];
    if(!isFinite(lat)||!isFinite(lon)) return;
    pts.push([lat,lon]);

    let m;
    if(mode==='icon'){
      m = L.marker([lat,lon], {icon: iconForSpecies(r['樹種'], r['伐採優先度'])});
    }else{
      const dbh = Number(r['直径(cm)']);
      const radius = isFinite(dbh)? Math.max(4, Math.min(14, dbh/4)) : 6;
      const color = ({A:getCSS('--prioA'),B:getCSS('--prioB'),C:getCSS('--prioC')}[r['伐採優先度']]||'#e5e7eb');
      m = L.circleMarker([lat,lon], {radius,color,weight:1,fillColor:color,fillOpacity:.9});
    }
    m.addTo(markersLayer);
    m.bindPopup(`
      <div style="min-width:240px">
        <div><b>木ID:</b> ${escapeHtml(r['木ID'])} <span class="tag ${escapeHtml(r['伐採優先度'])}">${escapeHtml(r['伐採優先度'])}</span></div>
        <div><b>樹種:</b> ${escapeHtml(r['樹種'])} / <b>林分:</b> ${escapeHtml(r['林分ID'])}</div>
        <div><b>直径:</b> ${escapeHtml(r['直径(cm)'])} cm, <b>樹高:</b> ${escapeHtml(r['高さ(m)'])??''} m</div>
        <div><b>材積:</b> ${fmt(r['材積(m³)'])} m³, <b>粗利:</b> ${fmt(r['粗利(円)'])} 円</div>
        <div><b>伐採可能年:</b> ${escapeHtml(r['伐採可能年'])}</div>
        <div class="hint" style="margin-top:6px">※ ${escapeHtml(t)} 年後・価格倍率 ${pm.toFixed(2)} を反映</div>
      </div>`);
    m.on('click', ()=> onMarkerClick?.(r));
  });

  const b=L.latLngBounds(pts);
  if(b.isValid()) map.fitBounds(b.pad(0.2));
}

export function updateSpeciesLegend(speciesList){
  const box = document.getElementById('speciesLegend');
  const meta = document.getElementById('legendMeta');
  if(!box) return;
  const MAX = 50;
  const shown = speciesList.slice(0, MAX);
  const extra = Math.max(0, speciesList.length - shown.length);
  box.innerHTML = shown.map(s=> {
    const e = emojiForSpecies(s);
    return `<div class="item"><span class="icon" style="font-size:15px">${e}</span><span>${escapeHtml(s)}</span></div>`;
  }).join('');
  meta.textContent = extra>0 ? `他 ${extra} 種（先頭 ${MAX} 種を表示）` : '';
}

export function updateSpeciesSummary(predicted){
  const body = document.getElementById('speciesSummaryBody'); if(!body) return;
  const items = summarizeBySpecies(predicted);
  body.innerHTML = items.map(e=>
    `<tr>
      <td><span class="icon" style="font-size:15px">${emojiForSpecies(e.species)}</span></td>
      <td>${escapeHtml(e.species)}</td>
      <td style="text-align:right">${e.count.toLocaleString('ja-JP')}</td>
      <td style="text-align:right">${e.vol.toLocaleString('ja-JP',{maximumFractionDigits:2})}</td>
      <td style="text-align:right">${Math.round(e.profit).toLocaleString('ja-JP')}</td>
    </tr>`
  ).join('');

  const totalCount = items.reduce((s,x)=>s+x.count,0);
  const totalVol   = items.reduce((s,x)=>s+x.vol,0);
  const totalProfit= items.reduce((s,x)=>s+x.profit,0);
  const meta = document.getElementById('speciesSummaryMeta');
  if(meta){ meta.textContent = `合計 本数: ${totalCount.toLocaleString('ja-JP')}｜材積: ${totalVol.toLocaleString('ja-JP',{maximumFractionDigits:2})} m³｜粗利: ${Math.round(totalProfit).toLocaleString('ja-JP')} 円`; }
}

function summarizeBySpecies(list){
  const m=new Map();
  for(const r of list||[]){
    const sp = r['樹種'] || '(未指定)';
    const e = m.get(sp) || {species: sp, count:0, vol:0, profit:0};
    e.count++;
    const v=Number(r['材積(m³)']); if(isFinite(v)) e.vol+=v;
    const p=Number(r['粗利(円)']); if(isFinite(p)) e.profit+=p;
    m.set(sp,e);
  }
  return Array.from(m.values()).sort((a,b)=> b.count-a.count || b.vol-a.vol || a.species.localeCompare(b.species,'ja'));
}
