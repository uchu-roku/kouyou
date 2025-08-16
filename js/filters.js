import { round1, round2 } from './utils.js';

/** 伐採可能年の推定（現行年基準） */
export function deriveHarvestYear(row, dbhNow, harvestDbh){
  const threshold = Number(harvestDbh||30);
  const baseYear = new Date().getFullYear();
  const nowDbh = isFinite(dbhNow)? dbhNow : Number(row['直径(cm)']);
  const nextDbh = Number(row['予測_直径_1年後(cm)']);
  if(!isFinite(threshold)||!isFinite(nowDbh)) return '';
  if(nowDbh>=threshold) return baseYear;
  let inc = (isFinite(nextDbh)&&isFinite(row['直径(cm)']))? (nextDbh-Number(row['直径(cm)'])) : 0.4;
  if(inc<=0.05) inc = 0.2;
  const years = Math.ceil((threshold-nowDbh)/inc);
  return baseYear + Math.max(0,years);
}

/** t年後の直径・材積・粗利を近似 */
export function predictRow(row, t, priceMul){
  const nowDbh = Number(row['直径(cm)']);
  const nextDbh = Number(row['予測_直径_1年後(cm)']);
  const nowVol = Number(row['材積(m³)']);
  const nextVol = Number(row['予測_材積_1年後(m³)']);
  const nowProfit = Number(row['粗利(円)']);
  const unit = Number(row['単価(円/m³)']);

  let dbhInc = (isFinite(nextDbh)&&isFinite(nowDbh)) ? (nextDbh - nowDbh) : 0.4;
  if(!isFinite(dbhInc) || dbhInc<0.05) dbhInc = 0.2;
  const dbhT = isFinite(nowDbh) ? (nowDbh + dbhInc * t) : nowDbh;

  let volT = nowVol;
  if(isFinite(nowVol) && isFinite(nextVol)){
    const volInc = nextVol - nowVol;
    volT = nowVol + volInc * t;
  }else if(isFinite(nowVol) && isFinite(nowDbh) && isFinite(dbhT) && nowDbh>0){
    const ratio = Math.max(0, dbhT / nowDbh);
    volT = nowVol * Math.pow(ratio, 2);
  }

  let profitT = nowProfit;
  if(isFinite(nowProfit) && isFinite(nowVol) && nowVol>0 && isFinite(volT)){
    profitT = nowProfit * (volT/nowVol) * priceMul;
  }else if(isFinite(unit) && isFinite(volT)){
    profitT = unit * volT * priceMul;
  }

  const harvestYear = deriveHarvestYear(row, dbhT, undefined);

  return {
    ...row,
    '直径(cm)': isFinite(dbhT)? round1(dbhT) : row['直径(cm)'],
    '材積(m³)': isFinite(volT)? round2(volT) : row['材積(m³)'],
    '粗利(円)': isFinite(profitT)? Math.round(profitT) : row['粗利(円)'],
    '伐採可能年': harvestYear
  };
}

/** フィルタ＋予測を適用し、表示配列と凡例用樹種一覧を返す */
export function applyFilters(rows, controls){
  const t = Number(controls.years?.value||0);
  const pm = Number(controls.priceMul?.value||1);
  const q = controls.search?.value?.trim().toLowerCase() || '';
  const sp = controls.speciesFilter?.value || '';
  const pr = controls.prioFilter?.value || '';
  const st = (controls.standFilter?.value || '').trim();
  const minDbh = Number(controls.minDbh?.value||0);

  let filtered = rows.map(r=> ({...r})).filter(r=>{
    if(sp && r['樹種']!==sp) return false;
    if(pr && r['伐採優先度']!==pr) return false;
    if(st && String(r['林分ID'])!==st) return false;
    if(isFinite(minDbh) && r['直径(cm)']!=null && r['直径(cm)']<minDbh) return false;
    if(q){
      const line=[r['樹種'],r['林分ID'],r['木ID'],r['伐採優先度']].join(' ').toLowerCase();
      if(!line.includes(q)) return false;
    }
    return true;
  });

  const predicted = filtered.map(r=> predictRow(r, t, pm));
  const speciesShown = Array.from(new Set(predicted.map(r=>r['樹種']).filter(Boolean))).sort();
  return { predicted, speciesShown };
}
