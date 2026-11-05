import fs from 'node:fs';

let content = fs.readFileSync('data/excel_dump.json', 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(content);
const sheets = Array.isArray(data) ? data : [data];

for (const sheet of sheets) {
  console.log('====================================');
  console.log(`Sheet: ${sheet.SheetName} (${sheet.RowCount} x ${sheet.ColCount})`);
  console.log('====================================');
  
  sheet.Rows.forEach((row, idx) => {
    const rNum = idx + 1;
    const dayCol = row[0];
    const lessonNumCol = row[1];
    const preview = row.slice(2, 10).map(c => c.trim()).join(' | ');
    if (dayCol || lessonNumCol || row.some(c => c.trim() !== '')) {
      console.log(`R${rNum < 10 ? '0' + rNum : rNum}: [${dayCol || '  '}] [#${lessonNumCol || ' '}] ${preview}`);
    }
  });
}
