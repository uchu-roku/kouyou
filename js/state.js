export const state = {
  rows: [],       // 原データ
  predicted: [],  // 予測反映後（表示用）
  sortKey: '木ID',
  sortAsc: true
};

export const controls = {
  // DOM要素参照を格納（app.jsでbind）
};

export function bindControls(map){
  Object.assign(controls, map);
}

export function setRows(rows){
  state.rows = rows || [];
}

export function getRows(){ return state.rows; }
export function setPredicted(list){ state.predicted = list || []; }
export function getPredicted(){ return state.predicted; }
export function setSort(key, asc){ state.sortKey=key; state.sortAsc=asc; }
export function getSort(){ return {key:state.sortKey, asc:state.sortAsc}; }

// LocalStorage（設定）
const LS_KEY='broadleaf_mgr_v110';
export function saveSettings(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify({
      markerMode:controls.markerMode?.value,
      minDbh:controls.minDbh?.value,
      speciesFilter:controls.speciesFilter?.value,
      prioFilter:controls.prioFilter?.value,
      standFilter:controls.standFilter?.value,
      harvestDbh:controls.harvestDbh?.value,
      search:controls.search?.value,
      years:controls.years?.value,
      priceMul:controls.priceMul?.value
    }));
  }catch(e){}
}
export function loadSettings(){
  try{
    const s=JSON.parse(localStorage.getItem(LS_KEY)||'null'); if(!s) return;
    if(s.markerMode!=null) controls.markerMode.value=s.markerMode;
    if(s.minDbh!=null) controls.minDbh.value=s.minDbh;
    if(s.prioFilter!=null) controls.prioFilter.value=s.prioFilter;
    if(s.standFilter!=null) controls.standFilter.value=s.standFilter;
    if(s.harvestDbh!=null) controls.harvestDbh.value=s.harvestDbh;
    if(s.search!=null) controls.search.value=s.search;
    if(s.years!=null) controls.years.value=s.years;
    if(s.priceMul!=null) controls.priceMul.value=s.priceMul;
    controls._savedSpecies = s.speciesFilter||'';
  }catch(e){}
}
