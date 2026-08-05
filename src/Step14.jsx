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

// ── 多項式部分（キーボード入力）───────────────────────────
function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

// 表示用：x^2 → x^{2}（「^」だけ入力された未完成の状態でもKaTeXがエラーにならないようにする）
function toKatexA(str) {
  if (!str) return ''
  let s = String(str)
  s = s.replace(/\^(-?\d+)/g, (_, exp) => `^{${exp}}`) // 完成した指数
  s = s.replace(/\^(?!{)/g, '^{}') // まだ数字が続いていない裸の「^」は空の上付きにしておく
  return s
}

// 複数項（例: 2x+3, 3x^2+4）にも対応した柔軟な正解判定（Step8の方式を流用）
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
      const expPart = body.slice(idx + 1)
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
  return terms
}

function checkA(userStr, correctStr) {
  if (!userStr) return false
  if (normalize(userStr) === normalize(correctStr)) return true
  const t1 = parseTerms(userStr)
  const t2 = parseTerms(correctStr)
  if (!t1 || !t2) return false
  const keys = new Set([...Object.keys(t1), ...Object.keys(t2)])
  for (const k of keys) {
    if ((t1[k] || 0) !== (t2[k] || 0)) return false
  }
  return true
}

// ── logタグ部分（タップ選択・Step12/13方式）───────────────
function toKatexB(str) {
  if (str === undefined || str === null) return ''
  return String(str).replace(/log\((\d+)\)/g, (_, n) => `\\cdot\\log ${n}`)
}

function checkB(userStr, correctList) {
  if (userStr === undefined) return false
  return correctList.some(c => normalize(c) === normalize(userStr))
}

const TAG_OPTIONS = [
  { token: 'log(2)', a: '2', math: '\\log 2' },
  { token: 'log(3)', a: '3', math: '\\log 3' },
  { token: 'log(5)', a: '5', math: '\\log 5' },
  { token: 'log(10)', a: '10', math: '\\log 10' },
]

// ── 問題データ（全10問・商の微分×指数関数）───────────────
const PROBLEMS = [
  // ===== タイプA：分子/e^x型（logタグなし・穴埋め1か所）6問 =====
  {
    template: "\\left(\\dfrac{x^3}{e^x}\\right)' = \\dfrac{{A}\\cdot e^x - x^3\\cdot e^x}{(e^x)^2}",
    aAnswers: ['3x^2'], aDisplay: '3x^2',
  },
  {
    template: "\\left(\\dfrac{x^4}{e^x}\\right)' = \\dfrac{{A}\\cdot e^x - x^4\\cdot e^x}{(e^x)^2}",
    aAnswers: ['4x^3'], aDisplay: '4x^3',
  },
  {
    template: "\\left(\\dfrac{x^2+3x}{e^x}\\right)' = \\dfrac{\\left({A}\\right)\\cdot e^x - (x^2+3x)\\cdot e^x}{(e^x)^2}",
    aAnswers: ['2x+3'], aDisplay: '2x+3',
    hint: ["(x^2+3x)'", '= 2x+3'],
  },
  {
    template: "\\left(\\dfrac{x^3}{e^x+2}\\right)' = \\dfrac{{A}\\cdot (e^x+2) - x^3\\cdot e^x}{(e^x+2)^2}",
    aAnswers: ['3x^2'], aDisplay: '3x^2',
  },
  {
    template: "\\left(\\dfrac{x^2+2x}{e^x+1}\\right)' = \\dfrac{\\left({A}\\right)\\cdot (e^x+1) - (x^2+2x)\\cdot e^x}{(e^x+1)^2}",
    aAnswers: ['2x+2'], aDisplay: '2x+2',
    hint: ["(x^2+2x)'", '= 2x+2'],
  },
  {
    template: "\\left(\\dfrac{x^3+4x}{e^x+3}\\right)' = \\dfrac{\\left({A}\\right)\\cdot (e^x+3) - (x^3+4x)\\cdot e^x}{(e^x+3)^2}",
    aAnswers: ['3x^2+4'], aDisplay: '3x^2+4',
    hint: ["(x^3+4x)'", '= 3x^2+4'],
  },

  // ===== タイプB：分子/a^x型（logタグあり）2問 =====
  {
    template: "\\left(\\dfrac{x^2}{2^x}\\right)' = \\dfrac{{A}\\cdot 2^x - x^2\\cdot 2^x{B}}{(2^x)^2}",
    aAnswers: ['2x'], aDisplay: '2x',
    bAnswers: ['log(2)'], bDisplay: '\\cdot\\log 2',
  },
  {
    template: "\\left(\\dfrac{x^3}{3^x}\\right)' = \\dfrac{{A}\\cdot 3^x - x^3\\cdot 3^x{B}}{(3^x)^2}",
    aAnswers: ['3x^2'], aDisplay: '3x^2',
    bAnswers: ['log(3)'], bDisplay: '\\cdot\\log 3',
  },

  // ===== タイプC：係数付き応用 2問 =====
  {
    template: "\\left(\\dfrac{2x^3}{2^x}\\right)' = \\dfrac{{A}\\cdot 2^x - 2x^3\\cdot 2^x{B}}{(2^x)^2}",
    aAnswers: ['6x^2'], aDisplay: '6x^2',
    bAnswers: ['log(2)'], bDisplay: '\\cdot\\log 2',
    hint: ["(2x^3)'", '= 2\\cdot3x^2', '= 6x^2'],
  },
  {
    template: "\\left(\\dfrac{3x^2}{5^x}\\right)' = \\dfrac{{A}\\cdot 5^x - 3x^2\\cdot 5^x{B}}{(5^x)^2}",
    aAnswers: ['6x'], aDisplay: '6x',
    bAnswers: ['log(5)'], bDisplay: '\\cdot\\log 5',
    hint: ["(3x^2)'", '= 3\\cdot2x', '= 6x'],
  },
]

// ── UI部品 ──────────────────────────────────────────────
const NumKeyboard = ({ onKey, onDelete, onEnter, enterDisabled }) => {
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
        <button style={btnStyle('num')} onClick={() => onKey('+')}>+</button>
        <button style={btnStyle('caret')} onClick={() => onKey('^')}>^</button>
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

const TagTable = ({ onSelect, disabled }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
    {TAG_OPTIONS.map(opt => (
      <button
        key={opt.token}
        disabled={disabled}
        onClick={() => onSelect(opt.token)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '10px 14px', minWidth: '58px',
          borderRadius: '10px', border: '1.5px solid #4db8ff55',
          background: '#1a2a3e', cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ color: '#ffd24d', fontSize: '15px', fontWeight: 'bold' }}>{opt.a}</span>
        <span style={{ color: '#4db8ff' }}><InlineMath math={opt.math} /></span>
      </button>
    ))}
  </div>
)

function buildAligned(lines) {
  return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step14() {
  const navigate = useNavigate()

  const [probIdx, setProbIdx] = useState(0)
  const [valA, setValA] = useState('')
  const [stA, setStA] = useState(null) // null | 'wrong' | 'correct'
  const [valB, setValB] = useState(undefined)
  const [stB, setStB] = useState(null)
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [hintStep, setHintStep] = useState(0)
  const [hintTimerId, setHintTimerId] = useState(null)

  const cur = PROBLEMS[probIdx]
  const total = PROBLEMS.length
  const hasB = cur.template.includes('{B}')
  const aOK = stA === 'correct'
  const bOK = hasB ? stB === 'correct' : true
  const allDone = aOK && bOK

  function clearHintTimer(id) { if (id) clearInterval(id) }

  function startHint(hint) {
    setHintStep(1)
    let step = 1
    const id = setInterval(() => {
      step += 1
      if (step <= hint.length) setHintStep(step)
      else clearInterval(id)
    }, 2000)
    setHintTimerId(id)
  }

  function reset() {
    setValA(''); setStA(null)
    setValB(undefined); setStB(null)
    setHintStep(0)
    setHintTimerId(prev => { clearHintTimer(prev); return null })
  }

  function advanceProblem() {
    if (probIdx + 1 >= total) { setCleared(true); return }
    setProbIdx(i => i + 1)
    reset()
  }

  // 多項式部分キーボード操作
  const kb = {
    key: (v) => {
      if (aOK) return
      setValA(s => s + v)
      if (stA === 'wrong') setStA(null)
    },
    del: () => {
      if (aOK) return
      setValA(s => s.slice(0, -1))
      if (stA === 'wrong') setStA(null)
    },
    enter: () => {
      if (aOK || !valA) return
      if (checkA(valA, cur.aAnswers[0])) {
        setStA('correct')
        setHintStep(0)
        setHintTimerId(prev => { clearHintTimer(prev); return null })
        if (!hasB) setDoneCount(c => c + 1)
      } else {
        setStA('wrong')
        if (hintStep === 0 && cur.hint) {
          clearHintTimer(hintTimerId)
          startHint(cur.hint)
        }
      }
    },
  }

  // logタグ部分タップ操作
  const selectTag = (token) => {
    if (!aOK || bOK) return
    setValB(token)
    setStB(null)
  }
  const confirmTag = () => {
    if (!aOK || bOK || valB === undefined) return
    if (checkB(valB, cur.bAnswers)) {
      setStB('correct')
      setDoneCount(c => c + 1)
    } else {
      setStB('wrong')
    }
  }

  function fillTemplate() {
    let out = cur.template
    if (out.includes('{A}')) {
      let repl
      if (stA === 'correct') repl = `\\textcolor{#4dff88}{${toKatexA(cur.aDisplay)}}`
      else if (stA === 'wrong') repl = `\\textcolor{#ff6666}{${toKatexA(valA) || '?'}}`
      else if (valA) repl = `\\textcolor{#4db8ff}{${toKatexA(valA)}}`
      else repl = '\\boxed{?}'
      out = out.split('{A}').join(repl)
    }
    if (out.includes('{B}')) {
      let repl
      if (stB === 'correct') repl = `\\textcolor{#4dff88}{${cur.bDisplay}}`
      else if (stB === 'wrong') repl = `\\textcolor{#ff6666}{${toKatexB(valB) || '?'}}`
      else if (valB !== undefined) repl = `\\textcolor{#4db8ff}{${toKatexB(valB)}}`
      else if (aOK) repl = '\\boxed{?}'
      else repl = '\\square' // A未完了の間はBは薄く伏せておく
      out = out.split('{B}').join(repl)
    }
    return out
  }

  // クリア画面
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 14</h1>
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
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 14</h1>

      {/* 公式パネル（常時表示） */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', background: '#1a1a2e' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <a
            href="https://qua2000.github.io/math-puzzle/#/step8"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '13px' }}
          >
            ← Step8
          </a>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={"\\left(\\dfrac{f}{g}\\right)' = \\dfrac{f'\\cdot g - f\\cdot g'}{g^2}"} />
        </div>
        <div style={{ borderTop: '1px solid #444', paddingTop: '8px', textAlign: 'center' }}>
          <InlineMath math={"(a^x)' = a^x\\log a \\quad\\quad (e^x)' = e^x"} />
        </div>
      </div>

      {/* 進捗 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      {/* 早見表（Aが完了しないと使えない） */}
      {hasB && (
        <div style={{ border: '2px solid #ffd24d55', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', background: '#1a1a2e' }}>
          <TagTable onSelect={selectTag} disabled={!aOK || bOK} />
        </div>
      )}

      {/* 問題エリア */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <BlockMath math={fillTemplate()} />
        </div>

        {allDone ? (
          <div style={{ textAlign: 'center', fontSize: '36px', marginTop: '8px' }}>⭕</div>
        ) : (
          (stA === 'wrong' || stB === 'wrong') && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
            </div>
          )
        )}

        {/* ヒント表示 */}
        {hintStep > 0 && cur.hint && !aOK && (
          <div style={{ marginTop: '12px', background: '#0f2a1a', border: '1.5px solid #44bb66', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ color: '#88ff88', fontSize: '13px', marginBottom: '6px', textAlign: 'center' }}>step :</div>
            <div style={{ overflowX: 'auto' }}>
              <BlockMath math={buildAligned(cur.hint.slice(0, hintStep))} />
            </div>
          </div>
        )}
      </div>

      {/* 操作エリア */}
      {allDone ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advanceProblem} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Next ▶
          </button>
        </div>
      ) : !aOK ? (
        <NumKeyboard onKey={kb.key} onDelete={kb.del} onEnter={kb.enter} enterDisabled={!valA} />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={confirmTag}
            disabled={valB === undefined}
            style={{
              padding: '12px 48px', fontSize: '20px', borderRadius: '10px', border: '1.5px solid #44ff8855',
              backgroundColor: valB === undefined ? '#1a2e1a55' : '#1a4a1a',
              color: '#88ff88', cursor: valB === undefined ? 'default' : 'pointer',
              fontWeight: 'bold', opacity: valB === undefined ? 0.5 : 1,
            }}
          >
            ✓
          </button>
        </div>
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
