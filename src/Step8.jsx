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
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', fontSize: '13px', fontWeight: 'bold',
      borderRadius: '20px', border: '1.5px solid #f0a500',
      backgroundColor: 'rgba(240,165,0,0.15)', color: '#f0a500',
      cursor: 'pointer', verticalAlign: 'middle', marginLeft: '8px', lineHeight: 1.2,
    }}
  >
    📘 Prep{num}
  </button>
)

// ── 準備中ポップアップ ───────────────────────────────────
const PrepPopup = ({ num, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a1a2e', border: '2px solid #f0a500',
      borderRadius: '16px', padding: '32px 40px', textAlign: 'center', minWidth: '220px',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f0a500' }}>Prep {num}</div>
      <div style={{ fontSize: '28px', marginTop: '8px' }}>Coming Soon</div>
      <button onClick={onClose} style={{
        marginTop: '24px', padding: '10px 28px', fontSize: '16px',
        borderRadius: '10px', border: 'none', backgroundColor: '#f0a500',
        color: '#000', cursor: 'pointer', fontWeight: 'bold',
      }}>OK</button>
    </div>
  </div>
)

// ── 記号3種 ─────────────────────────────────────────────
// notationType: 0=D(), 1=()', 2=d/dx()
const notations = [0, 1, 2]

const applyNotation = (type, expr) => {
  if (type === 0) return `D(${expr})`
  if (type === 1) return `(${expr})'`
  return `\\dfrac{d}{dx}(${expr})`
}

const applyNotationOuter = (type, expr) => {
  if (type === 0) return `D\\{${expr}\\}`
  if (type === 1) return `\\{${expr}\\}'`
  return `\\dfrac{d}{dx}\\{${expr}\\}`
}

// ── 多項式文字列ヘルパー ─────────────────────────────────
// ax^n ± b の文字列
const polyStr = (a, n, b) => {
  const xPart = n === 1 ? 'x' : `x^{${n}}`
  const head  = a === 1 ? xPart : a === -1 ? `-${xPart}` : `${a}${xPart}`
  const bAbs  = Math.abs(b)
  const tail  = b === 0 ? '' : b > 0 ? `+${b}` : `-${bAbs}`
  return head + tail
}

// D(ax^n ± b) = an·x^{n-1}
const diffPolyStr = (a, n) => {
  const coef = a * n
  if (n === 1) return `${coef}`
  if (n === 2) return `${coef}x`
  return `${coef}x^{${n-1}}`
}

// ── 問題生成 ────────────────────────────────────────────
const generateProblem = () => {
  // 記号をランダムに選ぶ
  const notation = notations[randomInt(0, 2)]

  // どちらを高次にするかランダム
  const highLeft = randomInt(0, 1) === 0

  // 高次側: ax^n ± b (n=2 or 3)
  const n    = randomInt(2, 3)
  const aH   = randomInt(1, 3)
  const bH   = randomInt(1, 5) * (randomInt(0,1) === 0 ? 1 : -1)

  // 1次側: cx ± d
  const c    = randomInt(1, 4)
  const d    = randomInt(1, 8) * (randomInt(0,1) === 0 ? 1 : -1)

  const highStr   = polyStr(aH, n, bH)       // 高次項 文字列
  const linearStr = polyStr(c, 1, d)          // 1次項 文字列

  const fStr = highLeft ? highStr  : linearStr
  const gStr = highLeft ? linearStr : highStr

  const dfStr = highLeft ? diffPolyStr(aH, n) : diffPolyStr(c, 1)  // D(f)
  const dgStr = highLeft ? diffPolyStr(c, 1)  : diffPolyStr(aH, n) // D(g)

  // 穴埋め：左右ランダム
  const askLeft = randomInt(0, 1) === 0
  const correct = askLeft ? dfStr : dgStr

  // 公式展開行
  const formulaLine = `${applyNotation(notation, fStr)} \\cdot (${gStr}) + (${fStr}) \\cdot ${applyNotation(notation, gStr)}`

  // 穴埋め行
  const blankLine = askLeft
    ? `\\square \\cdot (${gStr}) + (${fStr}) \\cdot ${applyNotation(notation, gStr)}`
    : `${applyNotation(notation, fStr)} \\cdot (${gStr}) + (${fStr}) \\cdot \\square`

  // 不正解選択肢
  const makeWrongs = (correct, a, n) => {
    if (n === 1) {
      // D(ax+b)=a の間違いパターン
      return [`${a}x`, `${a+1}`, `0`]
    } else {
      // D(ax^n+b)=an·x^{n-1} の間違いパターン
      const coef = a * n
      return [
        `${coef}x^{${n}}`,       // 指数-1忘れ
        `x^{${n-1}}`,            // 係数忘れ
        `${coef+1}x^{${n-1}}`,  // 係数ミス
      ]
    }
  }

  const wrongs = askLeft
    ? makeWrongs(correct, highLeft ? aH : c, highLeft ? n : 1)
    : makeWrongs(correct, highLeft ? c : aH, highLeft ? 1 : n)

  return {
    notation,
    fStr, gStr, dfStr, dgStr,
    askLeft, correct,
    formulaLine, blankLine,
    blankQuestion: `\\square = ?`,
    question: applyNotationOuter(notation, `(${fStr})(${gStr})`),
    choices: shuffleArray([correct, ...wrongs]),
  }
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step8() {
  const navigate = useNavigate()
  const [problem, setProblem]           = useState(generateProblem())
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [message, setMessage]           = useState('')
  const [prepNum, setPrepNum]           = useState(null)

  const checkAnswer = (answer) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)
    setMessage(answer === problem.correct ? '⭕' : '❌')
  }

  const nextProblem = () => {
    setSelectedAnswer(null)
    setMessage('')
    setProblem(generateProblem())
  }

  // 例示：記号3種それぞれ1つ
  const examples = [
    // D( ) 記号
    {
      formula: String.raw`\begin{aligned}
        D\{(x^2-1)(3x+2)\}
          &= D(x^2-1) \cdot (3x+2) + (x^2-1) \cdot D(3x+2) \\
          &= 2x(3x+2) + (x^2-1) \cdot 3
      \end{aligned}`,
    },
    // ( )' 記号
    {
      formula: String.raw`\begin{aligned}
        \{(x+2)(2x^2-5)\}'
          &= (x+2)' \cdot (2x^2-5) + (x+2) \cdot (2x^2-5)' \\
          &= 1 \cdot (2x^2-5) + (x+2) \cdot 4x
      \end{aligned}`,
    },
    // d/dx( ) 記号
    {
      formula: String.raw`\begin{aligned}
        \dfrac{d}{dx}\{(x^3+1)(2x-3)\}
          &= \dfrac{d}{dx}(x^3+1) \cdot (2x-3) + (x^3+1) \cdot \dfrac{d}{dx}(2x-3) \\
          &= 3x^2(2x-3) + (x^3+1) \cdot 2
      \end{aligned}`,
    },
  ]

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 8</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #444',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
      }}>
        <BlockMath math={String.raw`\boxed{\times = \cdot}`} />
        <BlockMath math={String.raw`D\{f \cdot g\} = D(f) \cdot g + f \cdot D(g)`} />
        <BlockMath math={String.raw`\,`} />

        {examples.map((ex, i) => (
          <div key={i}>
            {/* 計算式 */}
            <BlockMath math={ex.formula} />
            {/* バッジを式の下に横並び */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px', marginBottom: '4px' }}>
              <PrepBadge num={2} onClick={() => setPrepNum(2)} />
              <PrepBadge num={3} onClick={() => setPrepNum(3)} />
            </div>
            {i < examples.length - 1 && <BlockMath math={String.raw`\,`} />}
          </div>
        ))}
      </div>

      {/* 問題エリア */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '12px',
      }}>
        <BlockMath math={
          `\\begin{aligned}
            ${problem.question} &= ${problem.formulaLine} \\\\
            &= ${problem.blankLine}
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

      {/* ボタン */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button onClick={nextProblem} style={{
          padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
          border: 'none', backgroundColor: '#1a6ef5', color: 'white',
          cursor: 'pointer', fontWeight: 'bold',
        }}>
          Next
        </button>
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
