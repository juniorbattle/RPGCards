// HISTORIQUE (M02) : dépend du gabarit M02 (`.stage-window`), remplacé en M03 par tools/shots-m03.mjs.
// Assemble les crops « 17-planche-* » en une planche comparative (personnalités × humeurs).
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './browser.mjs';
const dir = 'screenshots/qa/m02';
const rivals = [['braise', 'Kaï · la Braise (offensif)'], ['ronce', 'Maëlle · Ronces (prudente)'], ['voile', 'Sélène · Voile (lectrice)']];
const moods = [['confident', 'sûr·e de soi'], ['surprised', 'surpris·e'], ['pained', 'touché·e'], ['annoyed', 'contrarié·e'], ['triumphant', 'triomphant·e'], ['defeated', 'abattu·e']];
const img = (f) => `data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}`;
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0a10;color:#f3ece0;font-family:system-ui;padding:16px">
<h2 style="font-family:Georgia;color:#ffe7b0;margin:0 0 4px">Rivaux procéduraux — planche de revue (poses QA, pas des états de jeu)</h2>
<p style="margin:0 0 10px;color:#b9ae9c;font-size:13px">Même seed (101), même cadrage vue A ; humeur imposée par le paramètre QA <code>pose=</code>. En jeu, les humeurs ne sont déclenchées que par des faits publics.</p>
<table style="border-collapse:collapse">${['<tr><td></td>' + moods.map(([, l]) => `<th style="font-size:12px;color:#e2c48a;padding:4px">${l}</th>`).join('') + '</tr>', ...rivals.map(([r, l]) => `<tr><th style="font-size:12px;color:#ff9a8a;padding:4px;text-align:right;width:110px">${l}</th>${moods.map(([m]) => `<td style="padding:3px"><img src="${img(`17-planche-${r}-${m}.png`)}" style="height:150px;border:1px solid #4a3f2a;border-radius:6px"></td>`).join('')}</tr>`)].join('')}</table></body>`;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 620 } });
await page.setContent(html);
await page.screenshot({ path: `${dir}/23-planche-personnalites-humeurs.png`, fullPage: true });
await browser.close();
console.log('planche écrite');
