import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate, Link } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const InlineMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// sqrt(...) / cbrt(...) を \sqrt{...} / \sqrt[3]{...} に変換（入れ子の括弧にも対応）
function convertRoots(str) {
  let out = ''
  let i = 0
  while (i < str.length) {
    const isSqrt = str.startsWith('sqrt(', i)
    const isCbrt = str.startsWith('cbrt(', i)
    if (isSqrt || isCbrt) {
      const start = i + 5
      let depth = 1
      let j = start
      while (j < str.length && depth > 0) {
        if (str[j] === '(') depth++
        else if (str[j] === ')') depth--
        j++
      }
      const closed = depth === 0
      const inner = str.slice(start, closed ? j - 1 : j)
      const convertedInner = convertRoots(inner)
      out += isCbrt ? `\\sqrt[3]{${convertedInner}}` : `\\sqrt{${convertedInner}}`
      i = j
    } else {
      out += str[i]
      i++
    }
  }
  return out
}

function toKatex(str) {
  if (!str) return ''
  let s = convertRoots(str)
  s = s
    .replace(/\^(-?\d+)/g, (_, e) => `^{${e}}`)     // 完成した指数（例: x^3, x^-2）
    .replace(/\^(-?)$/, (_, sign) => `^{${sign}}`)    // 入力途中の^を安全な形に
  return s
}

// 答えチェック：^{-2} と ^-2 などを同一視
function norm(s) {
  return String(s)
    .replace(/\s/g, '')
    .replace(/\{(-?\d+)\}/g, '$1')
    .toLowerCase()
}
function checkAns(userStr, correctList) {
  if (!userStr) return false
  const u = norm(userStr)
  return correctList.some(c => norm(c) === u)
}

// solution配列 → aligned KaTeX
function buildAligned(solution) {
  const lines = solution.map((line, i) => {
    if (i === 0) return `${line} &`
    const t = line.trim()
    return t.startsWith('=') ? `& ${t}` : `&= ${t}`
  })
  return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`
}

// 穴埋めトークン {A}{B}{C} を現在の状態に応じて置き換える
function fillLine(template, blanks, vals, sts) {
  let out = template
  Object.keys(blanks).forEach((key) => {
    const token = `{${key}}`
    if (!out.includes(token)) return
    let repl
    if (sts[key] === 'ok') {
      repl = `\\textcolor{#4dff88}{${blanks[key].display}}`
    } else if (sts[key] === 'ng') {
      repl = `\\textcolor{#ff6666}{${toKatex(vals[key]) || '?'}}`
    } else if (vals[key]) {
      repl = `\\textcolor{#4db8ff}{${toKatex(vals[key])}}`
    } else {
      repl = `\\boxed{?}`
    }
    out = out.split(token).join(repl)
  })
  return out
}

// ── タイプ定義（常時表示する基本式・合成関数版の式） ──────────────
const TYPES = [
  { // A: 指数＝自然数
    line1: "(x^n)' = nx^{n-1}",
    line2: "(X^n)' = nX^{n-1}\\cdot X'",
  },
  { // B: 指数＝負の数・前半
    line1: '\\left(\\dfrac{a}{x^n}\\right)\' = -\\dfrac{an}{x^{n+1}}',
    line2: '\\left(\\dfrac{a}{X^n}\\right)\' = -\\dfrac{an}{X^{n+1}}\\cdot X\'',
  },
  { // C: 指数＝負の数・後半（Bと同じ基本式）
    line1: '\\left(\\dfrac{a}{x^n}\\right)\' = -\\dfrac{an}{x^{n+1}}',
    line2: '\\left(\\dfrac{a}{X^n}\\right)\' = -\\dfrac{an}{X^{n+1}}\\cdot X\'',
  },
  { // D: 指数＝分数
    line1: "(x^{1/2})' = \\dfrac{1}{2\\sqrt{x}}",
    line2: "(X^{1/2})' = \\dfrac{X'}{2\\sqrt{X}}",
  },
  { // E: 指数＝マイナス分数
    line1: "(x^{-1/2})' = -\\dfrac{1}{2x\\sqrt{x}}",
    line2: "(X^{-1/2})' = -\\dfrac{X'}{2X\\sqrt{X}}",
  },
]

// ── 問題データ（全20問） ──────────────────────────────────────
const PROBLEMS = [
  // ===== タイプA：指数＝自然数 =====
  {
    typeIdx: 0,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (n=3)', lines: ["(X^{3})' = {A}X^{2}\\cdot X'"] },
      { label: 'Step2 (X=2x+1)', lines: ["((2x+1)^3)'", '= 3(2x+1)^2\\cdot {B}', '= 3(2x+1)^2\\cdot 2', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['3'], display: '3' },
      B: { answers: ["(2x+1)'"], display: "(2x+1)'" },
      C: { answers: ['6(2x+1)^2'], display: '6(2x+1)^2' },
    },
  },
  {
    typeIdx: 0,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (n=2)', lines: ["(X^{2})' = {A}X\\cdot X'"] },
      { label: 'Step2 (X=3x^2-1)', lines: ["((3x^2-1)^2)'", '= 2(3x^2-1)\\cdot {B}', '= 2(3x^2-1)\\cdot 6x', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['2'], display: '2' },
      B: { answers: ["(3x^2-1)'"], display: "(3x^2-1)'" },
      C: { answers: ['12x(3x^2-1)'], display: '12x(3x^2-1)' },
    },
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["((3x+1)^4)' = {A}"] }],
    blanks: { A: { answers: ['12(3x+1)^3'], display: '12(3x+1)^3' } },
    hint: ["((2x+1)^3)'", "= 3(2x+1)^2\\cdot(2x+1)'", '= 3(2x+1)^2\\cdot 2', '= 6(2x+1)^2'],
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["((x^2-x+1)^3)' = {A}"] }],
    blanks: { A: { answers: ['3(x^2-x+1)^2(2x-1)'], display: '3(x^2-x+1)^2(2x-1)' } },
    hint: ["((3x^2-1)^2)'", "= 2(3x^2-1)\\cdot(3x^2-1)'", '= 2(3x^2-1)\\cdot 6x', '= 12x(3x^2-1)'],
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["((x^2+x+1)^5)' = {A}"] }],
    blanks: { A: { answers: ['5(x^2+x+1)^4(2x+1)'], display: '5(x^2+x+1)^4(2x+1)' } },
    hint: ["((2x+1)^3)'", "= 3(2x+1)^2\\cdot(2x+1)'", '= 3(2x+1)^2\\cdot 2', '= 6(2x+1)^2'],
  },

  // ===== タイプB：指数＝負の数・前半 =====
  {
    typeIdx: 1,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (a=1, n=1)', lines: ["(1/X)' = {A}X^{-2}\\cdot X'"] },
      { label: 'Step2 (X=x+1)', lines: ["(1/(x+1))'", '= {A}/(x+1)^2\\cdot {B}', '= -1/(x+1)^2\\cdot 1', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['-1'], display: '-1' },
      B: { answers: ["(x+1)'"], display: "(x+1)'" },
      C: { answers: ['-1/(x+1)^2'], display: '-\\dfrac{1}{(x+1)^2}' },
    },
  },
  {
    typeIdx: 1,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (a=2, n=3)', lines: ["(2/X^{3})' = {A}X^{-4}\\cdot X'"] },
      { label: 'Step2 (X=2x+1)', lines: ["(2/(2x+1)^3)'", '= {A}/(2x+1)^4\\cdot {B}', '= -6/(2x+1)^4\\cdot 2', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['-6'], display: '-6' },
      B: { answers: ["(2x+1)'"], display: "(2x+1)'" },
      C: { answers: ['-12/(2x+1)^4'], display: '-\\dfrac{12}{(2x+1)^4}' },
    },
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(1/(x-1)^2)' = {A}"] }],
    blanks: { A: { answers: ['-2/(x-1)^3'], display: '-\\dfrac{2}{(x-1)^3}' } },
    hint: ["(1/(x+1))'", "= -1/(x+1)^2\\cdot(x+1)'", '= -1/(x+1)^2\\cdot 1', '= -1/(x+1)^2'],
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(2/(x^2-x+1)^3)' = {A}"] }],
    blanks: { A: { answers: ['-6(2x-1)/(x^2-x+1)^4'], display: '-\\dfrac{6(2x-1)}{(x^2-x+1)^4}' } },
    hint: ["(2/(2x+1)^3)'", "= -6/(2x+1)^4\\cdot(2x+1)'", '= -6/(2x+1)^4\\cdot 2', '= -12/(2x+1)^4'],
  },

  // ===== タイプC：指数＝負の数・後半 =====
  {
    typeIdx: 2,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (n=3)', lines: ["(X^{-3})' = {A}X^{-4}\\cdot X'"] },
      { label: 'Step2 (X=2x-1)', lines: ["(1/(2x-1)^3)'", '= {A}/(2x-1)^4\\cdot {B}', '= -3/(2x-1)^4\\cdot 2', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['-3'], display: '-3' },
      B: { answers: ["(2x-1)'"], display: "(2x-1)'" },
      C: { answers: ['-6/(2x-1)^4'], display: '-\\dfrac{6}{(2x-1)^4}' },
    },
  },
  {
    typeIdx: 2,
    blankKeys: ['A', 'B', 'C'],
    steps: [
      { label: 'Step1 (n=2)', lines: ["(X^{2})' = {A}X\\cdot X'"] },
      { label: 'Step2 (X=3/(x+1))', lines: ["((3/(x+1))^2)'", '= {A}\\cdot\\dfrac{3}{x+1}\\cdot {B}', '= 2\\cdot\\dfrac{3}{x+1}\\cdot\\left(-\\dfrac{3}{(x+1)^2}\\right)', '= {C}'] },
    ],
    blanks: {
      A: { answers: ['2'], display: '2' },
      B: { answers: ['(3/(x+1))\''], display: '\\left(\\dfrac{3}{x+1}\\right)\'' },
      C: { answers: ['-18/(x+1)^3'], display: '-\\dfrac{18}{(x+1)^3}' },
    },
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["((2/(2x+1))^2)' = {A}"] }],
    blanks: { A: { answers: ['-16/(2x+1)^3'], display: '-\\dfrac{16}{(2x+1)^3}' } },
    hint: [
      "((3/(x+1))^2)'",
      "= 2\\cdot\\dfrac{3}{x+1}\\cdot\\left(\\dfrac{3}{x+1}\\right)'",
      '= 2\\cdot\\dfrac{3}{x+1}\\cdot\\left(-\\dfrac{3}{(x+1)^2}\\right)',
      '= -\\dfrac{18}{(x+1)^3}',
    ],
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(1/(x^2+x)^2)' = {A}"] }],
    blanks: { A: { answers: ['-2(2x+1)/(x^2+x)^3'], display: '-\\dfrac{2(2x+1)}{(x^2+x)^3}' } },
    hint: ["(1/(2x-1)^3)'", "= -3/(2x-1)^4\\cdot(2x-1)'", '= -3/(2x-1)^4\\cdot 2', '= -6/(2x-1)^4'],
  },

  // ===== タイプD：指数＝分数 =====
  {
    typeIdx: 3,
    blankKeys: ['A', 'B'],
    steps: [
      { label: 'Step1 (X=2x^2-1)', lines: ["(sqrt(2x^2-1))'", '= \\dfrac{1}{2\\sqrt{2x^2-1}}\\cdot {A}', '= \\dfrac{1}{2\\sqrt{2x^2-1}}\\cdot 4x'] },
      { label: null, lines: ['= {B}'] },
    ],
    blanks: {
      A: { answers: ["(2x^2-1)'"], display: "(2x^2-1)'" },
      B: { answers: ['2x/sqrt(2x^2-1)'], display: '\\dfrac{2x}{\\sqrt{2x^2-1}}' },
    },
  },
  {
    typeIdx: 3,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(sqrt(x^2+2))' = {A}"] }],
    blanks: { A: { answers: ['x/sqrt(x^2+2)'], display: '\\dfrac{x}{\\sqrt{x^2+2}}' } },
    hint: ["(sqrt(2x^2-1))'", '= \\dfrac{(2x^2-1)\'}{2\\sqrt{2x^2-1}}', '= \\dfrac{4x}{2\\sqrt{2x^2-1}}', '= \\dfrac{2x}{\\sqrt{2x^2-1}}'],
  },
  {
    typeIdx: 3,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(sqrt(x^2-x-1))' = {A}"] }],
    blanks: { A: { answers: ['(2x-1)/(2sqrt(x^2-x-1))'], display: '\\dfrac{2x-1}{2\\sqrt{x^2-x-1}}' } },
    hint: ["(sqrt(2x^2-1))'", '= \\dfrac{(2x^2-1)\'}{2\\sqrt{2x^2-1}}', '= \\dfrac{4x}{2\\sqrt{2x^2-1}}', '= \\dfrac{2x}{\\sqrt{2x^2-1}}'],
  },
  {
    typeIdx: 3,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(cbrt(3x^2+6x-1))' = {A}"] }],
    blanks: { A: { answers: ['2(x+1)/cbrt((3x^2+6x-1)^2)'], display: '\\dfrac{2(x+1)}{\\sqrt[3]{(3x^2+6x-1)^2}}' } },
    hint: ["(sqrt(2x^2-1))'", '= \\dfrac{(2x^2-1)\'}{2\\sqrt{2x^2-1}}', '= \\dfrac{4x}{2\\sqrt{2x^2-1}}', '= \\dfrac{2x}{\\sqrt{2x^2-1}}'],
  },

  // ===== タイプE：指数＝マイナス分数 =====
  {
    typeIdx: 4,
    blankKeys: ['A', 'B'],
    steps: [
      { label: 'Step1 (X=x^2-1)', lines: ["(1/sqrt(x^2-1))'", '= -\\dfrac{1}{2(x^2-1)\\sqrt{x^2-1}}\\cdot {A}', '= -\\dfrac{1}{2(x^2-1)\\sqrt{x^2-1}}\\cdot 2x'] },
      { label: null, lines: ['= {B}'] },
    ],
    blanks: {
      A: { answers: ["(x^2-1)'"], display: "(x^2-1)'" },
      B: { answers: ['-x/((x^2-1)sqrt(x^2-1))'], display: '-\\dfrac{x}{(x^2-1)\\sqrt{x^2-1}}' },
    },
  },
  {
    typeIdx: 4,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(3/sqrt(2x^2+1))' = {A}"] }],
    blanks: { A: { answers: ['-6x/((2x^2+1)sqrt(2x^2+1))'], display: '-\\dfrac{6x}{(2x^2+1)\\sqrt{2x^2+1}}' } },
    hint: [
      "(1/sqrt(x^2-1))'",
      "= -\\dfrac{(x^2-1)'}{2(x^2-1)\\sqrt{x^2-1}}",
      '= -\\dfrac{2x}{2(x^2-1)\\sqrt{x^2-1}}',
      '= -\\dfrac{x}{(x^2-1)\\sqrt{x^2-1}}',
    ],
  },
  {
    typeIdx: 4,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(5/cbrt(x^2-x-1))' = {A}"] }],
    blanks: { A: { answers: ['-5(2x-1)/(3(x^2-x-1)cbrt(x^2-x-1))'], display: '-\\dfrac{5(2x-1)}{3(x^2-x-1)\\sqrt[3]{x^2-x-1}}' } },
    hint: [
      "(1/sqrt(x^2-1))'",
      "= -\\dfrac{(x^2-1)'}{2(x^2-1)\\sqrt{x^2-1}}",
      '= -\\dfrac{2x}{2(x^2-1)\\sqrt{x^2-1}}',
      '= -\\dfrac{x}{(x^2-1)\\sqrt{x^2-1}}',
    ],
  },
]

// ── UI部品 ──────────────────────────────────────────────
const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>sqrt(x^2+1)</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <InlineMath math="\sqrt{x^2+1}" />
    </div>
  </div>
)

const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px', flexWrap: 'wrap' }
  const btn = (color) => ({
    padding: '12px 4px', minWidth: '42px', flex: 1, maxWidth: '58px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : color === 'root' ? '#ffd24d55' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : color === 'root' ? '#3a2f1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : color === 'root' ? '#ffd24d' : 'white',
    fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
  })
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btn('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        <button style={btn('num')} onClick={() => onKey('x')}>x</button>
        <button style={btn('num')} onClick={() => onKey('^')}>^</button>
        <button style={btn('num')} onClick={() => onKey('+')}>+</button>
        <button style={btn('num')} onClick={() => onKey('-')}>−</button>
        <button style={btn('num')} onClick={() => onKey('/')}>／</button>
        <button style={btn('num')} onClick={() => onKey('(')}>（</button>
        <button style={btn('num')} onClick={() => onKey(')')}>）</button>
      </div>
      <div style={rowStyle}>
        <button style={btn('root')} onClick={() => onKey('sqrt(')}>√</button>
        <button style={btn('root')} onClick={() => onKey('cbrt(')}>∛</button>
        <button style={btn('num')} onClick={() => onKey("'")}>′</button>
        <button style={{ ...btn('del'), flex: 1, maxWidth: '90px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btn('enter'), flex: 2, maxWidth: '170px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

const inputBox = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px', minWidth: '140px', padding: '4px 12px',
  textAlign: 'center', color: wrong ? '#ff9999' : '#4db8ff',
  fontWeight: 'bold', fontSize: '18px', fontFamily: 'monospace',
})

// 穴埋め番号チップ（①②③...・問題ごとにブランク数が変わる）
const BlankChips = ({ blankKeys, sts, phaseIndex }) => {
  const labels = ['①', '②', '③']
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
      {blankKeys.map((key, i) => {
        const st = sts[key]
        const active = i === phaseIndex
        const bg = st === 'ok' ? '#1a3a1a' : active ? '#0a2e4a' : '#1a1a2e'
        const border = st === 'ok' ? '#4dff88' : st === 'ng' ? '#ff6666' : active ? '#4db8ff' : '#555'
        const color = st === 'ok' ? '#4dff88' : st === 'ng' ? '#ff6666' : active ? '#4db8ff' : '#888'
        return (
          <div key={key} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold',
            background: bg, border: `2px solid ${border}`, color,
          }}>
            {labels[i]}{st === 'ok' ? ' ✓' : ''}
          </div>
        )
      })}
    </div>
  )
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step11() {
  const navigate = useNavigate()

  const [probIdx, setProbIdx] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [vals, setVals] = useState({})
  const [sts, setSts] = useState({})
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [hintStep, setHintStep] = useState(0)
  const [hintTimerId, setHintTimerId] = useState(null)

  const cur = PROBLEMS[probIdx]
  const total = PROBLEMS.length
  const curType = TYPES[cur.typeIdx]
  const curKey = phaseIndex < cur.blankKeys.length ? cur.blankKeys[phaseIndex] : null
  const allDone = phaseIndex >= cur.blankKeys.length

  function clearHintTimer(id) {
    if (id) clearInterval(id)
  }

  function startHint(hint) {
    setHintStep(1)
    let step = 1
    const id = setInterval(() => {
      step += 1
      if (step <= hint.length) {
        setHintStep(step)
      } else {
        clearInterval(id)
      }
    }, 2000)
    setHintTimerId(id)
  }

  function reset() {
    setPhaseIndex(0)
    setVals({})
    setSts({})
    setHintStep(0)
    setHintTimerId(prev => { clearHintTimer(prev); return null })
  }

  function advanceProblem() {
    if (probIdx + 1 >= total) { setCleared(true); return }
    setProbIdx(i => i + 1)
    reset()
  }

  const kb = {
    key: (v) => {
      if (allDone || !curKey) return
      if (sts[curKey] === 'ng') setSts(s => ({ ...s, [curKey]: '' }))
      setVals(s => ({ ...s, [curKey]: (s[curKey] || '') + v }))
    },
    del: () => {
      if (allDone || !curKey) return
      if (sts[curKey] === 'ok') return
      setVals(s => ({ ...s, [curKey]: (s[curKey] || '').slice(0, -1) }))
    },
    enter: () => {
      if (allDone || !curKey) return
      const v = vals[curKey]
      if (!v) return
      if (checkAns(v, cur.blanks[curKey].answers)) {
        setSts(s => ({ ...s, [curKey]: 'ok' }))
        setHintStep(0)
        setHintTimerId(prev => { clearHintTimer(prev); return null })
        const nextPhase = phaseIndex + 1
        if (nextPhase >= cur.blankKeys.length) {
          setDoneCount(c => c + 1)
        }
        setPhaseIndex(nextPhase)
      } else {
        setSts(s => ({ ...s, [curKey]: 'ng' }))
        if (hintStep === 0 && cur.hint) {
          clearHintTimer(hintTimerId)
          startHint(cur.hint)
        }
      }
    },
  }

  // クリア画面
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 11</h1>
      <div style={{ fontSize: '80px', margin: '16px 0' }}>🏆</div>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
        <button onClick={() => { setProbIdx(0); setCleared(false); setDoneCount(0); reset() }}
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

  // メイン画面
  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 11</h1>

      {/* 微分記号 */}
      <div style={{ textAlign: 'center', marginBottom: '10px', background: '#1a1a2e', border: '1px solid #555', borderRadius: '10px', padding: '8px 16px' }}>
        <InlineMath math={"(f)' = D(f) = \\dfrac{d}{dx}(f)"} />
      </div>

      {/* Prep1リンク */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Link to="/prep1" style={{ color: '#4db8ff', fontSize: '14px', textDecoration: 'none' }}>
          📘 Prep 1
        </Link>
      </div>

      {/* 進捗 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      {/* ── 基本式パネル（常時表示） ── */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', background: '#1a1a2e' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={curType.line1} />
        </div>
        <div style={{ borderTop: '1px solid #444', paddingTop: '8px', textAlign: 'center' }}>
          <span style={{ color: '#ffd24d', fontSize: '13px', marginRight: '6px' }}>(Base)</span>
          <InlineMath math={curType.line2} />
        </div>
      </div>

      {/* ── 問題エリア ── */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>

        {cur.blankKeys.length > 1 && (
          <BlankChips blankKeys={cur.blankKeys} sts={sts} phaseIndex={phaseIndex} />
        )}

        {cur.steps.map((step, si) => (
          <div key={si} style={{ marginBottom: '10px' }}>
            {step.label && (
              <div style={{ color: '#aaa', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>
                {step.label}
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <BlockMath math={buildAligned(step.lines.map(t => fillLine(t, cur.blanks, vals, sts)))} />
            </div>
          </div>
        ))}

        {/* 入力欄 or 完了表示 */}
        {!allDone ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <div style={inputBox(sts[curKey] === 'ng')}>{vals[curKey] || '?'}</div>
            {vals[curKey] && (
              <>
                <span style={{ color: '#888' }}>→</span>
                <div style={{ background: '#1a2e1a', border: '1.5px solid #4dff88', borderRadius: '6px', padding: '4px 12px', color: '#88ff88' }}>
                  <InlineMath math={toKatex(vals[curKey])} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '36px', marginTop: '8px' }}>⭕</div>
        )}
        {!allDone && sts[curKey] === 'ng' && (
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
          </div>
        )}

        {/* ヒント表示（不正解後・2秒間隔で段階表示） */}
        {hintStep > 0 && cur.hint && !allDone && (
          <div style={{ marginTop: '12px', background: '#0f2a1a', border: '1.5px solid #44bb66', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ color: '#88ff88', fontSize: '13px', marginBottom: '6px', textAlign: 'center' }}>
              step :
            </div>
            <div style={{ overflowX: 'auto' }}>
              <BlockMath math={buildAligned(cur.hint.slice(0, hintStep))} />
            </div>
          </div>
        )}
      </div>

      {/* Next / キーボード */}
      {allDone ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advanceProblem} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Next ▶
          </button>
        </div>
      ) : (
        <>
          <CaretGuide />
          <NumKeyboard onKey={kb.key} onDelete={kb.del} onEnter={kb.enter} />
        </>
      )}

      {/* Home */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', fontSize: '16px', borderRadius: '10px', border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )
}
