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
  const a = randomInt(1, 5)
  const b = randomInt(1, 9) * (randomInt(0, 1) === 0 ? 1 : -1)

  const fStr = `x^{${n}}`
  const gStr = b >= 0 ? `${a}x+${b}` : `${a}x${b}`

  const df    = n === 2 ? `${n}x` : `${n}x^{${n-1}}`
  const dg    = `${a}`

  const coef1 = a * n + a
  const coef2 = b * n
  const finalStr = coef2 === 0
    ? `${coef1}x^{${n}}`
    : coef2 > 0
    ? `${coef1}x^{${n}}+${coef2}x^{${n-1}}`
    : `${coef1}x^{${n}}${coef2}x^{${n-1}}`

  const df_wrong1 = `${n}x^{${n}}`
  const df_wrong2 = n === 2 ? `x` : `x^{${n-1}}`
  const df_wrong3 = `${n+1}x^{${n-1}}`

  const dg_wrong1 = `${a}x`
  const dg_wrong2 = `0`
  const dg_wrong3 = `${a+1}`

  const final_wrong1 = coef2 > 0
    ? `${coef1}x^{${n}}+${coef2}x^{${n}}`
    : `${coef1}x^{${n}}${coef2}x^{${n}}`
  const final_wrong2 = coef2 > 0
    ? `${coef1+1}x^{${n}}+${coef2}x^{${n-1}}`
    : `${coef1+1}x^{${n}}${coef2}x^{${n-1}}`
  const final_wrong3 = `${a*n}x^{${n}}+${b*n}x^{${n-1}}`

  return {
    fStr, gStr, df, dg, finalStr,
    question: `D(x^{${n}} \\cdot (${gStr}))`,
    q1: { question: `D(${fStr})=?`,  correct: df,       choices: shuffleArray([df,       df_wrong1, df_wrong2, df_wrong3]) },
    q2: { question: `D(${gStr})=?`,  correct: dg,       choices: shuffleArray([dg,       dg_wrong1, dg_wrong2, dg_wrong3]) },
    q3: { question: `D(${fStr}) \\cdot (${gStr}) + ${fStr} \\cdot D(${gStr})=?`,
          correct: finalStr, choices: shuffleArray([finalStr, final_wrong1, final_wrong2, final_wrong3]) },
  }
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step5() {
  const navigate = useNavigate()
  const [problem, setProblem] = useState(generateProblem())
  const [phase, setPhase]     = useState(1)
  const [answers, setAnswers] = useState({})
  const [message, setMessage] = useState('')
  const [prepNum, setPrepNum] = useState(null)

  const currentQ = phase === 1 ? problem.q1 : phase === 2 ? problem.q2 : problem.q3
  const selected = answers[phase]

  const checkAnswer = (answer) => {
    if (selected !== undefined) return
    setAnswers(prev => ({ ...prev, [phase]: answer }))
    setMessage(answer === currentQ.correct ? '⭕' : '❌')
  }

  const nextPhase = () => { setPhase(phase + 1); setMessage('') }

  const nextProblem = () => {
    setPhase(1); setAnswers({}); setMessage('')
    setProblem(generateProblem())
  }

  const btnStyle = (choice) => ({
    padding: '12px 20px', fontSize: '20px', borderRadius: '10px',
    border: '2px solid #555', cursor: 'pointer',
    backgroundColor:
      selected === choice
        ? choice === currentQ.correct ? '#2d6a2d' : '#6a2d2d'
        : '#2a2a3e',
    color: 'white', minWidth: '80px', textAlign: 'center',
  })

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 5</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #444',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
      }}>
        <BlockMath math={String.raw`\boxed{\times = \cdot}`} />
        <BlockMath math={String.raw`D\{f \cdot g\} = D(f) \cdot g + f \cdot D(g)`} />
        <BlockMath math={String.raw`\,`} />

        {/*
          例：D{x²·(3x+1)}
          行3「2x(3x+1)」→ 分配法則が必要 → Prep2
          行4「6x²+2x+3x²」→ 同類項計算が必要 → Prep3
          各バッジを該当行の横に置く
        */}
        <div style={{ position: 'relative' }}>
          {/* 計算式本体 */}
          <BlockMath math={String.raw`\begin{aligned}
            D\{x^2 \cdot (3x+1)\}
              &= D(x^2) \cdot (3x+1) + x^2 \cdot D(3x+1) \\
              &= 2x(3x+1) + x^2 \cdot 3 \\
              &= 6x^2+2x+3x^2 \\
              &= 9x^2+2x
          \end{aligned}`} />

          {/*
            バッジは式の右端に縦に並べて配置。
            行の高さはKaTeXのレンダリングに依存するため
            topの値で大まかに位置を合わせる。
          */}
          <div style={{
            position: 'absolute', right: 0, top: 0,
            display: 'flex', flexDirection: 'column',
            gap: '6px', paddingTop: '60px',   /* 3行目あたり */
          }}>
            {/* 分配法則 → Prep2（3行目：2x(3x+1) の行） */}
            <PrepBadge num={2} onClick={() => setPrepNum(2)} />
            {/* 同類項   → Prep3（4行目：6x²+2x+3x²の行） */}
            <PrepBadge num={3} onClick={() => setPrepNum(3)} />
          </div>
        </div>
      </div>

      {/* 問題タイトル */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        <BlockMath math={problem.question} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: '32px', height: '8px', borderRadius: '4px',
              backgroundColor: i <= phase ? '#4db8ff' : '#333',
            }} />
          ))}
        </div>
      </div>

      {/* 現在の問い */}
      <div style={{
        background: '#1a2a1a', border: '2px solid #4dff88',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        {phase >= 2 && (
          <div style={{ color: '#aaa', marginBottom: '8px' }}>
            <BlockMath math={`D(${problem.fStr}) = ${problem.df}`} />
          </div>
        )}
        {phase >= 3 && (
          <div style={{ color: '#aaa', marginBottom: '8px' }}>
            <BlockMath math={`D(${problem.gStr}) = ${problem.dg}`} />
          </div>
        )}
        <BlockMath math={currentQ.question} />
      </div>

      {/* 選択肢 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {currentQ.choices.map((choice) => (
          <button key={choice} onClick={() => checkAnswer(choice)} style={btnStyle(choice)}>
            <BlockMath math={choice} />
          </button>
        ))}
      </div>

      {/* メッセージ */}
      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 16px' }}>{message}</h2>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        {selected !== undefined && phase < 3 && (
          <button onClick={nextPhase} style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>
            Next →
          </button>
        )}
        {selected !== undefined && phase === 3 && (
          <button onClick={nextProblem} style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>
            Next
          </button>
        )}
        <button onClick={() => navigate('/')} style={{
          padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent',
          color: '#aaa', cursor: 'pointer',
        }}>
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
