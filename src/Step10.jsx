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

function toKatex(str) {
  if (!str) return ''
  return str
    .replace(/\^(-?\d+)/g, (_, e) => `^{${e}}`)      // 完成した指数（例: x^3, x^-2）
    .replace(/\^(-?)$/, (_, sign) => `^{${sign}}`)     // 入力途中の^（例: x^ や x^-）を安全な形に
}

// 答えチェック：^{-2} と ^-2 を同一視
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

// 指数法則（Step9と同じ・ページ上部に常時表示）
const RULES = [
  'x^0 = 1',
  '\\dfrac{1}{x^a} = x^{-a}',
  '\\sqrt[a]{x} = x^{1/a}',
  '\\sqrt[a]{x^b} = x^{b/a}',
  'x^a \\cdot x^b = x^{a+b}',
  '\\dfrac{x^a}{x^b} = x^{a-b}',
  '(x^a)^b = x^{ab}',
  '(nx)^a = n^a x^a',
  '\\left(\\dfrac{n}{x}\\right)^a = n^a x^{-a}',
]

// 分数指数・ルート変換の参考公式（例題の下・問題の上に常時表示）
const ROOT_FORMULAS = [
  'x = \\sqrt{x^2} = (\\sqrt{x})^2',
  '\\sqrt{x} = x^{1/2} = \\sqrt[2]{x}',
  '\\sqrt[3]{x} = x^{1/3}',
  '\\sqrt[n]{x} = x^{1/n}',
  '\\sqrt{x^3} = (\\sqrt{x})^3 = x^{3/2}',
  '\\sqrt[n]{x^m} = (\\sqrt[n]{x})^m = x^{m/n}',
  '\\dfrac{1}{\\sqrt{x}} = \\dfrac{1}{x^{1/2}} = x^{-1/2}',
]
const BIG_FORMULA = "(x^a)' = a\\,x^{a-1}"

// ── 問題セット定義 ─────────────────────────────────────────
// 各セット:
//   ruleKatex : 例題エリア上部に表示する公式
//   ex1, ex2  : 例題（solution配列。Step9と同じ形式）
//   q.lines   : 穴埋め式（{A}{B}{C}のトークンを含む文字列の配列）
//   q.finalLine : 全問正解後にのみ追加表示する、さらに簡単にした最終形（無い場合はundefined）
//   q.blanks  : { A:{answers:[...], display:'...'}, B:{...}, C:{...} }
//   q.hint    : 不正解時に段階表示するヒント（Step9と同形式・solution配列）

const SETS = [
  // ─── 1: (√x)' ─────────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x} = x^{1/n}',
    ex1: { solution: ["(\\sqrt{x})'", '= (x^{1/2})\'', '= \\dfrac{1}{2}x^{-1/2}', '= \\dfrac{1}{2\\sqrt{x}}'] },
    ex2: { solution: ["(\\sqrt[3]{x})'", '= (x^{1/3})\'', '= \\dfrac{1}{3}x^{-2/3}', '= \\dfrac{1}{3\\sqrt[3]{x^2}}'] },
    q: {
      lines: ["(\\sqrt{x})'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{1}{2\\sqrt{{C}}}'],
      blanks: {
        A: { answers: ['1/2'], display: '\\dfrac{1}{2}' },
        B: { answers: ['-1/2'], display: '-\\dfrac{1}{2}' },
        C: { answers: ['x'], display: 'x' },
      },
      hint: ["(2\\sqrt{x})'", '= (2x^{1/2})\'', '= 2 \\times \\dfrac{1}{2}x^{-1/2}', '= x^{-1/2} = \\dfrac{1}{\\sqrt{x}}'],
    },
  },
  // ─── 2: (∛x)' ─────────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x} = x^{1/n}',
    ex1: { solution: ["(\\sqrt{x})'", '= (x^{1/2})\'', '= \\dfrac{1}{2}x^{-1/2}', '= \\dfrac{1}{2\\sqrt{x}}'] },
    ex2: { solution: ["(\\sqrt[3]{x})'", '= (x^{1/3})\'', '= \\dfrac{1}{3}x^{-2/3}', '= \\dfrac{1}{3\\sqrt[3]{x^2}}'] },
    q: {
      lines: ["(\\sqrt[3]{x})'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{1}{3\\sqrt[3]{{C}}}'],
      blanks: {
        A: { answers: ['1/3'], display: '\\dfrac{1}{3}' },
        B: { answers: ['-2/3'], display: '-\\dfrac{2}{3}' },
        C: { answers: ['x^2', 'x2'], display: 'x^2' },
      },
      hint: ["(\\sqrt[4]{x})'", '= (x^{1/4})\'', '= \\dfrac{1}{4}x^{-3/4}', '= \\dfrac{1}{4\\sqrt[4]{x^3}}'],
    },
  },
  // ─── 3: ((√x)^3)' ─────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x^m} = x^{m/n}',
    ex1: { solution: ["((\\sqrt{x})^3)'", '= (\\sqrt{x^3})\'', '= (x^{3/2})\'', '= \\dfrac{3}{2}x^{1/2} = \\dfrac{3\\sqrt{x}}{2}'] },
    ex2: { solution: ["((\\sqrt[3]{x})^2)'", '= (\\sqrt[3]{x^2})\'', '= (x^{2/3})\'', '= \\dfrac{2}{3}x^{-1/3} = \\dfrac{2}{3\\sqrt[3]{x}}'] },
    q: {
      lines: ["((\\sqrt{x})^3)'", "= (\\sqrt{{A}})'", "= (x^{{B}})'", '= {B}x^{{C}}'],
      finalLine: '= \\dfrac{3\\sqrt{x}}{2}',
      blanks: {
        A: { answers: ['x^3', 'x3'], display: 'x^3' },
        B: { answers: ['3/2'], display: '\\dfrac{3}{2}' },
        C: { answers: ['1/2'], display: '\\dfrac{1}{2}' },
      },
      hint: ["((\\sqrt{x})^7)'", '= (\\sqrt{x^7})\'', '= (x^{7/2})\'', '= \\dfrac{7}{2}x^{5/2} = \\dfrac{7\\sqrt{x^5}}{2}'],
    },
  },
  // ─── 4: (1/√x)' ───────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{\\sqrt[n]{x}} = x^{-1/n}',
    ex1: { solution: ["\\left(\\dfrac{1}{\\sqrt{x}}\\right)'", '= (x^{-1/2})\'', '= -\\dfrac{1}{2}x^{-3/2}', '= -\\dfrac{1}{2\\sqrt{x^3}}'] },
    ex2: { solution: ["\\left(\\dfrac{1}{\\sqrt[3]{x}}\\right)'", '= (x^{-1/3})\'', '= -\\dfrac{1}{3}x^{-4/3}', '= -\\dfrac{1}{3\\sqrt[3]{x^4}}'] },
    q: {
      lines: ["\\left(\\dfrac{1}{\\sqrt{x}}\\right)'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{-1}{2\\sqrt{{C}}}'],
      finalLine: '= \\dfrac{-1}{2x\\sqrt{x}}',
      blanks: {
        A: { answers: ['-1/2'], display: '-\\dfrac{1}{2}' },
        B: { answers: ['-3/2'], display: '-\\dfrac{3}{2}' },
        C: { answers: ['x^3', 'x3'], display: 'x^3' },
      },
      hint: ["\\left(\\dfrac{3}{\\sqrt{x}}\\right)'", '= (3x^{-1/2})\'', '= -\\dfrac{3}{2}x^{-3/2}', '= -\\dfrac{3}{2\\sqrt{x^3}}'],
    },
  },
  // ─── 5: ((∛x)^2)' ─────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x^m} = x^{m/n}',
    ex1: { solution: ["((\\sqrt{x})^3)'", '= (\\sqrt{x^3})\'', '= (x^{3/2})\'', '= \\dfrac{3}{2}x^{1/2} = \\dfrac{3\\sqrt{x}}{2}'] },
    ex2: { solution: ["((\\sqrt[3]{x})^2)'", '= (\\sqrt[3]{x^2})\'', '= (x^{2/3})\'', '= \\dfrac{2}{3}x^{-1/3} = \\dfrac{2}{3\\sqrt[3]{x}}'] },
    q: {
      lines: ["((\\sqrt[3]{x})^2)'", "= (\\sqrt[3]{{A}})'", "= (x^{{B}})'", '= {B}x^{{C}}'],
      blanks: {
        A: { answers: ['x^2', 'x2'], display: 'x^2' },
        B: { answers: ['2/3'], display: '\\dfrac{2}{3}' },
        C: { answers: ['-1/3'], display: '-\\dfrac{1}{3}' },
      },
      hint: ["((\\sqrt[5]{x})^2)'", '= (\\sqrt[5]{x^2})\'', '= (x^{2/5})\'', '= \\dfrac{2}{5}x^{-3/5} = \\dfrac{2}{5\\sqrt[5]{x^3}}'],
    },
  },
  // ─── 6: (⁴√x)' ────────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x} = x^{1/n}',
    ex1: { solution: ["(\\sqrt{x})'", '= (x^{1/2})\'', '= \\dfrac{1}{2}x^{-1/2}', '= \\dfrac{1}{2\\sqrt{x}}'] },
    ex2: { solution: ["(\\sqrt[3]{x})'", '= (x^{1/3})\'', '= \\dfrac{1}{3}x^{-2/3}', '= \\dfrac{1}{3\\sqrt[3]{x^2}}'] },
    q: {
      lines: ["(\\sqrt[4]{x})'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{1}{4\\sqrt[4]{{C}}}'],
      blanks: {
        A: { answers: ['1/4'], display: '\\dfrac{1}{4}' },
        B: { answers: ['-3/4'], display: '-\\dfrac{3}{4}' },
        C: { answers: ['x^3', 'x3'], display: 'x^3' },
      },
      hint: ["(\\sqrt[5]{x})'", '= (x^{1/5})\'', '= \\dfrac{1}{5}x^{-4/5}', '= \\dfrac{1}{5\\sqrt[5]{x^4}}'],
    },
  },
  // ─── 7: (1/∛x)' ───────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{\\sqrt[n]{x}} = x^{-1/n}',
    ex1: { solution: ["\\left(\\dfrac{1}{\\sqrt{x}}\\right)'", '= (x^{-1/2})\'', '= -\\dfrac{1}{2}x^{-3/2}', '= -\\dfrac{1}{2\\sqrt{x^3}}'] },
    ex2: { solution: ["\\left(\\dfrac{1}{\\sqrt[3]{x}}\\right)'", '= (x^{-1/3})\'', '= -\\dfrac{1}{3}x^{-4/3}', '= -\\dfrac{1}{3\\sqrt[3]{x^4}}'] },
    q: {
      lines: ["\\left(\\dfrac{1}{\\sqrt[3]{x}}\\right)'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{-1}{3\\sqrt[3]{{C}}}'],
      blanks: {
        A: { answers: ['-1/3'], display: '-\\dfrac{1}{3}' },
        B: { answers: ['-4/3'], display: '-\\dfrac{4}{3}' },
        C: { answers: ['x^4', 'x4'], display: 'x^4' },
      },
      hint: ["\\left(\\dfrac{1}{\\sqrt[4]{x}}\\right)'", '= (x^{-1/4})\'', '= -\\dfrac{1}{4}x^{-5/4}', '= -\\dfrac{1}{4\\sqrt[4]{x^5}}'],
    },
  },
  // ─── 8: ((√x)^5)' ─────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x^m} = x^{m/n}',
    ex1: { solution: ["((\\sqrt{x})^3)'", '= (\\sqrt{x^3})\'', '= (x^{3/2})\'', '= \\dfrac{3}{2}x^{1/2} = \\dfrac{3\\sqrt{x}}{2}'] },
    ex2: { solution: ["((\\sqrt[3]{x})^2)'", '= (\\sqrt[3]{x^2})\'', '= (x^{2/3})\'', '= \\dfrac{2}{3}x^{-1/3} = \\dfrac{2}{3\\sqrt[3]{x}}'] },
    q: {
      lines: ["((\\sqrt{x})^5)'", "= (\\sqrt{{A}})'", "= (x^{{B}})'", '= {B}x^{{C}}'],
      finalLine: '= \\dfrac{5\\sqrt{x^3}}{2}',
      blanks: {
        A: { answers: ['x^5', 'x5'], display: 'x^5' },
        B: { answers: ['5/2'], display: '\\dfrac{5}{2}' },
        C: { answers: ['3/2'], display: '\\dfrac{3}{2}' },
      },
      hint: ["((\\sqrt{x})^9)'", '= (\\sqrt{x^9})\'', '= (x^{9/2})\'', '= \\dfrac{9}{2}x^{7/2} = \\dfrac{9\\sqrt{x^7}}{2}'],
    },
  },
  // ─── 9: ((⁴√x)^3)' ────────────────────────────────────
  {
    ruleKatex: '\\sqrt[n]{x^m} = x^{m/n}',
    ex1: { solution: ["((\\sqrt{x})^3)'", '= (\\sqrt{x^3})\'', '= (x^{3/2})\'', '= \\dfrac{3}{2}x^{1/2} = \\dfrac{3\\sqrt{x}}{2}'] },
    ex2: { solution: ["((\\sqrt[3]{x})^2)'", '= (\\sqrt[3]{x^2})\'', '= (x^{2/3})\'', '= \\dfrac{2}{3}x^{-1/3} = \\dfrac{2}{3\\sqrt[3]{x}}'] },
    q: {
      lines: ["((\\sqrt[4]{x})^3)'", "= (\\sqrt[4]{{A}})'", "= (x^{{B}})'", '= {B}x^{{C}}'],
      finalLine: '= \\dfrac{3}{4\\sqrt[4]{x}}',
      blanks: {
        A: { answers: ['x^3', 'x3'], display: 'x^3' },
        B: { answers: ['3/4'], display: '\\dfrac{3}{4}' },
        C: { answers: ['-1/4'], display: '-\\dfrac{1}{4}' },
      },
      hint: ["((\\sqrt[5]{x})^2)'", '= (\\sqrt[5]{x^2})\'', '= (x^{2/5})\'', '= \\dfrac{2}{5}x^{-3/5} = \\dfrac{2}{5\\sqrt[5]{x^3}}'],
    },
  },
  // ─── 10: (1/√(x^3))' ──────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{\\sqrt[n]{x}} = x^{-1/n}',
    ex1: { solution: ["\\left(\\dfrac{1}{\\sqrt{x}}\\right)'", '= (x^{-1/2})\'', '= -\\dfrac{1}{2}x^{-3/2}', '= -\\dfrac{1}{2\\sqrt{x^3}}'] },
    ex2: { solution: ["\\left(\\dfrac{1}{\\sqrt[3]{x}}\\right)'", '= (x^{-1/3})\'', '= -\\dfrac{1}{3}x^{-4/3}', '= -\\dfrac{1}{3\\sqrt[3]{x^4}}'] },
    q: {
      lines: ["\\left(\\dfrac{1}{\\sqrt{x^3}}\\right)'", "= (x^{{A}})'", '= {A}x^{{B}}', '= \\dfrac{-3}{2\\sqrt{{C}}}'],
      finalLine: '= \\dfrac{-3}{2x^2\\sqrt{x}}',
      blanks: {
        A: { answers: ['-3/2'], display: '-\\dfrac{3}{2}' },
        B: { answers: ['-5/2'], display: '-\\dfrac{5}{2}' },
        C: { answers: ['x^5', 'x5'], display: 'x^5' },
      },
      hint: ["\\left(\\dfrac{1}{\\sqrt[3]{x^2}}\\right)'", '= (x^{-2/3})\'', '= -\\dfrac{2}{3}x^{-5/3}', '= -\\dfrac{2}{3\\sqrt[3]{x^5}}'],
    },
  },
]

const BLANK_KEYS = ['A', 'B', 'C']

// solution配列 → aligned KaTeX（Step9と同じ）
function buildAligned(solution) {
  const lines = solution.map((line, i) => {
    if (i === 0) return `${line} &`
    const t = line.trim()
    return t.startsWith('=') ? `& ${t}` : `&= ${t}`
  })
  return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`
}

// 穴埋め式のトークン{A}{B}{C}を、現在の状態に応じて置き換える
function fillLine(template, blanks, vals, sts) {
  let out = template
  BLANK_KEYS.forEach((key, idx) => {
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
      repl = `\\boxed{${idx + 1}}`
    }
    out = out.split(token).join(repl)
  })
  return out
}

// ── UI部品（Step9と同じ） ────────────────────────────────
const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^-2</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>x<sup style={{ fontSize: '11px' }}>−2</sup></span>
    </div>
  </div>
)

const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }
  const btn = (color) => ({
    padding: '12px 4px', minWidth: '42px', flex: 1, maxWidth: '58px',
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
          <button key={n} style={btn('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        <button style={btn('num')} onClick={() => onKey('x')}>x</button>
        <button style={btn('caret')} onClick={() => onKey('^')}>^</button>
        <button style={btn('num')} onClick={() => onKey('+')}>+</button>
        <button style={btn('num')} onClick={() => onKey('-')}>−</button>
        <button style={btn('num')} onClick={() => onKey('/')}>／</button>
        <button style={btn('num')} onClick={() => onKey('(')}>（</button>
        <button style={btn('num')} onClick={() => onKey(')')}>）</button>
      </div>
      <div style={rowStyle}>
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

// 穴埋め番号チップ（①②③・現在どこを入力中か表示）
const BlankChips = ({ sts, phaseIndex }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
    {['①', '②', '③'].map((label, i) => {
      const key = BLANK_KEYS[i]
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
          {label}{st === 'ok' ? ' ✓' : ''}
        </div>
      )
    })}
  </div>
)

// ── メインコンポーネント ─────────────────────────────────
export default function Step10() {
  const navigate = useNavigate()

  const [setIdx, setSetIdx] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0) // 0=①, 1=②, 2=③, 3=全問正解
  const [vals, setVals] = useState({ A: '', B: '', C: '' })
  const [sts, setSts] = useState({ A: '', B: '', C: '' }) // '' | 'ok' | 'ng'
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [hintStep, setHintStep] = useState(0)
  const [hintTimerId, setHintTimerId] = useState(null)

  const cur = SETS[setIdx]
  const total = SETS.length
  const curKey = phaseIndex < 3 ? BLANK_KEYS[phaseIndex] : null

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
    setVals({ A: '', B: '', C: '' })
    setSts({ A: '', B: '', C: '' })
    setHintStep(0)
    setHintTimerId(prev => { clearHintTimer(prev); return null })
  }

  function advanceSet() {
    if (setIdx + 1 >= total) { setCleared(true); return }
    setSetIdx(i => i + 1)
    reset()
  }

  const kb = {
    key: (v) => {
      if (phaseIndex >= 3 || !curKey) return
      if (sts[curKey] === 'ng') setSts(s => ({ ...s, [curKey]: '' }))
      setVals(s => ({ ...s, [curKey]: s[curKey] + v }))
    },
    del: () => {
      if (phaseIndex >= 3 || !curKey) return
      if (sts[curKey] === 'ok') return
      setVals(s => ({ ...s, [curKey]: s[curKey].slice(0, -1) }))
    },
    enter: () => {
      if (phaseIndex >= 3 || !curKey) return
      const v = vals[curKey]
      if (!v) return
      if (checkAns(v, cur.q.blanks[curKey].answers)) {
        setSts(s => ({ ...s, [curKey]: 'ok' }))
        setHintStep(0)
        setHintTimerId(prev => { clearHintTimer(prev); return null })
        if (phaseIndex + 1 >= 3) {
          setDoneCount(c => c + 1)
        }
        setPhaseIndex(p => p + 1)
      } else {
        setSts(s => ({ ...s, [curKey]: 'ng' }))
        if (hintStep === 0 && cur.q.hint) {
          clearHintTimer(hintTimerId)
          startHint(cur.q.hint)
        }
      }
    },
  }

  const filledLines = cur.q.lines.map(t => fillLine(t, cur.q.blanks, vals, sts))
  const allDone = phaseIndex >= 3

  // クリア画面
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 10</h1>
      <div style={{ fontSize: '80px', margin: '16px 0' }}>🏆</div>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
        <button onClick={() => { setSetIdx(0); setCleared(false); setDoneCount(0); reset() }}
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
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 10</h1>

      {/* 微分記号 */}
      <div style={{ textAlign: 'center', marginBottom: '10px', background: '#1a1a2e', border: '1px solid #555', borderRadius: '10px', padding: '8px 16px' }}>
        <InlineMath math={`(f)' = D(f) = \\dfrac{d}{dx}(f)`} />
      </div>

      {/* Prep1リンク */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Link to="/prep1" style={{ color: '#4db8ff', fontSize: '14px', textDecoration: 'none' }}>
          📘 Prep 1
        </Link>
      </div>

      {/* 指数法則パネル */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', background: '#1a1a2e', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {RULES.map((r, i) => (
          <div key={i} style={{ fontSize: '13px' }}>
            <InlineMath math={r} />
          </div>
        ))}
      </div>

      {/* 進捗 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      {/* ── 例題エリア ── */}
      <div style={{ background: '#1a1a2e', border: '1px solid #444', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={cur.ruleKatex} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <BlockMath math={buildAligned(cur.ex1.solution)} />
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '4px', overflowX: 'auto' }}>
          <BlockMath math={buildAligned(cur.ex2.solution)} />
        </div>
      </div>

      {/* ── 分数指数・ルート変換の参考公式ボックス ── */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', background: '#1a1a2e' }}>
        {ROOT_FORMULAS.map((f, i) => (
          <div key={i} style={{ fontSize: '14px', marginBottom: '6px', textAlign: 'center' }}>
            <InlineMath math={f} />
          </div>
        ))}
        <div style={{ borderTop: '1px solid #444', margin: '10px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '26px', fontWeight: 'bold', color: '#ffd24d' }}>
          <InlineMath math={BIG_FORMULA} />
        </div>
      </div>

      {/* ── 問題エリア ── */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>

        <BlankChips sts={sts} phaseIndex={phaseIndex} />

        {/* 穴埋め式（aligned表示） */}
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <BlockMath math={buildAligned(filledLines)} />
        </div>

        {/* 全問正解後の追加簡略化行 */}
        {allDone && cur.q.finalLine && (
          <div style={{ overflowX: 'auto', marginBottom: '12px', textAlign: 'center', color: '#4dff88' }}>
            <InlineMath math={cur.q.finalLine} />
          </div>
        )}

        {/* 入力欄 or 完了表示 */}
        {!allDone ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
          <div style={{ textAlign: 'center', fontSize: '36px' }}>⭕</div>
        )}
        {!allDone && sts[curKey] === 'ng' && (
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
          </div>
        )}

        {/* ヒント表示（不正解後・2秒間隔で段階表示） */}
        {hintStep > 0 && cur.q.hint && !allDone && (
          <div style={{ marginTop: '12px', background: '#0f2a1a', border: '1.5px solid #44bb66', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ color: '#88ff88', fontSize: '13px', marginBottom: '6px', textAlign: 'center' }}>
              step :
            </div>
            <div style={{ overflowX: 'auto' }}>
              <BlockMath math={buildAligned(cur.q.hint.slice(0, hintStep))} />
            </div>
          </div>
        )}
      </div>

      {/* Next / キーボード */}
      {allDone ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advanceSet} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
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
