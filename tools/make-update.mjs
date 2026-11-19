// 빌드 번호를 매기고 자동 업데이트용 배포 폴더를 만든다.  node tools/make-update.mjs [빌드번호]
//  · www/version.json  : 앱(APK)에 들어가는 빌드 번호
//  · dist/update/      : 호스팅 서버에 올릴 폴더 (게임 파일 + version.json + CORS 설정)
// 빌드 번호는 마지막 커밋 시각(초)이라 나중 커밋일수록 크다.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname, www = join(root, 'www'), out = join(root, 'dist/update');
const build = +process.argv[2] || +execSync('git log -1 --format=%ct', { cwd: root }).toString().trim();
const version = JSON.parse(readFileSync(join(root, 'package.json'))).version;
const SKIP = new Set(['version.json', 'sw.js']);
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [relative(www, p)]; });
const files = walk(www).filter(f => !SKIP.has(f)).sort();
writeFileSync(join(www, 'version.json'), JSON.stringify({ build, version }) + '\n');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
for (const f of files) cpSync(join(www, f), join(out, f));
writeFileSync(join(out, 'version.json'), JSON.stringify({ build, version, files }) + '\n');
// 앱(https://localhost)에서 받아 갈 수 있게 모든 출처 허용 + 캐시하지 않음 (Cloudflare Pages · Netlify 형식)
writeFileSync(join(out, '_headers'), '/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: no-cache\n');
console.log(`빌드 ${build} (v${version}) · 파일 ${files.length}개 → dist/update`);
