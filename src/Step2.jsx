import { useState, useEffect } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// 1行で表示するための数式（Stepの→でつなぐ用）
const InlineMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// 問題の記号（D() / ()' / d/dx）に合わせて式を組み立てる
const formatQ = (notation, inner) => {
  if (notation === 'D') return `D(${inner})`
  if (notation === 'prime') return `(${inner})'`
  return String.raw`\frac{d}{dx}(${inner})`
}

// 「Step：A→B→C→D」を少しずつ表示していくコンポーネント
const StepHint = ({ stages }) => {
  const [count, setCount] = useState(1)

  useEffect(() => {
    setCount(1)
    const timers = stages.slice(1).map((_, i) =>
      setTimeout(() => setCount(i + 2), (i + 1) * 1000)
    )
    return () => timers.forEach(clearTimeout)
  }, [stages])

  return (
    <div style={{
      fontSize: '24px',
      margin: '16px 0',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px',
      background: '#1a1a2e',
      border: '1px solid #444',
      borderRadius: '10px',
      padding: '14px 18px',
    }}>
      <span style={{ color: '#4db8ff', fontWeight: 'bold', fontSize: '18px' }}>Step：</span>
      {stages.slice(0, count).map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {i > 0 && <span style={{ color: '#888' }}>→</span>}
          <span style={{ color: i === count - 1 ? 'lightgreen' : 'white' }}>
            <InlineMath math={s} />
          </span>
        </span>
      ))}
    </div>
  )
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5)

// グループA：D(axⁿ) n>=2
const generateProblemA = () => {
  const a = randomInt(2, 9)
  const n = randomInt(2, 9)
  const correct = `${a * n}x^{${n - 1}}`
  const wrong1  = `${a}x^{${n - 1}}`
  const wrong2  = `${a * n}x^{${n}}`
  const wrong3  = `${n}x^{${n - 1}}`

  // ヒント用サンプル（問いのa, nと被らない数を使う）
  const exA = a === 2 ? 3 : 2
  const exN = n === 3 ? 4 : 3
  const hintStages = [
    formatQ('D', `${exA}x^{${exN}}`),
    `${exA * exN}x^{${exN}}`,
    `${exA * exN}x^{${exN}-1}`,
    `${exA * exN}x^{${exN - 1}}`,
  ]

  return {
    question: `D(${a}x^{${n}})=?`,
    correct,
    choices: shuffleArray([correct, wrong1, wrong2, wrong3]),
    group: 'A', a, n,
    hintStages,
  }
}

// グループB：定数・定数×x のみ（例示と被らないよう限定）
const generateProblemB = () => {
  const type = randomInt(0, 1)

  if (type === 0) {
    // D(c)=0　例示の3,7と被らない数
    const candidates = [2, 4, 5, 6, 8, 9]
    const c = candidates[randomInt(0, candidates.length - 1)]

    // ヒント用サンプル（問いのcと被らない数を使う）
    const exC = c === 5 ? 7 : 5
    const hintStages = [
      formatQ('D', `${exC}`),
      `0`,
    ]

    return {
      question: `D(${c})=?`,
      correct: `0`,
      choices: shuffleArray([`0`, `${c}`, `1`, `${c}x`]),
      group: 'B', type, c,
      hintStages,
    }
  } else {
    // D(cx)=c　例示の4xと被らない係数
    const candidates = [2, 3, 5, 6, 7, 8, 9]
    const c = candidates[randomInt(0, candidates.length - 1)]

    // ヒント用サンプル（問いのcと被らない数を使う）
    const exC = c === 2 ? 3 : 2
    const hintStages = [
      formatQ('D', `${exC}x`),
      `${exC}x^{0}`,
      `${exC}`,
    ]

    return {
      question: `D(${c}x)=?`,
      correct: `${c}`,
      choices: shuffleArray([`${c}`, `0`, `${c}x`, `1`]),
      group: 'B', type, c,
      hintStages,
    }
  }
}

const SWITCH_EVERY = 5

export default function Step2() {
  const [count, setCount]                   = useState(0)
  const navigate = useNavigate()
  const [problem, setProblem]               = useState(generateProblemA())
  const [message, setMessage]               = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAnim, setShowAnim]             = useState(false)

  const group = Math.floor(count / SWITCH_EVERY) % 2 === 0 ? 'A' : 'B'

  const checkAnswer = (answer) => {
    setSelectedAnswer(answer)
    if (answer === problem.correct) {
      setMessage('⭕')
      setShowAnim(false)
    } else {
      setMessage('❌')
      setShowAnim(false)
      setTimeout(() => setShowAnim(true), 100)
    }
  }

  const nextProblem = () => {
    const nextCount = count + 1
    setCount(nextCount)
    setMessage('')
    setSelectedAnswer(null)
    setShowAnim(false)
    const nextGroup = Math.floor(nextCount / SWITCH_EVERY) % 2 === 0 ? 'A' : 'B'
    setProblem(nextGroup === 'A' ? generateProblemA() : generateProblemB())
  }

  const examplesA = [`D(2x^3)=6x^2`, `D(3x^4)=12x^3`, `D(5x^2)=10x`]
  const examplesB = [`D(3)=0`, `D(7)=0`, `D(x)=1`, `D(4x)=4`, `D(x^{0})=0`]
  const examples  = group === 'A' ? examplesA : examplesB

  return (
    <div style={{
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 2</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
      }}>
        <AnimatePresence mode="wait">
          <motion.div key={group} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            {examples.map((ex) => <BlockMath key={ex} math={ex} />)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 問題エリア */}
      <div style={{
        background: '#0d2137',
        border: '2px solid #4db8ff',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
        fontSize: '28px',
      }}>
        <BlockMath math={problem.question} />
      </div>

      {/* 選択肢 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '24px',
      }}>
        {problem.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => checkAnswer(choice)}
            style={{
              padding: '12px 20px',
              fontSize: '22px',
              borderRadius: '10px',
              border: '2px solid #555',
              cursor: 'pointer',
              backgroundColor:
                selectedAnswer === choice
                  ? choice === problem.correct ? '#2d6a2d' : '#6a2d2d'
                  : '#2a2a3e',
              color: 'white',
              minWidth: '80px',
              textAlign: 'center',
            }}
          >
            <BlockMath math={choice} />
          </button>
        ))}
      </div>

      {/* メッセージ */}
      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 16px' }}>
        {message}
      </h2>

      {/* ヒント（Stepチェーン表示） */}
      <AnimatePresence>
        {showAnim && (
          <motion.div key={problem.question} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StepHint stages={problem.hintStages} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ボタンエリア */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={nextProblem}
          style={{
            padding: '14px 32px',
            fontSize: '18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#1a6ef5',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Next
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '14px 32px',
            fontSize: '18px',
            borderRadius: '10px',
            border: '1px solid #555',
            backgroundColor: 'transparent',
            color: '#aaa',
            cursor: 'pointer',
          }}
        >
          ← Home
        </button>
      </div>

    </div>
  )
}
