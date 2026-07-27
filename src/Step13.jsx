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

// ── 多項式部分（キーボード入力・Step7方式）───────────────────
function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

// 表示用：x^2 → x^{2}（「^」だけ入力された未完成の状態でもKaTeXがエラーにならないようにする）
function toKatexA(str) {
  if (!str) return ''
  let s = String(str)
  s = s.replace(/\^(-?\d+)/g, (_, exp) => `^{${exp}}`) // 完成した指数
  s = s.replace(/\^(?!{)/g, '^{}') // まだ数字が続いていない裸の「^」は空の上付きにしておく
  return s
}

function parseTerm(str) {
  const s = String(str).replace(/\s/g, '')
  if (!s) return null
  const m = s.match(/^(-?\d*)x(?:\^(-?\d+))?$/) // 例: 2x, -3x^2, x
  if (m) {
    const coef = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1])
    const exp = m[2] !== undefined ? Number(m[2]) : 1
    if (Number.isNaN(coef) || Number.isNaN(exp)) return null
    return { coef, exp }
  }
  const n = Number(s) // 定数のみ（例: 5）
  if (!Number.isNaN(n) && s !== '') return { coef: n, exp: 0 }
  return null
}

function checkA(userStr, correctStr) {
  if (!userStr) return false
  if (normalize(userStr) === normalize(correctStr)) return true
  const t1 = parseTerm(userStr)
  const t2 = parseTerm(correctStr)
  if (!t1 || !t2) return false
  return t1.coef === t2.coef && t1.exp === t2.exp
}

// ── logタグ部分（タップ選択・Step12方式）───────────────────
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

// ── 問題データ（全10問・積の微分のみ）───────────────────────
const PROBLEMS = [
  // ===== タイプA：x^n・e^x（logタグなし・穴埋め1か所） =====
  {
    template: "(x^2\\cdot e^x)' = {A}\\cdot e^x + x^2\\cdot e^x",
    aAnswers: ['2x'], aDisplay: '2x',
  },
  {
    template: "(x^3\\cdot e^x)' = {A}\\cdot e^x + x^3\\cdot e^x",
    aAnswers: ['3x^2'], aDisplay: '3x^2',
    hint: ["(x^3)'", '= 3x^{3-1}', '= 3x^2'],
  },
  {
    template: "(x\\cdot e^x)' = {A}\\cdot e^x + x\\cdot e^x",
    aAnswers: ['1'], aDisplay: '1',
  },

  // ===== タイプB：x^n・a^x（logタグあり） =====
  {
    template: "(x^2\\cdot 2^x)' = {A}\\cdot 2^x + x^2\\cdot 2^x{B}",
    aAnswers: ['2x'], aDisplay: '2x',
    bAnswers: ['log(2)'], bDisplay: '\\cdot\\log 2',
  },
  {
    template: "(x^2\\cdot 3^x)' = {A}\\cdot 3^x + x^2\\cdot 3^x{B}",
    aAnswers: ['2x'], aDisplay: '2x',
    bAnswers: ['log(3)'], bDisplay: '\\cdot\\log 3',
  },
  {
    template: "(x^3\\cdot 5^x)' = {A}\\cdot 5^x + x^3\\cdot 5^x{B}",
    aAnswers: ['3x^2'], aDisplay: '3x^2',
    bAnswers: ['log(5)'], bDisplay: '\\cdot\\log 5',
    hint: ["(x^3)'", '= 3x^2'],
  },
  {
    template: "(x\\cdot 10^x)' = {A}\\cdot 10^x + x\\cdot 10^x{B}",
    aAnswers: ['1'], aDisplay: '1',
    bAnswers: ['log(10)'], bDisplay: '\\cdot\\log 10',
  },

  // ===== タイプC：k・x^n・a^x（係数付き・応用） =====
  {
    template: "(2x^2\\cdot 3^x)' = {A}\\cdot 3^x + 2x^2\\cdot 3^x{B}",
    aAnswers: ['4x'], aDisplay: '4x',
    bAnswers: ['log(3)'], bDisplay: '\\cdot\\log 3',
    hint: ["(2x^2)'", '= 2\\cdot2x', '= 4x'],
  },
  {
    template: "(3x^2\\cdot e^x)' = {A}\\cdot e^x + 3x^2\\cdot e^x",
    aAnswers: ['6x'], aDisplay: '6x',
    hint: ["(3x^2)'", '= 3\\cdot2x', '= 6x'],
  },
  {
    template: "(5x\\cdot 2^x)' = {A}\\cdot 2^x + 5x\\cdot 2^x{B}",
    aAnswers: ['5'], aDisplay: '5',
    bAnswers: ['log(2)'], bDisplay: '\\cdot\\log 2',
    hint: ["(5x)'", '= 5'],
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
export default function Step13() {
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
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 13</h1>
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
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 13</h1>

      {/* 公式パネル（常時表示） */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', background: '#1a1a2e' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={"D\\{f\\cdot g\\} = D(f)\\cdot g + f\\cdot D(g)"} />
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
