import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5)

// ── Prepバッジ ──────────────────────────────────────────
const PrepBadge = ({ num, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      fontSize: '13px',
      fontWeight: 'bold',
      borderRadius: '20px',
      border: '1.5px solid #f0a500',
      backgroundColor: 'rgba(240,165,0,0.15)',
      color: '#f0a500',
      cursor: 'pointer',
      verticalAlign: 'middle',
      marginLeft: '8px',
      lineHeight: 1.2,
    }}
  >
    📘 Prep{num}
  </button>
)

// ── 準備中ポップアップ ───────────────────────────────────
const PrepPopup = ({ num, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#1a1a2e',
        border: '2px solid #f0a500',
        borderRadius: '16px',
        padding: '32px 40px',
        textAlign: 'center',
        minWidth: '220px',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f0a500' }}>
        Prep {num}
      </div>
      <div style={{ fontSize: '28px', marginTop: '8px' }}>Coming Soon</div>
      <button
        onClick={onClose}
        style={{
          marginTop: '24px',
          padding: '10px 28px',
          fontSize: '16px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: '#f0a500',
          color: '#000',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        OK
      </button>
    </div>
  </div>
)

// ── 問題生成 ────────────────────────────────────────────
const generateProblem = () => {
  const n = randomInt(2, 5)
  let m = randomInt(2, 5)
  while (m === n) m = randomInt(2, 5)

  const dn = `${n}x^{${n-1}}`
  const dm = `${m}x^{${m-1}}`
  const askLeft = randomInt(0, 1) === 0
  const correct = askLeft ? dn : dm

  const wrong1 = askLeft ? `${n}x^{${n}}`      : `${m}x^{${m}}`
  const wrong2 = askLeft ? `x^{${n-1}}`         : `x^{${m-1}}`
  const wrong3 = askLeft ? `${n+1}x^{${n-1}}`  : `${m+1}x^{${m-1}}`

  const formulaLine = `D(x^{${n}}) \\cdot x^{${m}} + x^{${n}} \\cdot D(x^{${m}})`
  const blankLine = askLeft
    ? `= \\square \\cdot x^{${m}} + x^{${n}} \\cdot ${dm}`
    : `= ${dn} \\cdot x^{${m}} + x^{${n}} \\cdot \\square`

  return {
    n, m, dn, dm, askLeft,
    formulaLine, blankLine,
    blankQuestion: `\\square = ?`,
    question: `D(x^{${n}} \\cdot x^{${m}})`,
    correct,
    choices: shuffleArray([correct, wrong1, wrong2, wrong3]),
  }
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step5() {
  const navigate = useNavigate()
  const [problem, setProblem]       = useState(generateProblem())
  const [message, setMessage]       = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [prepNum, setPrepNum]       = useState(null)   // ポップアップ表示するPrep番号

  const checkAnswer = (answer) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)
    setMessage(answer === problem.correct ? '⭕' : '❌')
  }

  const nextProblem = () => {
    setMessage('')
    setSelectedAnswer(null)
    setProblem(generateProblem())
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 5</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #444',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
      }}>
        {/* かけ算記号説明 */}
        <BlockMath math={String.raw`\boxed{\times = \cdot}`} />

        {/* 公式 */}
        <BlockMath math={String.raw`D\{f \cdot g\} = D(f) \cdot g + f \cdot D(g)`} />
        <BlockMath math={String.raw`\,`} />

        {/* 例1：2x · x^3 — 途中結果に指数法則(Prep1)が必要 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <BlockMath math={String.raw`\begin{aligned} D\{x^2 \cdot x^3\} &= D(x^2) \cdot x^3 + x^2 \cdot D(x^3) \\ &= 2x \cdot x^3 + x^2 \cdot 3x^2 \end{aligned}`} />
          </div>
          <div style={{ paddingTop: '28px' }}>
            <PrepBadge num={1} onClick={() => setPrepNum(1)} />
          </div>
        </div>

        <BlockMath math={String.raw`\,`} />

        {/* 例2：x^3 · x^4 — 同様にPrep1 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <BlockMath math={String.raw`\begin{aligned} D\{x^3 \cdot x^4\} &= D(x^3) \cdot x^4 + x^3 \cdot D(x^4) \\ &= 3x^2 \cdot x^4 + x^3 \cdot 4x^3 \end{aligned}`} />
          </div>
          <div style={{ paddingTop: '28px' }}>
            <PrepBadge num={1} onClick={() => setPrepNum(1)} />
          </div>
        </div>
      </div>

      {/* 問題エリア */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '12px',
      }}>
        <BlockMath math={
          `\\begin{aligned}
            ${problem.question} &= ${problem.formulaLine} \\\\
            &${problem.blankLine}
          \\end{aligned}`
        } />
        <div style={{ textAlign: 'center', color: '#4db8ff', fontWeight: 'bold' }}>
          <BlockMath math={problem.blankQuestion} />
        </div>
      </div>

      {/* 選択肢 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {problem.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => checkAnswer(choice)}
            style={{
              padding: '12px 20px', fontSize: '22px', borderRadius: '10px',
              border: '2px solid #555', cursor: 'pointer',
              backgroundColor:
                selectedAnswer === choice
                  ? choice === problem.correct ? '#2d6a2d' : '#6a2d2d'
                  : '#2a2a3e',
              color: 'white', minWidth: '80px', textAlign: 'center',
            }}
          >
            <BlockMath math={choice} />
          </button>
        ))}
      </div>

      {/* メッセージ */}
      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 16px' }}>{message}</h2>

      {/* ボタンエリア */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={nextProblem}
          style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          Next
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: '1px solid #555', backgroundColor: 'transparent',
            color: '#aaa', cursor: 'pointer',
          }}
        >
          ← Home
        </button>
      </div>

      {/* Prepポップアップ */}
      {prepNum !== null && (
        <PrepPopup num={prepNum} onClose={() => setPrepNum(null)} />
      )}
    </div>
  )
}
