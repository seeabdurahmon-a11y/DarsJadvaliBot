import fs from 'fs';

const content = fs.readFileSync('data/excel_dump.json', 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(content);
const sheet = Array.isArray(data) ? data[0] : data;
const rows = sheet.Rows;

const tursunovaRows = [];
for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  row.forEach((cell, c) => {
    if (cell && (cell.includes('Tursunov') || cell.includes('Турсунов'))) {
      tursunovaRows.push({ row: r, col: c, class: rows[2][c], val: cell });
    }
  });
}
console.log('Tursunova cells:');
console.table(tursunovaRows);
