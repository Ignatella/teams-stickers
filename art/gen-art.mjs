import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const C = { fur: '#8b5a3c', belly: '#c48d66', muzzle: '#ecd3b4', ear: '#e8b4a0', ink: '#2a1a10', accent: '#5b5fc7', pink: '#ff6b8a', blue: '#6fb7ff' };
const ink = (w = 6) => `stroke="${C.ink}" stroke-width="${w}"`;
const INK = ink();

const heart = (x, y, s, fill = C.pink) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 .35C-.55 0-.5-.45 0-.2C.5-.45.55 0 0 .35Z" fill="${fill}" stroke="${C.ink}" stroke-width="${6 / s}"/>`;

const eyes = {
  dot: `<circle cx="205" cy="225" r="17" fill="${C.ink}"/><circle cx="307" cy="225" r="17" fill="${C.ink}"/><circle cx="211" cy="219" r="6" fill="#fff"/><circle cx="313" cy="219" r="6" fill="#fff"/>`,
  happy: `<path d="M186 232q19-26 38 0M288 232q19-26 38 0" ${ink(10)} stroke-linecap="round" fill="none"/>`,
  closed: `<path d="M186 222q19 16 38 0M288 222q19 16 38 0" ${ink(9)} stroke-linecap="round" fill="none"/>`,
  laugh: `<path d="M186 214l34 14-34 14M326 214l-34 14 34 14" ${ink(10)} stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  heart: heart(205, 225, 70) + heart(307, 225, 70),
  sleepy: `<path d="M186 222h38M288 222h38" ${ink(9)} stroke-linecap="round"/><path d="M190 224a15 12 0 0 0 30 0M292 224a15 12 0 0 0 30 0" fill="${C.ink}"/>`,
  up: `<circle cx="205" cy="225" r="17" fill="${C.ink}"/><circle cx="307" cy="225" r="17" fill="${C.ink}"/><circle cx="210" cy="214" r="7" fill="#fff"/><circle cx="312" cy="214" r="7" fill="#fff"/>`,
  sad: `<circle cx="205" cy="228" r="17" fill="${C.ink}"/><circle cx="307" cy="228" r="17" fill="${C.ink}"/><circle cx="211" cy="222" r="6" fill="#fff"/><circle cx="313" cy="222" r="6" fill="#fff"/><path d="M180 206l40-14M332 206l-40-14" ${ink(8)} stroke-linecap="round"/><path d="M196 252q-10 26 0 36q10-10 0-36Z" fill="${C.blue}" ${ink(4)}/>`,
};

const mouths = {
  smile: `<path d="M232 300q24 22 48 0" ${ink(8)} stroke-linecap="round" fill="none"/>`,
  open: `<path d="M226 296q30 4 60 0q-4 44-30 44t-30-44Z" fill="#7a2e2e" ${INK}/><path d="M238 326q18-12 36 0q-6 12-18 12t-18-12Z" fill="${C.pink}"/>`,
  o: `<ellipse cx="256" cy="312" rx="13" ry="16" fill="#7a2e2e" ${INK}/>`,
  sad: `<path d="M234 318q22-18 44 0" ${ink(8)} stroke-linecap="round" fill="none"/>`,
  flat: `<path d="M238 310h36" ${ink(8)} stroke-linecap="round"/>`,
};

const text = (t, x, y, size = 84, rot = 0, fill = C.accent) =>
  `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="${size}" fill="${fill}" stroke="#fff" stroke-width="18" stroke-linejoin="round" paint-order="stroke">${t}</text>`;

const pawPads = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${C.muzzle}"><ellipse cx="0" cy="8" rx="16" ry="13"/><circle cx="-16" cy="-12" r="7"/><circle cx="0" cy="-18" r="7"/><circle cx="16" cy="-12" r="7"/></g>`;

function bear({ eye = 'dot', mouth = 'smile', arms = 'down', blush = true, extraBack = '', extraFront = '', outline = '' }) {
  const armL = arms === 'none' ? '' : `<ellipse cx="146" cy="400" rx="42" ry="58" transform="rotate(20 146 400)"/>`;
  const armR = arms === 'down' ? `<ellipse cx="366" cy="400" rx="42" ry="58" transform="rotate(-20 366 400)"/>` : '';
  const silhouette = `
    <ellipse cx="256" cy="395" rx="128" ry="92"/>
    <circle cx="150" cy="118" r="52"/><circle cx="362" cy="118" r="52"/>
    <circle cx="256" cy="232" r="132"/>${armL}${armR}${outline}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${extraBack}
  <g fill="#fff" stroke="#fff" stroke-width="30" stroke-linejoin="round">${silhouette}</g>
  <g fill="${C.fur}" ${INK}>
    <ellipse cx="256" cy="395" rx="128" ry="92"/>
    <circle cx="150" cy="118" r="52"/><circle cx="362" cy="118" r="52"/>
  </g>
  <ellipse cx="256" cy="410" rx="78" ry="58" fill="${C.belly}"/>
  <circle cx="150" cy="118" r="26" fill="${C.ear}"/><circle cx="362" cy="118" r="26" fill="${C.ear}"/>
  <circle cx="256" cy="232" r="132" fill="${C.fur}" ${INK}/>
  <ellipse cx="256" cy="292" rx="64" ry="48" fill="${C.muzzle}"/>
  ${blush ? `<ellipse cx="168" cy="275" rx="22" ry="13" fill="${C.pink}" opacity=".45"/><ellipse cx="344" cy="275" rx="22" ry="13" fill="${C.pink}" opacity=".45"/>` : ''}
  ${eyes[eye]}
  <ellipse cx="256" cy="268" rx="26" ry="18" fill="${C.ink}"/>
  <ellipse cx="248" cy="262" rx="8" ry="5" fill="#fff" opacity=".7"/>
  ${mouths[mouth]}
  <g fill="${C.fur}" ${INK}>${armL}${armR}</g>
  ${extraFront}
</svg>`;
}

const raisedPaw = `<ellipse cx="408" cy="250" rx="46" ry="54" transform="rotate(15 408 250)"/>`;
const mug = `<path d="M206 360h100v70q0 26-26 26h-48q-26 0-26-26Z"/><path d="M306 378q34 0 34 26t-34 26" fill="none"/>`;
const chinPaw = `<ellipse cx="330" cy="345" rx="40" ry="46"/>`;
const thumbPaw = `<ellipse cx="396" cy="330" rx="46" ry="42"/><ellipse cx="402" cy="268" rx="18" ry="36"/>`;

const stickers = {
  hello: bear({
    arms: 'left', mouth: 'open', eye: 'happy', outline: raisedPaw,
    extraFront: `<g fill="${C.fur}" ${INK}>${raisedPaw}</g>${pawPads(408, 252)}<path d="M452 186q14 10 18 26M470 168q20 16 24 40" stroke="${C.accent}" stroke-width="9" stroke-linecap="round" fill="none"/>${text('HI!', 110, 470, 92, -10)}`,
  }),
  ok: bear({
    arms: 'left', eye: 'happy', outline: thumbPaw,
    extraFront: `<g fill="${C.fur}" ${INK}>${thumbPaw}</g>${text('OK!', 116, 478, 92, -8)}`,
  }),
  love: bear({
    eye: 'heart', mouth: 'smile',
    extraFront: heart(80, 120, 70) + heart(450, 70, 54) + heart(460, 300, 44),
  }),
  coffee: bear({
    eye: 'sleepy', mouth: 'flat', outline: mug,
    extraFront: `<g fill="#fff" ${INK}>${mug}</g><path d="M206 382h100" stroke="${C.accent}" stroke-width="14"/><path d="M352 352q-10-14 0-26t0-26M374 360q-10-14 0-26t0-26" stroke="#ccc" stroke-width="7" stroke-linecap="round" fill="none"/>${text('brb', 420, 480, 70, -8)}`,
  }),
  hmm: bear({
    eye: 'up', mouth: 'flat', outline: chinPaw, blush: false,
    extraFront: `<g fill="${C.fur}" ${INK}>${chinPaw}</g>${pawPads(330, 345, 0.9)}${text('?', 440, 140, 130, 12)}`,
  }),
  sleep: bear({
    eye: 'closed', mouth: 'o',
    extraFront: `${text('Z', 400, 130, 90, 10)}${text('z', 458, 70, 64, 14)}${text('z', 490, 30, 44, 18)}<circle cx="296" cy="324" r="14" fill="${C.blue}" opacity=".55" stroke="${C.ink}" stroke-width="3"/>`,
  }),
  lol: bear({
    eye: 'laugh', mouth: 'open',
    extraFront: `<path d="M168 246q-22 22-8 40q14-6 8-40ZM344 246q22 22 8 40q-14-6-8-40Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="4"/>${text('LOL', 256, 500, 84, 0)}`,
  }),
  sad: bear({
    eye: 'sad', mouth: 'sad', blush: false,
    extraFront: `<path d="M70 70q20 30 0 50M100 40q20 30 0 50" stroke="${C.blue}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".6"/>`,
  }),
};

for (const [name, svg] of Object.entries(stickers)) writeFileSync(`${out}/${name}.svg`, svg);
console.log(Object.keys(stickers).join(' '));
