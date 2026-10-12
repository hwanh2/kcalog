// 앱 아이콘, 파비콘, 헤더 마크, 콘솔 로고를 한 벌의 도형 정의에서 뽑는다.
//
// 그림을 PNG로 직접 그리지 않고 여기서 SVG를 만든 뒤 Chrome으로 렌더링한다.
// 지난 로고(v2)는 만든 스크립트가 남지 않아, 고칠 때마다 PNG에서 링 위치와 색을 다시 재야 했다.
//
// frontend/ 에서:  node tools/icons/make-icons.mjs
// 결과: public/*-v3.png, tools/icons/out/oneulsikdan-logo-600.png(앱인토스 콘솔 업로드용, 저장소에 넣지 않는다)
//
// 파일 이름에 -v3을 붙이는 이유는 캐시다. 같은 이름을 덮어쓰면 브라우저와 CDN에 옛 그림이 오래 남는다.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PUBLIC = resolve('public')
const OUT = resolve('tools/icons/out')

// 512 기준 좌표. 링과 잔상은 v2 아이콘에서 잰 값 그대로다(중심, 반지름, 굵기, 색, 구간 각도)
const CX = 265
const CY = 255
const R = 176
const SW = 42
// 가운데 그림은 slate-600. slate-800(#1E293B)은 밝은 링 사이에서 혼자 무거워 한 단계 올렸다(2026-10-12)
const C = { orange: '#F97316', pink: '#F472B6', blue: '#38BDF8', grey: '#EEF1F6', navy: '#475569' }

function arc(a0, a1, color) {
  const t0 = (a0 * Math.PI) / 180
  const t1 = (a1 * Math.PI) / 180
  const [x0, y0] = [CX + R * Math.cos(t0), CY + R * Math.sin(t0)]
  const [x1, y1] = [CX + R * Math.cos(t1), CY + R * Math.sin(t1)]
  const large = (a1 - a0 + 360) % 360 > 180 ? 1 : 0
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${SW}" stroke-linecap="round"/>`
}

const RING = arc(282, 354, C.pink) + arc(6, 62, C.blue) + arc(80, 148, C.grey) + arc(212, 268, C.orange)

// 왼쪽 잔상(빠르게 기록한다는 뜻). [x0, y0, x1, y1, 색]
const BARS = [
  [33, 196, 54, 222, C.pink], [72, 196, 119, 222, C.orange], [148, 196, 192, 222, C.orange],
  [46, 237, 70, 263, C.blue], [85, 237, 112, 264, C.orange], [124, 237, 179, 264, C.orange],
  [20, 279, 62, 305, C.blue], [90, 279, 140, 305, C.orange], [158, 279, 190, 305, C.pink],
  [33, 320, 57, 347, C.orange], [75, 321, 117, 347, C.blue], [143, 321, 192, 347, C.pink],
]
  .map(([x0, y0, x1, y1, c]) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${(y1 - y0) / 2}" fill="${c}"/>`)
  .join('')

// 가운데 그림: 숟가락과 젓가락(2026-10-12 시안 C). 원점이 링 중심에 오도록 그린다.
// 젓가락 굵기는 28px(토스 내비바)에서 선 두 개가 뭉개지지 않을 만큼 둔다
function utensils(color) {
  const s = `stroke="${color}" stroke-linecap="round" fill="none"`
  return `<g transform="translate(${CX + 2} ${CY})">
    <ellipse cx="-27" cy="-52" rx="27" ry="40" fill="${color}"/>
    <path d="M-27 -18 V86" ${s} stroke-width="21"/>
    <path d="M17 -90 L24 86" ${s} stroke-width="15"/>
    <path d="M46 -90 L39 86" ${s} stroke-width="15"/>
  </g>`
}

// viewBox: 512 캔버스 전체 / 잔상까지 담는 로고 상자 / 링만 담는 상자
const FULL_CANVAS = [0, 0, 512, 512]
const LOGO_BOX = [14, 52, 455, 406] // x 14~469(링 오른쪽 끝), y 52~458
const RING_PAD = 6
const RING_BOX = [CX - R - SW / 2 - RING_PAD, CY - R - SW / 2 - RING_PAD, 2 * (R + SW / 2 + RING_PAD), 2 * (R + SW / 2 + RING_PAD)]

function svg({ viewBox, bg, bars = true, glyph = C.navy, size }) {
  const [x, y, w, h] = viewBox
  const back = bg ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${size[0]}" height="${size[1]}">${back}${RING}${bars ? BARS : ''}${utensils(glyph)}</svg>`
}

// 안드로이드 적응형 아이콘: 마스크가 가운데 80%만 남기므로 로고를 그 안으로 줄이고 흰 여백을 두른다
function maskable(size) {
  const scale = 0.6
  const w = LOGO_BOX[2] * scale * (512 / LOGO_BOX[2])
  const inner = svg({ viewBox: LOGO_BOX, bg: null, size: [w, (w * LOGO_BOX[3]) / LOGO_BOX[2]] })
  const ox = (512 - w) / 2
  const oy = (512 - (w * LOGO_BOX[3]) / LOGO_BOX[2]) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><rect width="512" height="512" fill="#FFFFFF"/><g transform="translate(${ox} ${oy})">${inner}</g></svg>`
}

const tmp = mkdtempSync(join(tmpdir(), 'icons-'))
function render(name, markup, [w, h], dir = PUBLIC) {
  const html = join(tmp, `${name}.html`)
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${markup}</body></html>`)
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    `--screenshot=${join(dir, name)}`, `--window-size=${w},${h}`, `file://${html}`,
  ], { stdio: 'ignore' })
  console.log(join(dir, name))
}

const markSize = [292, Math.round((292 * LOGO_BOX[3]) / LOGO_BOX[2])]

render('icon-512-v3.png', svg({ viewBox: FULL_CANVAS, bg: '#FFFFFF', size: [512, 512] }), [512, 512])
render('icon-192-v3.png', svg({ viewBox: FULL_CANVAS, bg: '#FFFFFF', size: [192, 192] }), [192, 192])
render('icon-180-v3.png', svg({ viewBox: FULL_CANVAS, bg: '#FFFFFF', size: [180, 180] }), [180, 180])
render('icon-512-maskable-v3.png', maskable(512), [512, 512])
// 파비콘은 잔상을 뺀다. 32px에서는 막대들이 색 얼룩으로 뭉갠다
render('favicon-192-v3.png', svg({ viewBox: RING_BOX, bg: '#FFFFFF', bars: false, size: [192, 192] }), [192, 192])
render('favicon-32-v3.png', svg({ viewBox: RING_BOX, bg: '#FFFFFF', bars: false, size: [32, 32] }), [32, 32])
// 헤더와 로그인 화면용 마크(투명 배경), 어두운 링크 카드용 마크(가운데 그림만 흰색)
render('kcalog-mark-v3.png', svg({ viewBox: LOGO_BOX, bg: null, size: markSize }), markSize)
render('kcalog-mark-on-dark-v3.png', svg({ viewBox: LOGO_BOX, bg: null, glyph: '#FFFFFF', size: markSize }), markSize)
// 앱인토스 콘솔: 600×600 각진 정사각형, 배경 필수
mkdirSync(OUT, { recursive: true })
render('oneulsikdan-logo-600.png', svg({ viewBox: FULL_CANVAS, bg: '#FFFFFF', size: [600, 600] }), [600, 600], OUT)
// 콘솔의 다크모드 로고(선택). 어두운 배경에 가운데 그림만 흰색, 링과 잔상은 그대로
render('oneulsikdan-logo-600-dark.png', svg({ viewBox: FULL_CANVAS, bg: '#17171C', glyph: '#FFFFFF', size: [600, 600] }), [600, 600], OUT)
