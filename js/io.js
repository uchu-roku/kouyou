import { setRows } from './state.js';
import { numberOrNull } from './utils.js';

export function initIO(fileInput, dropzone, onLoaded){
  if(!fileInput || !dropzone) return;

  fileInput.addEventListener('change', e=>{
    const f=e.target.files?.[0]; if(f) handleFile(f, onLoaded);
  });

  ['dragenter','dragover','dragleave','drop'].forEach(ev=>{
    window.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); }, false);
  });
  ['dragenter','dragover'].forEach(ev=> dropzone.addEventListener(ev, ()=> dropzone.classList.add('dragover'), false));
  ['dragleave','drop'].forEach(ev=> dropzone.addEventListener(ev, ()=> dropzone.classList.remove('dragover'), false));
  dropzone.addEventListener('drop', e=>{
    const files = e.dataTransfer?.files;
    if(files && files.length){
      handleFile(files[0], onLoaded);
    }
  });
}

async function handleFile(f, onLoaded){
  const name=f.name.toLowerCase();
  if(name.endsWith('.csv')){
    Papa.parse(f,{header:true,skipEmptyLines:true,complete:(res)=>{
      const recs = res.data.map(cleanRow);
      setRows(recs);
      onLoaded?.(recs);
    }});
  }else if(name.endsWith('.geojson')||name.endsWith('.json')){
    const text = await f.text();
    const gj = JSON.parse(text);
    const recs = geojsonToRows(gj).map(cleanRow);
    setRows(recs);
    onLoaded?.(recs);
  }else{
    alert('CSV または GeoJSON を指定してください');
  }
}

function cleanRow(r){
  const out = {...r};
  if(out.lat) out['緯度']=numberOrNull(out.lat);
  if(out.lng||out.lon) out['経度']=numberOrNull(out.lng||out.lon);
  ['木ID','林分ID','直径(cm)','高さ(m)','材積(m³)','推定樹齢(年)','単価(円/m³)','粗利(円)','予測_直径_1年後(cm)','予測_材積_1年後(m³)']
    .forEach(k=>{ if(out[k]!==undefined) out[k]=numberOrNull(out[k]); });
  if(out['緯度']!=null && out['経度']!=null){ out._geom=[out['緯度'], out['経度']]; }
  return out;
}

function geojsonToRows(gj){
  const feats = gj.type==='FeatureCollection'? gj.features : [gj];
  return feats.map(f=>{
    const p={...(f.properties||{})};
    if(f.geometry && f.geometry.type==='Point'){
      const [lon,lat]=f.geometry.coordinates; p['緯度']=lat; p['経度']=lon; p._geom=[lat,lon];
    }
    return p;
  });
}
