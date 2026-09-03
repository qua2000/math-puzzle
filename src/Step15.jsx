import { useState, useEffect, useRef, useMemo } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

// ────────────────────────────────────────────────────────────
// KaTeX描画（Step11/Step12/旧Step15と同じ方式）
// ────────────────────────────────────────────────────────────
const BlockMath = ({ math }) => {
  let html
  try {
    html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  } catch (e) {
    html = '<span style="color:#ff6666">?</span>'
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const InlineMath = ({ math }) => {
  let html
  try {
    html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  } catch (e) {
    html = '<span style="color:#ff6666">?</span>'
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// sqrt(...) を \sqrt{...} に変換（入れ子の括弧にも対応・Step11と同じ方式）
function convertRoots(str) {
  let out = ''
  let i = 0
  while (i < str.length) {
    if (str.startsWith('sqrt(', i)) {
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
      out += `\\sqrt{${convertRoots(inner)}}`
      i = j
    } else {
      out += str[i]
      i++
    }
  }
  return out
}

// キーボード入力文字列 → KaTeX表示用に変換（旧Step15と同じ）
function toKatex(str) {
  if (!str) return ''
  let s = convertRoots(String(str))
  s = s.replace(/\^{2,}/g, '^')
  s = s.replace(/\^\(([^()]*)\)/g, '^{$1}')
  s = s.replace(/\^(-?[0-9a-zA-Z]+)/g, '^{$1}')
  s = s.replace(/\^(?!\{)/g, '^{}')
  return s
}

function safeToKatex(str) {
  const converted = toKatex(str)
  if (/\}\s*\^/.test(converted)) {
    const escaped = String(str).replace(/\\/g, '').replace(/\^/g, '\\textasciicircum{}')
    return `\\text{${escaped}}`
  }
  return converted
}

// ────────────────────────────────────────────────────────────
// 答え合わせ
// ★新ルール：どの空欄でも、()を付けて入力しても付けなくても正解として扱う
//   → normalize() の中で「全体を囲む()」を自動的に取り除いてから比較する
// ────────────────────────────────────────────────────────────
function stripOuterParens(s) {
  if (s.length < 2 || s[0] !== '(' || s[s.length - 1] !== ')') return s
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') {
      depth--
      if (depth === 0 && i !== s.length - 1) return s // 全体を囲んでいない場合は外さない
    }
  }
  return s.slice(1, -1)
}

function normalize(s) {
  let t = String(s).replace(/\s/g, '').toLowerCase()
  t = t.replace(/\^{2,}/g, '^') // 「^」の連打（例：^^）も1つの^として扱う（表示側のtoKatexと合わせる）
  // 「^(2x)」のように、+や-を含まない単純な指数を囲む()は、式のどこにあっても取り除く
  // （「e^(2x)」と「e^2x」を同じ扱いにする。「^(4x+2)」のように+を含む場合は対象外＝括弧必須のまま）
  t = t.replace(/\^\((-?[0-9a-z]+)\)/g, '^$1')
  while (true) {
    const stripped = stripOuterParens(t)
    if (stripped === t) break
    t = stripped
  }
  return t
}

function parseTerms(str) {
  const s = String(str).replace(/\s/g, '')
  if (!s) return null
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
      const expPart = body.slice(idx + 1)
      const coef = coefPart === '' ? 1 : Number(coefPart)
      if (Number.isNaN(coef)) return null
      let exp = 1
      if (expPart.startsWith('^')) {
        let expNum = expPart.slice(1)
        if (expNum.startsWith('(') && expNum.endsWith(')')) expNum = expNum.slice(1, -1)
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
  return terms
}

function checkAnswer(userRaw, correctList) {
  if (!userRaw) return false
  const candidates = Array.isArray(correctList) ? correctList : [correctList]
  for (const c of candidates) {
    if (normalize(userRaw) === normalize(c)) return true
    if (!c.includes('e') && !userRaw.includes('e')) {
      const t1 = parseTerms(userRaw)
      const t2 = parseTerms(c)
      if (t1 && t2) {
        const keys = new Set([...Object.keys(t1), ...Object.keys(t2)])
        let same = true
        for (const k of keys) { if ((t1[k] || 0) !== (t2[k] || 0)) { same = false; break } }
        if (same) return true
      }
    }
  }
  return false
}

// 「e^(3x)」のように、^の直後の()をなくした形（「e^3x」）も自動的に正解候補に加える
// ただし、指数の中身が「4x+2」のように+や-を含む複数項の場合は対象外にする
// （括弧を外すと「e^4x + 2」のように別の意味になってしまい、表示が誤解を招くため）
function withExpVariant(s) {
  const m = s.match(/^(.*\^)\(([^()]+)\)$/)
  if (m && /^-?[0-9a-zA-Z]+$/.test(m[2])) return [s, `${m[1]}${m[2]}`]
  return [s]
}

// 表示用：複数項（+ や 内部の -）を含む場合は自動で()を付ける（積の2つ目の因子のみに使用）
function wrapIfMultiTerm(raw, katexStr) {
  if (!raw) return katexStr
  const hasPlus = raw.includes('+')
  const hasInternalMinus = /.-/.test(raw)
  return (hasPlus || hasInternalMinus) ? `\\left(${katexStr}\\right)` : katexStr
}

function buildAligned(lines) {
  const out = lines.map((line, i) => {
    if (i === 0) return line.replace('=', '&=')
    const t = line.trim()
    return t.startsWith('=') ? `&${t}` : `&= ${t}`
  })
  return `\\begin{aligned}\n${out.join(' \\\\\n')}\n\\end{aligned}`
}

function buildSampleAligned(lines) {
  const out = lines.map((line, i) => {
    if (i === 0) return line.replace('=', '&=')
    const t = line.trim()
    return t.startsWith('=') ? `&${t}` : `&= ${t}`
  })
  return `\\begin{aligned}\n${out.join(' \\\\\n')}\n\\end{aligned}`
}

// ────────────────────────────────────────────────────────────
// Sampleグループ（2問で1セットを使い回す）
// ────────────────────────────────────────────────────────────
const SAMPLE_GROUPS = [
  {
    // 問題(1)(2)用
    given1: 'y = e^{2x}',
    solution1: [
      "y' = \\left(e^{2x}\\right)'\\cdot\\left(2x\\right)'",
      '= e^{2x}\\cdot 2',
      '= 2e^{2x}',
    ],
    given2: 'y = 3e^{4x}',
    solution2: [
      "y' = \\left(3e^{4x}\\right)'",
      "= \\left(3e^{4x}\\right)'\\cdot\\left(4x\\right)'",
      '= 3e^{4x}\\cdot 4',
      '= 12e^{4x}',
    ],
  },
  {
    // 問題(3)(4)用
    given1: 'y = \\dfrac{1}{e^{3x}}',
    given1Extra: '= e^{-3x}',
    solution1: [
      "y' = \\left(e^{-3x}\\right)'",
      "= \\left(e^{-3x}\\right)'\\cdot\\left(-3x\\right)'",
      '= e^{-3x}\\cdot(-3)',
      '= -3e^{-3x}',
      '= \\dfrac{-3}{e^{3x}}',
    ],
    given2: 'y = \\dfrac{2}{e^{5x}}',
    given2Extra: '= 2e^{-5x}',
    solution2: [
      "y' = \\left(2e^{-5x}\\right)'",
      "= \\left(2e^{-5x}\\right)'\\cdot\\left(-5x\\right)'",
      '= 2e^{-5x}\\cdot(-5)',
      '= -10e^{-5x}',
      '= \\dfrac{-10}{e^{5x}}',
    ],
  },
  {
    // 問題(5)(6)用
    given1: 'y = (e^x+1)^2',
    solution1: [
      "y' = \\left((e^x+1)^2\\right)'",
      "= \\left((e^x+1)^2\\right)'\\cdot\\left(e^x+1\\right)'",
      '= 2(e^x+1)\\cdot e^x',
      '= 2e^x(e^x+1)',
    ],
    given2: 'y = (e^x+3x)^4',
    solution2: [
      "y' = \\left((e^x+3x)^4\\right)'",
      "= \\left((e^x+3x)^4\\right)'\\cdot\\left(e^x+3x\\right)'",
      '= 4(e^x+3x)^3\\cdot(e^x+3)',
      '= 4(e^x+3)(e^x+3x)^3',
    ],
  },
  {
    // 問題(7)(8)用
    given1: 'y = e^{2x+3}',
    solution1: [
      "y' = \\left(e^{2x+3}\\right)'",
      "= \\left(e^{2x+3}\\right)'\\cdot\\left(2x+3\\right)'",
      '= e^{2x+3}\\cdot 2',
      '= 2e^{2x+3}',
    ],
    given2: 'y = e^{3x^2+5x}',
    solution2: [
      "y' = \\left(e^{3x^2+5x}\\right)'",
      "= \\left(e^{3x^2+5x}\\right)'\\cdot\\left(3x^2+5x\\right)'",
      '= e^{3x^2+5x}\\cdot(6x+5)',
      '= (6x+5)e^{3x^2+5x}',
    ],
  },
  {
    // 問題(9)(10)用
    given1: 'y = \\sqrt{e^{5x}}',
    given1Extra: '= e^{5x/2}',
    solution1: [
      "y' = \\left(e^{5x/2}\\right)'",
      "= \\left(e^{5x/2}\\right)'\\cdot\\left(\\dfrac{5x}{2}\\right)'",
      '= e^{5x/2}\\cdot\\dfrac{5}{2}',
      '= \\dfrac{5}{2}e^{5x/2}',
      '= \\dfrac{5}{2}\\sqrt{e^{5x}}',
    ],
    given2: 'y = \\sqrt{e^{3x}+2}',
    given2Extra: '= (e^{3x}+2)^{1/2}',
    solution2: [
      "y' = \\left((e^{3x}+2)^{1/2}\\right)'",
      "= \\left((e^{3x}+2)^{1/2}\\right)'\\cdot\\left(e^{3x}+2\\right)'",
      '= \\dfrac{1}{2}(e^{3x}+2)^{-1/2}\\cdot e^{3x}\\cdot(3x)\'',
      '= \\dfrac{1}{2}(e^{3x}+2)^{-1/2}\\cdot 3e^{3x}',
      '= \\dfrac{3e^{3x}}{2\\sqrt{e^{3x}+2}}',
    ],
  },
]

// ────────────────────────────────────────────────────────────
// 問題データ
// line.type: 'product'（A・B の掛け算） / 'single'（最終形1つ） / 'fraction'（A/B）
//            / 'template'（自由な位置に空欄を配置。(7)〜(10)で使用。eの指数部分だけを
//              入力させることで、括弧の有無による正解パターンの複雑化を避けている）
// line.primed: true の場合、両方の空欄を \left( \right)' で囲んで表示する
// ────────────────────────────────────────────────────────────
const PROBLEMS = [
  {
    given: 'e^(3x)',
    sampleGroup: 0,
    lines: [
      { type: 'product', primed: false, blanks: [{ answers: withExpVariant('e^(3x)') }, { answers: ['3'] }] },
      { type: 'single', blanks: [{ answers: withExpVariant('3e^(3x)') }] },
    ],
  },
  {
    given: '2e^(5x)',
    sampleGroup: 0,
    preLine: '2e^(5x)',
    lines: [
      { type: 'product', primed: true, blanks: [{ answers: withExpVariant('2e^(5x)') }, { answers: ['5x'] }] },
      { type: 'product', primed: false, blanks: [{ answers: withExpVariant('2e^(5x)') }, { answers: ['5'] }] },
      { type: 'single', blanks: [{ answers: withExpVariant('10e^(5x)') }] },
    ],
  },
  {
    given: '1/e^(2x)',
    givenExtra: 'e^(-2x)',
    sampleGroup: 1,
    lines: [
      { type: 'product', primed: false, blanks: [{ answers: withExpVariant('e^(-2x)') }, { answers: ['-2'] }] },
      { type: 'single', blanks: [{ answers: withExpVariant('-2e^(-2x)') }] },
      { type: 'fraction', blanks: [{ answers: ['-2'] }, { answers: withExpVariant('e^(2x)') }] },
    ],
  },
  {
    given: '3/e^(4x)',
    givenExtra: '3e^(-4x)',
    sampleGroup: 1,
    preLine: '3e^(-4x)',
    lines: [
      { type: 'product', primed: true, blanks: [{ answers: withExpVariant('3e^(-4x)') }, { answers: ['-4x'] }] },
      { type: 'product', primed: false, blanks: [{ answers: withExpVariant('3e^(-4x)') }, { answers: ['-4'] }] },
      { type: 'single', blanks: [{ answers: withExpVariant('-12e^(-4x)') }] },
      { type: 'fraction', blanks: [{ answers: ['-12'] }, { answers: withExpVariant('e^(4x)') }] },
    ],
  },
  {
    given: '(e^x+2)^2',
    sampleGroup: 2,
    preLine: '(e^x+2)^2',
    lines: [
      { type: 'product', primed: true, blanks: [{ answers: ['(e^x+2)^2'] }, { answers: ['e^x+2'] }] },
      { type: 'product', primed: false, blanks: [{ answers: ['2(e^x+2)'] }, { answers: ['e^x'] }] },
      { type: 'single', blanks: [{ answers: ['2e^x(e^x+2)'] }] },
    ],
  },
  {
    given: '(e^x+x)^3',
    sampleGroup: 2,
    preLine: '(e^x+x)^3',
    lines: [
      { type: 'product', primed: true, blanks: [{ answers: ['(e^x+x)^3'] }, { answers: ['e^x+x'] }] },
      { type: 'product', primed: false, blanks: [{ answers: ['3(e^x+x)^2'] }, { answers: ['e^x+1'] }] },
      { type: 'single', blanks: [{ answers: ['3(e^x+1)(e^x+x)^2'] }] },
    ],
  },
  {
    given: 'e^(4x+2)',
    sampleGroup: 3,
    preLine: 'e^(4x+2)',
    lines: [
      {
        type: 'template',
        blanks: [{ answers: ['4x+2'] }, { answers: ['4x+2'] }],
        build: (get) => `\\left(e^{${get(0)}}\\right)'\\cdot\\left(${get(1)}\\right)'`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['4x+2'] }, { answers: ['4'] }],
        build: (get) => `e^{${get(0)}}\\cdot ${get(1)}`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['4'] }, { answers: ['4x+2'] }],
        build: (get) => `${get(0)}e^{${get(1)}}`,
      },
    ],
  },
  {
    given: 'e^(2x^2+3x)',
    sampleGroup: 3,
    preLine: 'e^(2x^2+3x)',
    lines: [
      {
        type: 'template',
        blanks: [{ answers: ['2x^2+3x'] }, { answers: ['2x^2+3x'] }],
        build: (get) => `\\left(e^{${get(0)}}\\right)'\\cdot\\left(${get(1)}\\right)'`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['2x^2+3x'] }, { answers: ['4x+3'] }],
        build: (get) => `e^{${get(0)}}\\cdot\\left(${get(1)}\\right)`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['4x+3'] }, { answers: ['2x^2+3x'] }],
        build: (get) => `\\left(${get(0)}\\right)e^{${get(1)}}`,
      },
    ],
  },
  {
    given: 'sqrt(e^(3x))',
    givenExtra: 'e^(3x/2)',
    sampleGroup: 4,
    preLine: 'e^(3x/2)',
    lines: [
      {
        type: 'template',
        blanks: [{ answers: ['3x/2'] }, { answers: ['3x/2'] }],
        build: (get) => `\\left(e^{${get(0)}}\\right)'\\cdot ${get(1)}'`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['3x/2'] }, { answers: ['3/2'] }],
        build: (get) => `e^{${get(0)}}\\cdot ${get(1)}`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['3/2'] }, { answers: ['3x/2'] }],
        build: (get) => `${get(0)}e^{${get(1)}}`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['3/2'] }, { answers: ['3x'] }],
        build: (get) => `${get(0)}\\sqrt{e^{${get(1)}}}`,
      },
    ],
  },
  {
    given: 'sqrt(e^(2x)+5)',
    givenExtra: '(e^(2x)+5)^(1/2)',
    sampleGroup: 4,
    preLine: '(e^(2x)+5)^(1/2)',
    lines: [
      {
        type: 'template',
        blanks: [{ answers: ['2x'] }],
        build: (get) => `\\left((e^{2x}+5)^{1/2}\\right)'\\cdot\\left(e^{2x}+5\\right)'\\cdot\\left(${get(0)}\\right)'`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['1/2'] }, { answers: ['-1/2'] }, { answers: ['2x'] }, { answers: ['2'] }],
        build: (get) => `${get(0)}(e^{2x}+5)^{${get(1)}}\\cdot e^{${get(2)}}\\cdot ${get(3)}`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['2x'] }, { answers: ['-1/2'] }],
        build: (get) => `e^{${get(0)}}\\cdot(e^{2x}+5)^{${get(1)}}`,
      },
      {
        type: 'template',
        blanks: [{ answers: ['2x'] }],
        build: (get) => `\\dfrac{e^{${get(0)}}}{\\sqrt{e^{2x}+5}}`,
      },
    ],
  },
]

// 問題データをフラットな空欄リストに変換
function flattenBlanks(lines) {
  const flat = []
  const lineRanges = []
  lines.forEach((line, lineIdx) => {
    const start = flat.length
    line.blanks.forEach((b) => {
      flat.push({ lineIdx, answers: b.answers })
    })
    lineRanges.push({ start, end: flat.length })
  })
  return { flat, lineRanges }
}

// ────────────────────────────────────────────────────────────
// テンキー（旧Step15と同じ）
// ────────────────────────────────────────────────────────────
const NumKeyboard = ({ onKey, onDelete, onEnter, enterDisabled }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px', flexWrap: 'wrap' }
  const btnStyle = (color) => ({
    padding: '12px 4px', minWidth: '42px', flex: 1, maxWidth: '54px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : color === 'op' ? '#ffb84d55' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : color === 'op' ? '#3a2a1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : color === 'op' ? '#ffcc88' : 'white',
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
        <button style={btnStyle('num')} onClick={() => onKey('e')}>e</button>
        <button style={btnStyle('op')} onClick={() => onKey('^')}>^</button>
        <button style={btnStyle('op')} onClick={() => onKey('+')}>+</button>
        <button style={btnStyle('op')} onClick={() => onKey('-')}>−</button>
        <button style={btnStyle('op')} onClick={() => onKey('/')}>／</button>
        <button style={btnStyle('num')} onClick={() => onKey('(')}>（</button>
        <button style={btnStyle('num')} onClick={() => onKey(')')}>）</button>
        <button style={btnStyle('op')} onClick={() => onKey('sqrt(')}>√</button>
      </div>
      <div style={rowStyle}>
        <button style={{ ...btnStyle('del'), flex: 1, maxWidth: '90px' }} onClick={onDelete}>⌫</button>
        <button
          style={{ ...btnStyle('enter'), flex: 2, maxWidth: '170px', opacity: enterDisabled ? 0.5 : 1 }}
          onClick={onEnter}
          disabled={enterDisabled}
        >✓</button>
      </div>
    </div>
  )
}

export default function Step15() {
  const navigate = useNavigate()
  const sampleRef = useRef(null)
  const [sampleHighlight, setSampleHighlight] = useState(false)

  const [probIdx, setProbIdx] = useState(0)
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)

  const cur = PROBLEMS[probIdx]
  const total = PROBLEMS.length
  const { flat, lineRanges } = useMemo(() => flattenBlanks(cur.lines), [cur])

  const [values, setValues] = useState(() => flat.map(() => ''))
  const [statuses, setStatuses] = useState(() => flat.map(() => null))

  // 問題が切り替わったら空欄をリセット
  useEffect(() => {
    setValues(flat.map(() => ''))
    setStatuses(flat.map(() => null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probIdx])

  const activeIndex = statuses.findIndex(s => s !== 'correct')
  const allDone = activeIndex === -1
  const hasWrong = statuses.includes('wrong')

  function renderBlank(flatIdx, { wrap = false, primed = false, stripOuter = false } = {}) {
    const status = statuses[flatIdx]
    let raw = values[flatIdx]
    const isActive = flatIdx === activeIndex

    if (stripOuter && raw) {
      // 例：solve側で()を自動表示するテンプレート箇所で、生徒が自分で"(4x+3)"と
      // ()付きで入力しても、"((4x+3))"のように二重括弧にならないようにする
      let t = String(raw)
      while (true) {
        const s = stripOuterParens(t)
        if (s === t) break
        t = s
      }
      raw = t
    }

    let bodyKatex = null
    if (status === 'correct' || status === 'wrong') {
      bodyKatex = safeToKatex(raw) || '?'
    } else if (isActive && raw) {
      bodyKatex = safeToKatex(raw)
    }

    if (bodyKatex === null) {
      // \square を {} で囲むことで、直後の文字（例：e^{...}の"e"）とくっついて
      // \squaree のような不明な記号になってしまうのを防ぐ
      const placeholder = isActive ? '\\boxed{?}' : '{\\square}'
      return primed ? `${placeholder}'` : placeholder
    }

    if (primed) {
      bodyKatex = `\\left(${bodyKatex}\\right)'`
    } else if (wrap) {
      bodyKatex = wrapIfMultiTerm(raw, bodyKatex)
    }

    const color = status === 'correct' ? '#4dff88' : status === 'wrong' ? '#ff6666' : '#4db8ff'
    return `\\textcolor{${color}}{${bodyKatex}}`
  }

  function renderLine(line, li) {
    const { start, end } = lineRanges[li]
    const idxs = []
    for (let i = start; i < end; i++) idxs.push(i)

    if (line.type === 'template') {
      // 空欄をどこにでも自由に配置できる汎用タイプ（(7)〜(10)で使用）
      // get(i)：そのまま表示 / getWrapped(i)：複数項なら自動で()を付けて表示
      // どちらも、生徒が自分で()を入力していた場合に二重括弧にならないようにしてある
      const get = (i) => renderBlank(idxs[i], { stripOuter: true })
      const getWrapped = (i) => renderBlank(idxs[i], { wrap: true, stripOuter: true })
      return line.build(get, getWrapped)
    }
    if (line.type === 'product') {
      const left = renderBlank(idxs[0], { wrap: false, primed: line.primed })
      const right = renderBlank(idxs[1], { wrap: true, primed: line.primed })
      return `${left}\\cdot ${right}`
    }
    if (line.type === 'fraction') {
      const num = renderBlank(idxs[0])
      const den = renderBlank(idxs[1])
      return `\\dfrac{${num}}{${den}}`
    }
    // single
    return renderBlank(idxs[0])
  }

  function buildProblemMath() {
    const rows = []
    if (cur.preLine) {
      rows.push(`y' = \\left(${safeToKatex(cur.preLine)}\\right)'`)
    }
    for (let li = 0; li < cur.lines.length; li++) {
      const content = renderLine(cur.lines[li], li)
      rows.push(rows.length === 0 ? `y' = ${content}` : `= ${content}`)
    }
    return buildAligned(rows)
  }

  function handleKey(v) {
    if (allDone) return
    setValues(vs => vs.map((val, i) => (i === activeIndex ? val + v : val)))
    setStatuses(sts => sts.map((s, i) => (i === activeIndex && s === 'wrong' ? null : s)))
  }
  function handleDelete() {
    if (allDone) return
    setValues(vs => vs.map((val, i) => (i === activeIndex ? val.slice(0, -1) : val)))
    setStatuses(sts => sts.map((s, i) => (i === activeIndex && s === 'wrong' ? null : s)))
  }
  function handleEnter() {
    if (allDone) return
    const val = values[activeIndex]
    if (!val) return
    const spec = flat[activeIndex]
    if (checkAnswer(val, spec.answers)) {
      const nextStatuses = statuses.map((s, i) => (i === activeIndex ? 'correct' : s))
      setStatuses(nextStatuses)
      if (nextStatuses.every(s => s === 'correct')) {
        setDoneCount(c => c + 1)
      }
    } else {
      setStatuses(sts => sts.map((s, i) => (i === activeIndex ? 'wrong' : s)))
    }
  }

  function advanceProblem() {
    if (probIdx + 1 >= total) { setCleared(true); return }
    setProbIdx(i => i + 1)
  }

  function showSampleHint() {
    sampleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setSampleHighlight(true)
    setTimeout(() => setSampleHighlight(false), 1200)
  }

  const group = SAMPLE_GROUPS[cur.sampleGroup]
  const givenLine = `y = ${safeToKatex(cur.given)}`

  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 15</h1>
      <div style={{ fontSize: '80px', margin: '16px 0' }}>🏆</div>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
        <button onClick={() => { setProbIdx(0); setCleared(false); setDoneCount(0) }}
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

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 15</h1>

      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', background: '#1a1a2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <InlineMath math={"(f(g(x)))' = f'(g(x))\\cdot g'(x)"} />
          <a href="https://qua2000.github.io/math-puzzle/#/step11" target="_blank" rel="noopener noreferrer" style={{ fontSize: '18px', color: '#4db8ff', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ← Step11
          </a>
        </div>
        <div style={{ borderTop: '1px solid #444', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <InlineMath math={"(a^x)' = a^x\\log a \\quad\\quad (e^x)' = e^x"} />
          <a href="https://qua2000.github.io/math-puzzle/#/step12" target="_blank" rel="noopener noreferrer" style={{ fontSize: '18px', color: '#4db8ff', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ← Step12
          </a>
        </div>
      </div>

      <div
        ref={sampleRef}
        style={{
          background: '#1a1a2e',
          border: sampleHighlight ? '2px solid #ffd24d' : '1px solid #444',
          boxShadow: sampleHighlight ? '0 0 14px #ffd24d99' : 'none',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '16px',
          transition: 'all 0.3s',
        }}
      >
        <div style={{ textAlign: 'center', color: '#ffd24d', fontSize: '13px', marginBottom: '8px' }}>🌟 Sample</div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ overflowX: 'auto' }}>
            <BlockMath math={group.given1Extra ? buildSampleAligned([group.given1, group.given1Extra]) : `${group.given1}`} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <BlockMath math={buildSampleAligned(group.solution1)} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
          <div style={{ overflowX: 'auto' }}>
            <BlockMath math={group.given2Extra ? buildSampleAligned([group.given2, group.given2Extra]) : `${group.given2}`} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <BlockMath math={buildSampleAligned(group.solution2)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px', position: 'relative' }}>
        <button
          onClick={showSampleHint}
          title="Sampleをもう一度見る"
          style={{
            position: 'absolute', top: '10px', right: '10px',
            width: '30px', height: '30px', borderRadius: '50%',
            border: '1.5px solid #ffd24d99', background: '#2a2410', color: '#ffd24d',
            fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', lineHeight: 1,
          }}
        >？</button>

        <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
          <BlockMath math={cur.givenExtra ? buildSampleAligned([givenLine, `= ${safeToKatex(cur.givenExtra)}`]) : givenLine} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <BlockMath math={buildProblemMath()} />
        </div>

        {allDone ? (
          <div style={{ textAlign: 'center', fontSize: '36px', marginTop: '8px' }}>⭕</div>
        ) : (
          hasWrong && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
            </div>
          )
        )}
      </div>

      {allDone ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advanceProblem} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Next ▶
          </button>
        </div>
      ) : (
        <NumKeyboard
          onKey={handleKey}
          onDelete={handleDelete}
          onEnter={handleEnter}
          enterDisabled={!values[activeIndex]}
        />
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', fontSize: '16px', borderRadius: '10px', border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )
}
