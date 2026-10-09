// RTA formatting and parsing; stored times remain integer milliseconds.
function formatTime(ms){const hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60;return `${hours?hours+':':''}${hours?String(minutes).padStart(2,'0'):minutes}:${String(seconds).padStart(2,'0')}${ms%1000?'.'+String(ms%1000).padStart(3,'0'):''}`;}
function normalizeTime(value){const text=value.trim();return /^([0-5]?\d)\.\d{1,3}$/.test(text)?`0:${text.split('.')[0].padStart(2,'0')}.${text.split('.')[1]}`:text;}
function parseTime(value){const match=normalizeTime(value).match(/^(?:(\d{1,3}):)?([0-5]?\d):([0-5]\d)(?:\.(\d{1,3}))?$/);if(!match)return null;const ms=(Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3]))*1000+Number((match[4]||'').padEnd(3,'0'));return ms>0?ms:null;}
function dateLabel(date){if(!date)return 'Unknown date';return new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function totalRunTime(ms){
  const days=Math.floor(ms/86400000),hours=Math.floor(ms/3600000)%24,minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s ${ms%1000}ms`;
}
