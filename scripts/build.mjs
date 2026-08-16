import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { baseParts, keyboards, PRICE_DATE } from '../src/data.js';
const __dirname=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(__dirname,'..');
const password=process.env.HACKERDECK_PASSWORD;
if(!password || password.length<14){console.error('Set HACKERDECK_PASSWORD to at least 14 characters.');process.exit(1)}
const style=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
let js=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
js=js.replace('__BASE_PARTS__',JSON.stringify(baseParts)).replace('__KEYBOARDS__',JSON.stringify(keyboards)).replace('__PRICE_DATE__',PRICE_DATE);
let html=fs.readFileSync(path.join(root,'src/app.html'),'utf8').replace('__STYLE__',style).replace('__APPJS__',js);
const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),iterations=310000;
const key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');
const cipher=crypto.createCipheriv('aes-256-gcm',key,iv); const encrypted=Buffer.concat([cipher.update(html,'utf8'),cipher.final()]); const tag=cipher.getAuthTag();
// WebCrypto AES-GCM expects ciphertext || 16-byte tag.
const payload=Buffer.concat([encrypted,tag]);
fs.mkdirSync(path.join(root,'site/protected'),{recursive:true});
fs.writeFileSync(path.join(root,'site/protected/payload.json'),JSON.stringify({v:1,kdf:'PBKDF2-SHA-256',cipher:'AES-GCM',iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:payload.toString('base64'),builtAt:new Date().toISOString()}));
console.log(`Built encrypted payload: ${(payload.length/1024).toFixed(1)} KiB`);
