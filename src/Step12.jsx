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

// タグ変換：␣（空白マス＝eの特別ルール）／log(5) → \times\log 5（掛け算記号ごと表示）
function toKatex(str) {
  if (str === undefined || str === null) return ''
  let s = String(str)
  s = s.replace(/␣/g, '')
  s = s.replace(/log\((\d+)\)/g, (_, n) => `\\times\\log ${n}`)
  return s
}

// 答えチェック
function norm(s) {
  return String(s).replace(/\s/g, '').toLowerCase()
}
function checkAns(userStr, correctList) {
  if (userStr === undefined) return false
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

// 穴埋めトークン {A} を現在の状態に応じて置き換える
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
    } else if (vals[key] !== undefined) {
      repl = `\\textcolor{#4db8ff}{${toKatex(vals[key])}}`
    } else {
      repl = `\\boxed{?}`
    }
    out = out.split(token).join(repl)
  })
  return out
}

// ── 早見表（タグ選択肢） ──────────────────────────────────
const TAG_OPTIONS = [
  { token: '␣', a: 'e', math: null },        // 空白マス（何も掛けない＝特別ルール）
  { token: 'log(2)', a: '2', math: '\\log 2' },
  { token: 'log(3)', a: '3', math: '\\log 3' },
  { token: 'log(5)', a: '5', math: '\\log 5' },
  { token: 'log(10)', a: '10', math: '\\log 10' },
]

// ── タイプ定義（常時表示する基本ルール） ──────────────────
const TYPES = [
  { // A: e^x（特別ルール）
    line1: "(a^x)' = a^x\\log a",
    line2: "(e^x)' = e^x",
  },
  { // B: a^x（基本）
    line1: "(a^x)' = a^x\\log a",
    line2: "(e^x)' = e^x",
  },
  { // C: k・a^x（係数付き）
    line1: "(k\\cdot a^x)' = k\\cdot a^x\\log a",
    line2: "(e^x)' = e^x",
  },
]

// ── 問題データ（全16問） ──────────────────────────────────
const PROBLEMS = [
  // ===== タイプA：e^x（穴埋め2問＋自力2問） =====
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(e^x)' = e^x{A}"] }],
    blanks: { A: { answers: ['␣'], display: '' } },
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(4e^x)' = 4e^x{A}"] }],
    blanks: { A: { answers: ['␣'], display: '' } },
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(7e^x)' = 7e^x{A}"] }],
    blanks: { A: { answers: ['␣'], display: '' } },
    hint: ["(3e^x)'", "= 3\\cdot(e^x)'", '= 3\\cdot e^x', '= 3e^x'],
  },
  {
    typeIdx: 0,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(9e^x)' = 9e^x{A}"] }],
    blanks: { A: { answers: ['␣'], display: '' } },
    hint: ["(3e^x)'", "= 3\\cdot(e^x)'", '= 3\\cdot e^x', '= 3e^x'],
  },

  // ===== タイプB：a^x（穴埋め3問＋自力3問） =====
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(5^x)' = 5^x{A}"] }],
    blanks: { A: { answers: ['log(5)'], display: '\\times\\log 5' } },
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(2^x)' = 2^x{A}"] }],
    blanks: { A: { answers: ['log(2)'], display: '\\times\\log 2' } },
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(10^x)' = 10^x{A}"] }],
    blanks: { A: { answers: ['log(10)'], display: '\\times\\log 10' } },
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(3^x)' = 3^x{A}"] }],
    blanks: { A: { answers: ['log(3)'], display: '\\times\\log 3' } },
    hint: ["(5^x)'", '= 5^x\\times\\log 5'],
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(5^x)' = 5^x{A}"] }],
    blanks: { A: { answers: ['log(5)'], display: '\\times\\log 5' } },
    hint: ["(2^x)'", '= 2^x\\times\\log 2'],
  },
  {
    typeIdx: 1,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(10^x)' = 10^x{A}"] }],
    blanks: { A: { answers: ['log(10)'], display: '\\times\\log 10' } },
    hint: ["(3^x)'", '= 3^x\\times\\log 3'],
  },

  // ===== タイプC：k・a^x（穴埋め3問＋自力3問） =====
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(4\\cdot2^x)' = 4\\cdot2^x{A}"] }],
    blanks: { A: { answers: ['log(2)'], display: '\\times\\log 2' } },
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(2\\cdot5^x)' = 2\\cdot5^x{A}"] }],
    blanks: { A: { answers: ['log(5)'], display: '\\times\\log 5' } },
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(3\\cdot10^x)' = 3\\cdot10^x{A}"] }],
    blanks: { A: { answers: ['log(10)'], display: '\\times\\log 10' } },
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(6\\cdot3^x)' = 6\\cdot3^x{A}"] }],
    blanks: { A: { answers: ['log(3)'], display: '\\times\\log 3' } },
    hint: ["(4\\cdot2^x)'", '= 4\\cdot2^x\\times\\log 2'],
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(5\\cdot2^x)' = 5\\cdot2^x{A}"] }],
    blanks: { A: { answers: ['log(2)'], display: '\\times\\log 2' } },
    hint: ["(2\\cdot5^x)'", '= 2\\cdot5^x\\times\\log 5'],
  },
  {
    typeIdx: 2,
    blankKeys: ['A'],
    steps: [{ label: null, lines: ["(2\\cdot10^x)' = 2\\cdot10^x{A}"] }],
    blanks: { A: { answers: ['log(10)'], display: '\\times\\log 10' } },
    hint: ["(3\\cdot10^x)'", '= 3\\cdot10^x\\times\\log 10'],
  },
]

// ── UI部品 ──────────────────────────────────────────────

// 早見表（常時表示・タップで選択）
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
        <span style={{ color: '#4db8ff' }}>
          {opt.math ? <InlineMath math={opt.math} /> : (
            <span style={{
              display: 'inline-block', width: '22px', height: '18px',
              border: '2px dashed #4db8ff', borderRadius: '4px',
            }} />
          )}
        </span>
      </button>
    ))}
  </div>
)

const inputBox = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px', minWidth: '60px', minHeight: '20px', padding: '4px 12px',
  textAlign: 'center', color: wrong ? '#ff9999' : '#4db8ff',
  fontWeight: 'bold', fontSize: '18px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

// ── メインコンポーネント ─────────────────────────────────
export default function Step12() {
  const navigate = useNavigate()

  const [probIdx, setProbIdx] = useState(0)
  const [vals, setVals] = useState({})
  const [sts, setSts] = useState({})
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [hintStep, setHintStep] = useState(0)
  const [hintTimerId, setHintTimerId] = useState(null)

  const cur = PROBLEMS[probIdx]
  const total = PROBLEMS.length
  const curType = TYPES[cur.typeIdx]
  const curKey = cur.blankKeys[0]
  const allDone = sts[curKey] === 'ok'

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

  const select = (token) => {
    if (allDone) return
    setVals(s => ({ ...s, [curKey]: token }))
    setSts(s => ({ ...s, [curKey]: '' }))
  }

  const enter = () => {
    if (allDone) return
    const v = vals[curKey]
    if (v === undefined) return
    if (checkAns(v, cur.blanks[curKey].answers)) {
      setSts(s => ({ ...s, [curKey]: 'ok' }))
      setHintStep(0)
      setHintTimerId(prev => { clearHintTimer(prev); return null })
      setDoneCount(c => c + 1)
    } else {
      setSts(s => ({ ...s, [curKey]: 'ng' }))
      if (hintStep === 0 && cur.hint) {
        clearHintTimer(hintTimerId)
        startHint(cur.hint)
      }
    }
  }

  // クリア画面
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 12</h1>
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
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 12</h1>

      {/* 微分記号 */}
      <div style={{ textAlign: 'center', marginBottom: '10px', background: '#1a1a2e', border: '1px solid #555', borderRadius: '10px', padding: '8px 16px' }}>
        <InlineMath math={"(f)' = D(f) = \\dfrac{d}{dx}(f)"} />
      </div>

      {/* 進捗 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      {/* ── 基本式パネル（常時表示） ── */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', background: '#1a1a2e' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={curType.line1} />
        </div>
        <div style={{ borderTop: '1px solid #444', paddingTop: '8px', textAlign: 'center' }}>
          <span style={{ color: '#ffd24d', fontSize: '15px', marginRight: '6px' }}>⭐</span>
          <InlineMath math={curType.line2} />
        </div>
      </div>

      {/* ── 早見表（常時表示・タップ選択） ── */}
      <div style={{ border: '2px solid #ffd24d55', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', background: '#1a1a2e' }}>
        <TagTable onSelect={select} disabled={allDone} />
      </div>

      {/* ── 問題エリア ── */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>

        {cur.steps.map((step, si) => (
          <div key={si} style={{ marginBottom: '10px' }}>
            <div style={{ overflowX: 'auto' }}>
              <BlockMath math={buildAligned(step.lines.map(t => fillLine(t, cur.blanks, vals, sts)))} />
            </div>
          </div>
        ))}

        {/* 選択中のタグ表示 or 完了表示 */}
        {!allDone ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div style={inputBox(sts[curKey] === 'ng')}>
              {vals[curKey] !== undefined
                ? <InlineMath math={toKatex(vals[curKey]) || '\\,'} />
                : '?'}
            </div>
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

      {/* Next / 確認ボタン */}
      {allDone ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advanceProblem} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Next ▶
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={enter}
            disabled={vals[curKey] === undefined}
            style={{
              padding: '12px 48px', fontSize: '20px', borderRadius: '10px', border: '1.5px solid #44ff8855',
              backgroundColor: vals[curKey] === undefined ? '#1a2e1a55' : '#1a4a1a',
              color: '#88ff88', cursor: vals[curKey] === undefined ? 'default' : 'pointer',
              fontWeight: 'bold', opacity: vals[curKey] === undefined ? 0.5 : 1,
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
