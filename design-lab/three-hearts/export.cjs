// Regenerate review assets from the same vectors used by the interactive page.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = { window: {} };
for (const file of ['../../app/theme-tokens.js', 'marks.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
const lab = context.window.SZHeartLab;
fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
for (const variant of lab.variants) {
  for (const [suffix, options] of [['flower', {}], ['card', {card: true}], ['mono', {mono: true}], ['center-flower', {stamen: 'center'}], ['center-card', {stamen: 'center', card: true}]]) {
    fs.writeFileSync(path.join(__dirname, 'assets', `${variant.id}-${suffix}.svg`), lab.svg(variant.id, { ...options, label: variant.name }) + '\n');
  }
}
console.log(`Exported ${lab.variants.length * 5} SVG assets.`);
