export function exportCsv(rows, filename='predicted_inventory.csv'){
  if(!rows || rows.length===0){ alert('出力対象がありません'); return; }
  const headers=['木ID','樹種','林分ID','伐採優先度','直径(cm)','高さ(m)','材積(m³)','推定樹齢(年)','単価(円/m³)','粗利(円)','予測_直径_1年後(cm)','予測_材積_1年後(m³)','伐採可能年','緯度','経度'];
  const lines=[headers.join(',')];
  rows.forEach(r=>{
    const row=headers.map(h=> r[h]!==undefined? String(r[h]).replaceAll(',',''):'' );
    lines.push(row.join(','));
  });
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
}
