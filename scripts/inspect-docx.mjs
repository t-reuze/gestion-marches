import mammoth from 'mammoth';
import fs from 'fs';

const p = process.argv[2];
const buf = fs.readFileSync(p);
const result = await mammoth.extractRawText({ buffer: buf });
console.log(result.value);
