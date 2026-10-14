import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';

const out = 'dist/extension';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/adapters`, { recursive: true });
mkdirSync(`${out}/icons`, { recursive: true });

await build({
  entryPoints: { content: 'src/content/index.js', popup: 'src/popup/popup.js' },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: out,
  minify: false,
  legalComments: 'none',
});

cpSync('src/manifest.json', `${out}/manifest.json`);
cpSync('src/popup/popup.html', `${out}/popup.html`);
cpSync('src/popup/popup.css', `${out}/popup.css`);
cpSync('src/static/about.html', `${out}/about.html`);
cpSync('src/adapters', `${out}/adapters`, { recursive: true });
cpSync('src/_locales', `${out}/_locales`, { recursive: true });
cpSync('src/popup/fonts', `${out}/fonts`, { recursive: true });
if (existsSync('src/icons')) cpSync('src/icons', `${out}/icons`, { recursive: true });

let html = (await import('node:fs')).readFileSync(`${out}/popup.html`, 'utf8');
html = html.replace('<script type="module" src="popup.js"></script>', '<script src="popup.js"></script>');
writeFileSync(`${out}/popup.html`, html);

console.log('빌드 완료 →', out);
