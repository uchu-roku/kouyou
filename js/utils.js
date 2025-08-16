export function fmt(v){ if(v==null||!isFinite(v)) return ''; return Number(v).toLocaleString('ja-JP'); }
export function safe(v){ return v==null? '' : String(v); }
export function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
export function getCSS(varName){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }
export function round1(x){ return Math.round(x*10)/10 }
export function round2(x){ return Math.round(x*100)/100 }
export function numberOrNull(x){ return (x===undefined||x===null||x==='')? null : Number(x); }
