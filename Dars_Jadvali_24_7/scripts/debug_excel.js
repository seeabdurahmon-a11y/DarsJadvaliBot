import fs from 'fs';

const content = fs.readFileSync('data/excel_dump.json', 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(content);
const sheet = Array.isArray(data) ? data[0] : data;
const rows = sheet.Rows;

console.log('--- Checking R03 to R29 ---');
for (let r = 2; r <= 29; r++) {
  const row = rows[r];
  console.log(`R${r.toString().padStart(2, '0')}: c0=[${(row[0]||'').padEnd(4)}] c1=[${(row[1]||'').padEnd(2)}] | 7A(c23): ${(row[23]||'').padEnd(20)} | 7B(c24): ${(row[24]||'').padEnd(20)} | 7D(c25): ${(row[25]||'').padEnd(20)}`);
}
