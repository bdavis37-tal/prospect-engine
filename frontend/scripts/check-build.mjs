import {readFileSync,readdirSync,statSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const files=readdirSync('dist/assets');
const css=files.filter(f=>f.endsWith('.css')).map(f=>readFileSync(`dist/assets/${f}`,'utf8')).join('');
if(css.includes('@tailwind')||!css.includes('.flex{'))throw Error('Tailwind utilities were not compiled');
const entry=files.find(f=>/^index-.*\.js$/.test(f));
if(!entry)throw Error('Missing entry bundle');
const bytes=readFileSync(`dist/assets/${entry}`);
if(gzipSync(bytes).length>110000)throw Error('Initial JS exceeds the 110 KB gzip budget');
if(bytes.toString().includes('scenario_comparison')){
 // A field name may exist in the app; dataset content must not be in the entry chunk.
 if(bytes.toString().includes('Thunderhawk Deep'))throw Error('Demo data is eagerly bundled');
}
console.log(JSON.stringify({entry,rawBytes:bytes.length,gzipBytes:gzipSync(bytes).length,cssBytes:Buffer.byteLength(css)}));
