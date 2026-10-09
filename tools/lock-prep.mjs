#!/usr/bin/env node
// Encrypts a guest prep sheet into a password-locked page under episode-prep/.
//
//   node tools/lock-prep.mjs .prep-drafts/LosNerdys_004_Becerra_PrepSheet.html
//   node tools/lock-prep.mjs <file> --password <pw>   # reuse a specific password
//   node tools/lock-prep.mjs --check                   # verify episode-prep/ holds only locked pages
//
// The repo is public, so only ciphertext may ever be committed. Plaintext drafts
// and the password log live in .prep-drafts/ (gitignored).

import { readFileSync, writeFileSync, appendFileSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt, pbkdf2Sync, createCipheriv } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'episode-prep');
const DRAFTS = join(ROOT, '.prep-drafts');
const MARKER = 'data-losnerdys-locked="v1"';
const ITERATIONS = 600000;
// No 0/o, 1/l/i: easy to read aloud or retype from a text message.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

function check() {
  const bad = readdirSync(OUT_DIR)
    .filter(f => !f.startsWith('.'))
    .filter(f => !readFileSync(join(OUT_DIR, f), 'utf8').includes(MARKER));
  if (bad.length) {
    console.error('Unencrypted files in episode-prep/ (move to .prep-drafts/ and run lock-prep):');
    bad.forEach(f => console.error('  ' + f));
    process.exit(1);
  }
}

function makePassword() {
  const groups = [];
  for (let g = 0; g < 3; g++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(s);
  }
  return groups.join('-');
}

function encrypt(plaintext, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  // WebCrypto expects the GCM auth tag appended to the ciphertext.
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), iter: ITERATIONS, ct: ct.toString('base64') };
}

function shell(payload) {
  return `<!doctype html>
<html lang="en" ${MARKER}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Los Nerdys Prep Sheet</title>
<link rel="icon" type="image/png" href="../assets/calavera.png">
<style>
  :root { --bg:#0a0a0a; --surface:#151515; --line:#262626; --text:#f2f2f2; --muted:#9a9a9a; --red:#e63946; --amber:#f4a261; --green:#2a9d8f; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px 16px; background:var(--bg); color:var(--text); font-family:system-ui, sans-serif; }
  form { width:100%; max-width:360px; background:var(--surface); border:1px solid var(--line); border-top:3px solid var(--red); border-radius:6px; padding:28px 24px; text-align:center; }
  img { width:96px; height:auto; }
  h1 { font:700 1.1rem ui-monospace, Menlo, monospace; letter-spacing:2px; text-transform:uppercase; margin:12px 0 4px; }
  p { color:var(--muted); font-size:0.9rem; margin:0 0 20px; }
  input { width:100%; padding:12px; font:1rem ui-monospace, Menlo, monospace; background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:4px; text-align:center; }
  input:focus { outline:none; border-color:var(--amber); }
  button { width:100%; margin-top:12px; padding:12px; font:700 0.85rem ui-monospace, Menlo, monospace; text-transform:uppercase; background:var(--red); color:#fff; border:0; border-radius:4px; cursor:pointer; }
  button:disabled { opacity:0.6; cursor:wait; }
  .err { color:var(--amber); font-size:0.85rem; margin:12px 0 0; min-height:1.2em; }
</style>
</head>
<body>
<form id="f" autocomplete="off">
  <img src="../assets/calavera.png" alt="">
  <h1>Los Nerdys</h1>
  <p>This prep sheet is private. Enter the password you were sent.</p>
  <input id="pw" type="password" aria-label="Password" placeholder="xxxx-xxxx-xxxx" autofocus required>
  <button id="go" type="submit">Unlock</button>
  <p class="err" id="err" role="alert"></p>
</form>
<script id="payload" type="application/json">${JSON.stringify(payload)}</script>
<script>
(function () {
  var P = JSON.parse(document.getElementById('payload').textContent);
  var KEY = 'ln-prep:' + location.pathname;
  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  async function unlock(pw) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(P.salt), iterations: P.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.iv) }, key, b64(P.ct));
    return new TextDecoder().decode(pt);
  }

  function show(html, pw) {
    try { sessionStorage.setItem(KEY, pw); } catch (e) {}
    document.open(); document.write(html); document.close();
  }

  var f = document.getElementById('f'), pw = document.getElementById('pw'),
      go = document.getElementById('go'), err = document.getElementById('err');

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = pw.value.trim().toLowerCase();
    go.disabled = true; go.textContent = 'Unlocking...'; err.textContent = '';
    unlock(v).then(function (html) { show(html, v); }, function () {
      go.disabled = false; go.textContent = 'Unlock';
      err.textContent = 'That password did not work. Check it and try again.';
      pw.select();
    });
  });

  // Skip the prompt on reload within the same tab.
  var saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (e) {}
  if (saved) unlock(saved).then(function (html) { show(html, saved); }, function () {});
})();
</script>
</body>
</html>
`;
}

const args = process.argv.slice(2);
if (args[0] === '--check') { check(); process.exit(0); }

const src = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--password');
if (!src) {
  console.error('usage: node tools/lock-prep.mjs <draft.html> [--password <pw>] | --check');
  process.exit(2);
}
const pwFlag = args.indexOf('--password');
const password = pwFlag >= 0 ? args[pwFlag + 1].trim().toLowerCase() : makePassword();
const name = basename(src);
const plaintext = readFileSync(src);
if (plaintext.includes(MARKER)) {
  console.error(`${src} is already locked.`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, name), shell(encrypt(plaintext, password)));
mkdirSync(DRAFTS, { recursive: true });
appendFileSync(join(DRAFTS, 'passwords.txt'), `${new Date().toISOString()}  ${name}  ${password}\n`);

console.log(`Locked: episode-prep/${name}`);
console.log(`URL:    https://losnerdys.tech/episode-prep/${name}`);
console.log(`Pass:   ${password}`);
console.log('(Also logged in .prep-drafts/passwords.txt, which is gitignored.)');
