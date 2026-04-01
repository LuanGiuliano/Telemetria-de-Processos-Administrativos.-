const fs = require('fs');
const content = fs.readFileSync('C:/Users/SEDUC/.gemini/antigravity/brain/ccae170b-3786-490a-bbe3-640f13985c51/.system_generated/steps/39/content.md', 'utf-8');
const baseText = content.split('---')[1].trim();
const periods = {};
let currentMonth = "";
baseText.split('\n').forEach(line => {
  const cols = line.split(',');
  const c0 = (cols[0] || "").trim();
  const c1 = (cols[1] || "").trim();

  if (c0 && !c0.toUpperCase().includes('SEMANA') && (!c1 || c1 === '')) {
    currentMonth = c0.toUpperCase();
  } else if (c0.toUpperCase().includes('SEMANA')) {
    const m = c0.match(/SEMANA\s+(\d+)/i);
    if (m && currentMonth) {
      periods[`${currentMonth}_${m[1]}`] = c1;
    }
  }
});
Object.keys(periods).forEach(k => console.log('\'' + k + '\' = \'' + periods[k] + '\''));
