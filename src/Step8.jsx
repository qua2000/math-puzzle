import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const InlineMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomNonZero = (min, max) => {
  let v = 0
  while (v === 0) v = randomInt(min, max)
  return v
}
const sign = () => (randomInt(0, 1) ? 1 : -1)

function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+)/g, (_, exp) => `^{${exp}}`)
}

// ── 多項式ヘルパー ──────────────────────────────────────
function addTermTo(terms, exp, coef) {
  terms[exp] = (terms[exp] || 0) + coef
}

function formatTermsObj(terms) {
  const exps = Object.keys(terms).map(Number).filter(e => terms[e] !== 0).sort((a, b) => b - a)
  if (exps.length === 0) return '0'
  return exps.map((exp, i) => {
    const coef = terms[exp]
    const absC = Math.abs(coef)
    const xp = exp === 0 ? '' : exp === 1 ? 'x' : `x^{${exp}}`
    let body
    if (exp === 0) body = `${absC}`
    else if (absC === 1) body = xp
    else body = `${absC}${xp}`
    if (i === 0) return coef < 0 ? `-${body}` : body
    return coef < 0 ? `-${body}` : `+${body}`
  }).join('')
}

function formatMonomial(coef, exp) {
  if (coef === 0) return '0'
  const xp = exp === 0 ? '' : exp === 1 ? 'x' : `x^{${exp}}`
  if (exp === 0) return `${coef}`
  if (coef === 1) return xp
  if (coef === -1) return `-${xp}`
  return `${coef}${xp}`
}

// ── 柔軟な正解判定 ──────────────────────────────────────
function parseTerms(str) {
  const s = String(str).replace(/\s/g, '')
  if (!s || s === '0') return s === '0' ? {} : null
  const withSign = (s[0] === '+' || s[0] === '-') ? s : '+' + s
  const tokens = withSign.match(/[+-][^+-]+/g)
  if (!tokens) return null
  const terms = {}
  for (const tok of tokens) {
    const sgn = tok[0] === '-' ? -1 : 1
    const body = tok.slice(1)
    if (!body) return null
    if (body.includes('x')) {
      const idx = body.indexOf('x')
      const coefPart = body.slice(0, idx)
      const expPart  = body.slice(idx + 1)
      const coef = coefPart === '' ? 1 : Number(coefPart)
      if (Number.isNaN(coef)) return null
      let exp = 1
      if (expPart.startsWith('^')) {
        let expNum = expPart.slice(1)
        if (expNum.startsWith('{') && expNum.endsWith('}')) expNum = expNum.slice(1, -1)
        exp = Number(expNum)
        if (Number.isNaN(exp)) return null
      } else if (expPart !== '') return null
      terms[exp] = (terms[exp] || 0) + sgn * coef
    } else {
      const coef = Number(body)
      if (Number.isNaN(coef)) return null
      terms[0] = (terms[0] || 0) + sgn * coef
    }
  }
  Object.keys(terms).forEach(k => { if (terms[k] === 0) delete terms[k] })
  return terms
}

function checkAnswer(userStr, correctStr) {
  if (!userStr) return false
  if (normalize(userStr) === normalize(correctStr)) return true
  const t1 = parseTerms(userStr)
  const t2 = parseTerms(correctStr)
  if (!t1 || !t2) return false
  const k1 = Object.keys(t1), k2 = Object.keys(t2)
  if (k1.length !== k2.length) return false
  return k1.every(k => t1[k] === t2[k])
}

// ── KaTeX文字列ヘルパー ──────────────────────────────────
// 1次式 ax + b
function lin(a, b) {
  const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`
  if (b === 0) return ax
  return b > 0 ? `${ax}+${b}` : `${ax}${b}`
}
// 2項式 ax^n + b
function poly2(a, n, b) {
  const xp = n === 1 ? 'x' : `x^{${n}}`
  const head = a === 1 ? xp : a === -1 ? `-${xp}` : `${a}${xp}`
  if (b === 0) return head
  return b > 0 ? `${head}+${b}` : `${head}${b}`
}
// 3項式 ax^2 + bx + c
function poly3(a, b, c) {
  const parts = []
  const x2 = `x^{2}`
  if (a === 1) parts.push(x2)
  else if (a === -1) parts.push(`-${x2}`)
  else parts.push(`${a}${x2}`)
  if (b > 0) parts.push(`+${b === 1 ? 'x' : `${b}x`}`)
  else if (b < 0) parts.push(`${b === -1 ? '-x' : `${b}x`}`)
  if (c > 0) parts.push(`+${c}`)
  else if (c < 0) parts.push(`${c}`)
  return parts.join('')
}

// ── 8パターンの問題生成 ──────────────────────────────────
//
// 各パターン：{ fKatex, gKatex, dfKatex, dgKatex, numeratorStr, denominatorKatex,
//               qKatex, exampleA, exampleB }
// exampleA, exampleB = 例題用のオブジェクト（同パターン・別数値）

function buildProblem(pat) {
  switch (pat) {
    case 0: return buildP0()  // 1次1項 / 1次2項
    case 1: return buildP1()  // 定数1項 / 1次2項
    case 2: return buildP2()  // 定数1項 / 2次2項
    case 3: return buildP3()  // 1次2項 / 1次2項
    case 4: return buildP4()  // 1次2項 / 2次2項
    case 5: return buildP5()  // 1次2項 / 2次3項
    case 6: return buildP6()  // 2次2項 / 2次2項
    case 7: return buildP7()  // 3次2項 / 2次3項
    default: return buildP0()
  }
}

// ── パターン0：1次1項f=ax / g=cx+d ──────────────────────
function buildP0(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 6)
  const c  = fixed ? fixed.c  : randomNonZero(1, 5)
  const d  = fixed ? fixed.d  : randomNonZero(1, 8) * sign()

  const fK  = a === 1 ? 'x' : `${a}x`
  const gK  = lin(c, d)
  const dfK = `${a}`
  const dgK = `${c}`

  // 分子 = df*g - f*dg = a(cx+d) - ax*c = acx+ad - acx = ad
  const num = {}
  addTermTo(num, 0, a * d)
  const numStr = formatTermsObj(num)

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: `${a}\\cdot(${gK})-(${fK})\\cdot ${c}`,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '1次1項/1次2項',
  }
}

// ── パターン1：定数1項f=a / g=cx+d ──────────────────────
function buildP1(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 9)
  const c  = fixed ? fixed.c  : randomNonZero(1, 5)
  const d  = fixed ? fixed.d  : randomNonZero(1, 8) * sign()

  const fK  = `${a}`
  const gK  = lin(c, d)
  const dfK = `0`
  const dgK = `${c}`

  // 分子 = 0*g - a*c = -ac
  const numStr = formatTermsObj({ 0: -a * c })

  const midK = `0\\cdot(${gK})-(${fK})\\cdot ${c}`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '定数1項/1次2項',
  }
}

// ── パターン2：定数1項f=a / g=cx^n+d ────────────────────
function buildP2(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 8)
  const c  = fixed ? fixed.c  : randomNonZero(1, 4)
  const n  = fixed ? fixed.n  : randomInt(2, 3)
  const d  = fixed ? fixed.d  : randomNonZero(1, 6) * sign()

  const fK  = `${a}`
  const gK  = poly2(c, n, d)
  const dfK = `0`
  const dgK = formatMonomial(c * n, n - 1)

  // 分子 = 0 - a*(cn*x^{n-1}) = -acn * x^{n-1}
  const numStr = formatTermsObj({ [n - 1]: -a * c * n })

  const midK = `0\\cdot(${gK})-(${fK})\\cdot ${dgK}`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '定数1項/2次2項',
  }
}

// ── パターン3：1次2項f=ax+b / g=cx+d ────────────────────
function buildP3(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 5)
  const b  = fixed ? fixed.b  : randomNonZero(1, 6) * sign()
  const c  = fixed ? fixed.c  : randomNonZero(1, 5)
  const d  = fixed ? fixed.d  : randomNonZero(1, 6) * sign()

  const fK  = lin(a, b)
  const gK  = lin(c, d)
  const dfK = `${a}`
  const dgK = `${c}`

  // 分子 = a(cx+d) - (ax+b)c = acx+ad - acx - bc = ad-bc
  const numStr = formatTermsObj({ 0: a * d - b * c })

  const midK = `${a}\\cdot(${gK})-(${fK})\\cdot ${c}`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '1次2項/1次2項',
  }
}

// ── パターン4：1次2項f=ax+b / g=cx^2+d ─────────────────
function buildP4(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 4)
  const b  = fixed ? fixed.b  : randomNonZero(1, 6) * sign()
  const c  = fixed ? fixed.c  : randomNonZero(1, 3)
  const d  = fixed ? fixed.d  : randomNonZero(1, 6) * sign()

  const fK  = lin(a, b)
  const gK  = poly2(c, 2, d)
  const dfK = `${a}`
  const dgK = formatMonomial(2 * c, 1)

  // 分子 = a(cx^2+d) - (ax+b)(2cx)
  //      = acx^2 + ad - 2acx^2 - 2bcx
  //      = -acx^2 - 2bcx + ad
  const num = {}
  addTermTo(num, 2, a * c)
  addTermTo(num, 0, a * d)
  addTermTo(num, 2, -(a * c * 2 * 2) / 2)  // 丁寧に計算
  // もう一度正確に：
  const numClean = {}
  addTermTo(numClean, 2, a * c - 2 * a * c)   // acx^2 - 2acx^2 = -acx^2
  addTermTo(numClean, 1, -2 * b * c)            // -2bcx
  addTermTo(numClean, 0, a * d)                  // ad
  const numStr = formatTermsObj(numClean)

  const midK = `${dfK}\\cdot(${gK})-(${fK})\\cdot(${dgK})`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '1次2項/2次2項',
  }
}

// ── パターン5：1次2項f=ax+b / g=cx^2+dx+e ──────────────
function buildP5(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 4)
  const b  = fixed ? fixed.b  : randomNonZero(1, 5) * sign()
  const c  = fixed ? fixed.c  : randomNonZero(1, 3)
  const d  = fixed ? fixed.d  : randomNonZero(1, 4) * sign()
  const e  = fixed ? fixed.e  : randomNonZero(1, 5) * sign()

  const fK  = lin(a, b)
  const gK  = poly3(c, d, e)
  const dfK = `${a}`
  const dgK = formatTermsObj({ 1: 2 * c, 0: d })

  // 分子 = a(cx^2+dx+e) - (ax+b)(2cx+d)
  //      = acx^2+adx+ae - (2acx^2+adx+2bcx+bd)
  //      = acx^2+adx+ae - 2acx^2 - adx - 2bcx - bd
  //      = -acx^2 - 2bcx + ae - bd
  const numClean = {}
  addTermTo(numClean, 2, a * c - 2 * a * c)   // -acx^2
  addTermTo(numClean, 1, a * d - a * d - 2 * b * c)  // -2bcx
  addTermTo(numClean, 0, a * e - b * d)         // ae - bd
  const numStr = formatTermsObj(numClean)

  const midK = `${dfK}\\cdot(${gK})-(${fK})\\cdot(${dgK})`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '1次2項/2次3項',
  }
}

// ── パターン6：2次2項f=ax^2+b / g=cx^2+dx ──────────────
function buildP6(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 3)
  const b  = fixed ? fixed.b  : randomNonZero(1, 5) * sign()
  const c  = fixed ? fixed.c  : randomNonZero(1, 3)
  const d  = fixed ? fixed.d  : randomNonZero(1, 4) * sign()

  const fK  = poly2(a, 2, b)
  const gK  = `${poly2(c, 2, 0)}${d > 0 ? `+${d}x` : `${d}x`}`
    .replace('+-', '-')
  // gをもっとシンプルに：cx^2+dx（eなし）
  const gKatex2 = (() => {
    const cx2 = c === 1 ? 'x^{2}' : `${c}x^{2}`
    const dx  = d === 1 ? '+x' : d === -1 ? '-x' : d > 0 ? `+${d}x` : `${d}x`
    return cx2 + dx
  })()

  const dfK = formatMonomial(2 * a, 1)
  const dgK = formatTermsObj({ 1: 2 * c, 0: d })

  // 分子 = 2ax(cx^2+dx) - (ax^2+b)(2cx+d)
  //      = 2acx^3 + 2adx^2 - 2acx^3 - adx^2 - 2bcx - bd
  //      = adx^2 - 2bcx - bd
  const numClean = {}
  addTermTo(numClean, 2, 2 * a * d - a * d)   // adx^2
  addTermTo(numClean, 1, -2 * b * c)            // -2bcx
  addTermTo(numClean, 0, -b * d)                // -bd
  const numStr = formatTermsObj(numClean)

  const midK = `${dfK}\\cdot(${gKatex2})-(${fK})\\cdot(${dgK})`

  return {
    fKatex: fK, gKatex: gKatex2, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gKatex2})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gKatex2}}\\right)'`,
    patLabel: '2次2項/2次2項',
  }
}

// ── パターン7：3次2項f=ax^3+b / g=cx^2+dx+e ────────────
function buildP7(fixed) {
  const a  = fixed ? fixed.a  : randomNonZero(1, 2) * sign()
  const b  = fixed ? fixed.b  : randomNonZero(1, 4) * sign()
  const c  = fixed ? fixed.c  : randomNonZero(1, 2)
  const d  = fixed ? fixed.d  : randomNonZero(1, 3) * sign()
  const e  = fixed ? fixed.e  : randomNonZero(1, 4) * sign()

  const fK  = poly2(a, 3, b)
  const gK  = poly3(c, d, e)
  const dfK = formatMonomial(3 * a, 2)
  const dgK = formatTermsObj({ 1: 2 * c, 0: d })

  // 分子 = 3ax^2(cx^2+dx+e) - (ax^3+b)(2cx+d)
  //      = 3acx^4 + 3adx^3 + 3aex^2 - 2acx^4 - adx^3 - 2bcx - bd
  //      = acx^4 + 2adx^3 + 3aex^2 - 2bcx - bd
  const numClean = {}
  addTermTo(numClean, 4, a * c)        // acx^4
  addTermTo(numClean, 3, 2 * a * d)    // 2adx^3
  addTermTo(numClean, 2, 3 * a * e)    // 3aex^2
  addTermTo(numClean, 1, -2 * b * c)   // -2bcx
  addTermTo(numClean, 0, -b * d)        // -bd
  const numStr = formatTermsObj(numClean)

  const midK = `${dfK}\\cdot(${gK})-(${fK})\\cdot(${dgK})`

  return {
    fKatex: fK, gKatex: gK, dfKatex: dfK, dgKatex: dgK,
    midKatex: midK,
    numeratorStr: numStr,
    denominatorKatex: `(${gK})^2`,
    qKatex: `\\left(\\dfrac{${fK}}{${gK}}\\right)'`,
    patLabel: '3次2項/2次3項',
  }
}

// ── 例題生成（各パターン固定値2問） ──────────────────────
const EXAMPLES = {
  0: [
    buildP0({ a: 1, c: 1, d: 1 }),      // (x/x+1)'
    buildP0({ a: 5, c: 2, d: 1 }),      // (5x/2x+1)'
  ],
  1: [
    buildP1({ a: 7, c: 4, d: -3 }),     // (7/4x-3)'
    buildP1({ a: 3, c: 2, d: 5 }),      // (3/2x+5)'
  ],
  2: [
    buildP2({ a: 2, c: 1, n: 2, d: -1 }), // (2/x^2-1)'
    buildP2({ a: 5, c: 2, n: 2, d: 3 }),   // (5/2x^2+3)'
  ],
  3: [
    buildP3({ a: 2, b: 1, c: 3, d: 1 }),  // (2x+1/3x+1)'
    buildP3({ a: 1, b: -1, c: 2, d: 3 }), // (x-1/2x+3)'
  ],
  4: [
    buildP4({ a: 1, b: -1, c: 1, d: 2 }), // (x-1/x^2+2)'
    buildP4({ a: 2, b: 3, c: 1, d: -1 }), // (2x+3/x^2-1)'
  ],
  5: [
    buildP5({ a: 3, b: 2, c: 1, d: 1, e: -1 }),  // (3x+2/x^2+x-1)'
    buildP5({ a: 2, b: -1, c: 1, d: -2, e: 3 }), // (2x-1/x^2-2x+3)'
  ],
  6: [
    buildP6({ a: 1, b: 1, c: 3, d: 2 }),  // (x^2+1/3x^2+2x)'
    buildP6({ a: 2, b: -1, c: 1, d: 3 }), // (2x^2-1/x^2+3x)'
  ],
  7: [
    buildP7({ a: 1, b: 1, c: 1, d: 1, e: 1 }),   // (x^3+1/x^2+x+1)'
    buildP7({ a: 1, b: -1, c: 1, d: -1, e: 2 }), // (x^3-1/x^2-x+2)'
  ],
}

// ── Stage / 出題管理 ──────────────────────────────────────
// 8パターン × 3問 = 24問（順番はシャッフル）
// Stage2: 各パターン最初の2問、Stage3: 3問目
// ここでは「問番号 mod 3」でStageを決める
// 問題は generateQueue() で8パターンを3回ずつランダムに並べる

const STAGE2_COUNT = 2  // 1パターンあたりStage2問数
const FINAL_STREAK = 3

function generateQueue() {
  // 各パターンを3問ずつ、固定順（パターン0→7）で合計24問
  const queue = []
  for (let pat = 0; pat < 8; pat++) {
    for (let i = 0; i < 3; i++) {
      queue.push({ pat, indexInPat: i })
    }
  }
  return queue
}

// パターン内の出題番号 → Stage (2 or 3)
function getStage(indexInPat) {
  return indexInPat < STAGE2_COUNT ? 2 : 3
}

// ── UI部品 ───────────────────────────────────────────────
const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^2</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>x<sup style={{ fontSize: '11px' }}>2</sup></span>
    </div>
  </div>
)

const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }
  const btnStyle = (color) => ({
    padding: '12px 4px', minWidth: '46px', flex: 1, maxWidth: '60px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : color === 'caret' ? '#aaffaa55' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : color === 'caret' ? '#1a3a1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : color === 'caret' ? '#aaffaa' : 'white',
    fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
  })
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btnStyle('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        <button style={btnStyle('num')} onClick={() => onKey('x')}>x</button>
        <button style={btnStyle('caret')} onClick={() => onKey('^')}>^</button>
        <button style={btnStyle('num')} onClick={() => onKey('+')}>+</button>
        <button style={btnStyle('num')} onClick={() => onKey('-')}>-</button>
      </div>
      <div style={rowStyle}>
        <button style={{ ...btnStyle('del'), flex: 1, maxWidth: '90px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btnStyle('enter'), flex: 2, maxWidth: '170px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

const singleBoxStyle = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px', minWidth: '140px', padding: '4px 12px',
  textAlign: 'center', color: wrong ? '#ff9999' : '#4db8ff',
  fontWeight: 'bold', fontSize: '18px', fontFamily: 'monospace',
})

// ── 例題表示コンポーネント ────────────────────────────────
function ExampleBox({ ex, stage }) {
  // Stage2：3行（= を aligned で揃える）
  // 行1: (f/g)' = (f)'・g - f・(g)' / g^2  （微分記号付き）
  // 行2:       = 数値代入済み式 / g^2
  // 行3:       = 最終答え / g^2
  if (stage === 2) {
    const math = [
      `\\begin{aligned}`,
      `${ex.qKatex} &= \\dfrac{(${ex.fKatex})'\\cdot(${ex.gKatex})-(${ex.fKatex})\\cdot(${ex.gKatex})'}{${ex.denominatorKatex}} \\\\[6pt]`,
      `&= \\dfrac{${ex.midKatex}}{${ex.denominatorKatex}} \\\\[6pt]`,
      `&= \\dfrac{${ex.numeratorStr}}{${ex.denominatorKatex}}`,
      `\\end{aligned}`,
    ].join('\n')
    return <div style={{ marginBottom: '10px' }}><BlockMath math={math} /></div>
  }

  // Stage3：2行（= を aligned で揃える）
  // 行1: (f/g)' = (f)'・g - f・(g)' / g^2
  // 行2:       = 最終答え / g^2
  const math = [
    `\\begin{aligned}`,
    `${ex.qKatex} &= \\dfrac{(${ex.fKatex})'\\cdot(${ex.gKatex})-(${ex.fKatex})\\cdot(${ex.gKatex})'}{${ex.denominatorKatex}} \\\\[6pt]`,
    `&= \\dfrac{${ex.numeratorStr}}{${ex.denominatorKatex}}`,
    `\\end{aligned}`,
  ].join('\n')
  return <div style={{ marginBottom: '10px' }}><BlockMath math={math} /></div>
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step8() {
  const navigate = useNavigate()

  const [queue]    = useState(() => generateQueue())
  const [qIdx,     setQIdx]     = useState(0)
  const [streak,   setStreak]   = useState(0)
  const [cleared,  setCleared]  = useState(false)

  // 各パターンの出題カウンタ（パターンごとに何問目か）
  const [patCount, setPatCount] = useState({})

  // 現在の問題を生成
  const [problem,  setProblem]  = useState(() => buildProblem(queue[0].pat))

  // 入力
  const [answer,   setAnswer]   = useState('')
  const [msg,      setMsg]      = useState('')
  const [locked,   setLocked]   = useState(false)

  const current = queue[qIdx]
  const pat     = current.pat
  const idxInP  = current.indexInPat
  const stage   = getStage(idxInP)
  const examples = EXAMPLES[pat]

  function resetStates() {
    setAnswer(''); setMsg(''); setLocked(false)
  }

  function advance() {
    if (stage === 3) {
      const newStreak = streak + 1
      if (newStreak >= FINAL_STREAK) {
        setCleared(true)
        return
      }
      setStreak(newStreak)
    }
    const nextIdx = qIdx + 1
    if (nextIdx >= queue.length) {
      setCleared(true)
      return
    }
    setQIdx(nextIdx)
    setProblem(buildProblem(queue[nextIdx].pat))
    resetStates()
  }

  const kb = {
    key:   (v) => { if (locked) return; if (msg === '❌') setMsg(''); setAnswer(s => s + v) },
    del:   ()  => { if (locked) return; if (msg === '❌') setMsg(''); setAnswer(s => s.slice(0, -1)) },
    enter: () => {
      if (locked || !answer) return
      const ok = checkAnswer(answer, problem.numeratorStr)
      if (ok) { setMsg('⭕'); setLocked(true) }
      else    { setMsg('❌') }
    },
  }

  // ── クリア画面 ──────────────────────────────────────────
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 8</h1>
      <div style={{ fontSize: '80px', margin: '16px 0' }}>🏆</div>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
        <button
          onClick={() => {
            setQIdx(0); setStreak(0); setCleared(false)
            setProblem(buildProblem(queue[0].pat)); resetStates()
          }}
          style={{ padding: '14px 32px', fontSize: '28px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer' }}>
          🔁
        </button>
        <button onClick={() => navigate('/')}
          style={{ padding: '14px 28px', fontSize: '18px', borderRadius: '10px', border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )

  // ── メイン画面 ──────────────────────────────────────────
  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 8</h1>

      {/* 微分記号の対応表示 */}
      <div style={{
        textAlign: 'center', marginBottom: '14px',
        background: '#1a1a2e', border: '1px solid #555',
        borderRadius: '10px', padding: '8px 16px',
        color: '#aaa', fontSize: '14px',
      }}>
        <InlineMath math={`\\left(\\dfrac{f}{g}\\right)' = D\\!\\left(\\dfrac{f}{g}\\right) = \\dfrac{d}{dx}\\!\\left(\\dfrac{f}{g}\\right)`} />
      </div>

      {/* 進捗バッジ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{
          padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
          backgroundColor: '#2d6a2d', color: 'white',
        }}>
          {qIdx + 1} / {queue.length}
        </span>
        <span style={{
          padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
          backgroundColor: '#333', color: 'white',
        }}>
          {stage === 2 ? '📝 Stage 2' : '🎯 Stage 3'}
        </span>
        {stage === 3 && (
          <span style={{
            padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
            backgroundColor: '#5a4a00', color: '#ffe07a',
          }}>
            🏁 {streak} / {FINAL_STREAK}
          </span>
        )}
      </div>

      {/* 例題エリア */}
      <div style={{ background: '#1a1a2e', border: '1px solid #444', borderRadius: '12px', padding: '16px 24px', marginBottom: '20px' }}>
        {/* 公式 */}
        <BlockMath math={String.raw`\left(\frac{f}{g}\right)' = \frac{f'\cdot g - f\cdot g'}{g^2}`} />
        {/* 例題1 */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '4px' }}>
          <ExampleBox ex={examples[0]} stage={stage} />
        </div>
        {/* 例題2 */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '4px' }}>
          <ExampleBox ex={examples[1]} stage={stage} />
        </div>
      </div>

      {/* 問題エリア */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>

        {/* Stage2：公式展開行＋= ? （aligned で = 位置を揃える） */}
        {stage === 2 && (
          <div style={{ overflowX: 'auto' }}>
            <BlockMath math={[
              `\\begin{aligned}`,
              `${problem.qKatex} &= \\dfrac{(${problem.fKatex})'\\cdot(${problem.gKatex})-(${problem.fKatex})\\cdot(${problem.gKatex})'}{${problem.denominatorKatex}} \\\\[6pt]`,
              `&= \\,?`,
              `\\end{aligned}`,
            ].join('\n')} />
          </div>
        )}

        {/* Stage3：問題のみ */}
        {stage === 3 && (
          <BlockMath math={`${problem.qKatex} = \\,?`} />
        )}

        {/* 答え表示エリア（分数形式） */}
        <div style={{ marginTop: '12px' }}>
          {/* 入力プレビュー（分数の形で表示） */}
          {!locked && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#aaa', fontSize: '18px' }}>=</span>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* 分子入力ボックス */}
                <div style={singleBoxStyle(msg === '❌')}>{answer || '?'}</div>
                {/* 横線 */}
                <div style={{ width: '100%', height: '2px', background: '#4db8ff', margin: '3px 0' }} />
                {/* 分母（固定表示） */}
                <div style={{ color: '#88ccff', fontWeight: 'bold', fontSize: '16px' }}>
                  <InlineMath math={problem.denominatorKatex} />
                </div>
              </div>
              {/* KaTeXプレビュー */}
              {answer && (
                <>
                  <span style={{ color: '#888', fontSize: '14px' }}>→</span>
                  <div style={{ background: '#1a2e1a', border: '1.5px solid #4dff88', borderRadius: '6px', padding: '4px 12px', color: '#88ff88' }}>
                    <InlineMath math={`\\dfrac{${toKatex(answer)}}{${problem.denominatorKatex}}`} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 正解時の表示 */}
          {locked && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px' }}>⭕</div>
              <div style={{ color: '#88ff88', marginTop: '8px' }}>
                <InlineMath math={`\\dfrac{${problem.numeratorStr}}{${problem.denominatorKatex}}`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 判定メッセージ */}
      {!locked && msg && (
        <div style={{ textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <span style={{ fontSize: '48px' }}>{msg}</span>
            {msg === '❌' && <div style={{ fontSize: '32px', marginTop: '2px' }}>🔄</div>}
          </div>
        </div>
      )}

      {/* キーボード / Nextボタン */}
      {locked ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advance} style={{
            padding: '14px 40px', fontSize: '20px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold',
          }}>Next ▶</button>
        </div>
      ) : (
        <>
          <CaretGuide />
          <NumKeyboard onKey={kb.key} onDelete={kb.del} onEnter={kb.enter} />
        </>
      )}

      {/* Homeボタン */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{
          padding: '12px 28px', fontSize: '16px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer',
        }}>← Home</button>
      </div>
    </div>
  )
}
