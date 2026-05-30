import { useState, useEffect } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
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
  return {
    question: `D(${a}x^{${n}})=?`,
    correct,
    choices: shuffleArray([correct, wrong1, wrong2, wrong3]),
    group: 'A', a, n,
  }
}

// グループB：定数・定数×x のみ（例示と被らないよう限定）
const generateProblemB = () => {
  const type = randomInt(0, 1)

  if (type === 0) {
    // D(c)=0　例示の3,7と被らない数
    const candidates = [2, 4, 5, 6, 8, 9]
    const c = candidates[randomInt(0, candidates.length - 1)]
    return {
      question: `D(${c})=?`,
      correct: `0`,
      choices: shuffleArray([`0`, `${c}`, `1`, `${c}x`]),
      group: 'B', type,
    }
  } else {
    // D(cx)=c　例示の4xと被らない係数
    const candidates = [2, 3, 5, 6, 7, 8, 9]
    const c = candidates[randomInt(0, candidates.length - 1)]
    return {
      question: `D(${c}x)=?`,
      correct: `${c}`,
      choices: shuffleArray([`${c}`, `0`, `${c}x`, `1`]),
      group: 'B', type, c,
    }
  }
}

const SWITCH_EVERY = 5

// グループAのヒントアニメーション
const DiffAnimA = ({ a, n }) => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 1600),
      setTimeout(() => setStep(3), 2600),
      setTimeout(() => setStep(4), 3600),
      setTimeout(() => setStep(5), 4600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [a, n])

  const ex_a = a === 2 ? 3 : 2
  const ex_n = n === 3 ? 4 : 3
  const s = {
    wrap:  { fontSize: '32px', margin: '20px 0', display: 'flex', alignItems: 'flex-start', gap: '2px' },
    sup:   { fontSize: '20px', lineHeight: 1 },
    red:   { color: '#ff4444' },
    green: { color: 'lightgreen' },
  }

  return (
    <div style={{ margin: '10px 0' }}>
      {step <= 1 && (
        <div style={s.wrap}>
          <span>D(</span>
          <motion.span animate={{ color: step === 1 ? '#ff4444' : 'white', scale: step === 1 ? 1.4 : 1 }} transition={{ duration: 0.4 }}>{ex_a}</motion.span>
          <span>x</span><span style={s.sup}>{ex_n}</span><span>)</span>
        </div>
      )}
      {step === 2 && (
        <div style={s.wrap}>
          <span>D(</span><span style={s.red}>{ex_a}</span><span>x</span>
          <motion.span style={{ ...s.sup, ...s.red }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.5 }}>{ex_n}</motion.span>
          <span>)</span>
        </div>
      )}
      {step === 3 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>D(</span><span style={s.red}>{ex_a}×{ex_n}</span><span>x</span><span style={s.sup}>{ex_n}</span><span>)</span>
        </motion.div>
      )}
      {step === 4 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span style={s.red}>{ex_a * ex_n}</span><span>x</span>
          <motion.span style={{ ...s.sup, ...s.red }} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.4 }}>{ex_n}-1</motion.span>
        </motion.div>
      )}
      {step === 5 && (
        <motion.div style={{ ...s.wrap, ...s.green }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <span>{ex_a * ex_n}x</span><span style={s.sup}>{ex_n - 1}</span>
        </motion.div>
      )}
    </div>
  )
}

// グループBのヒントアニメーション
const DiffAnimB = ({ type, c }) => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [type, c])

  const s = {
    wrap:  { fontSize: '32px', margin: '10px 0', display: 'flex', alignItems: 'flex-start', gap: '2px' },
    red:   { color: '#ff4444' },
    green: { color: 'lightgreen' },
  }

  // type0: D(c)=0の例、type1: D(cx)=cの例
  const ex = type === 0
    ? { q: 'D(5)', a: '0' }
    : { q: `D(${c === 2 ? 3 : 2}x)`, a: `${c === 2 ? 3 : 2}` }

  return (
    <div style={{ margin: '10px 0' }}>
      {step === 0 && <div style={s.wrap}><span>{ex.q} = ?</span></div>}
      {step === 1 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>{ex.q} = </span>
          <motion.span style={s.red} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.5 }}>{ex.a}</motion.span>
        </motion.div>
      )}
      {step === 2 && (
        <motion.div style={{ ...s.wrap, ...s.green }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <span>{ex.q} = {ex.a}</span>
        </motion.div>
      )}
    </div>
  )
}

export default function Step2() {
  const [count, setCount]                   = useState(0)
  const navigate = useNavigate()
  const [problem, setProblem]               = useState(generateProblemA())
  const [message, setMessage]               = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAnim, setShowAnim]             = useState(false)

  const group = Math.floor(count / SWITCH_EVERY) % 2 === 0 ? 'A' : 'B'

  const checkAnswer = (answer) => {
    if (selectedAnswer !== null) return   // 回答済みは無視
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

      {/* アニメーション */}
      <AnimatePresence>
        {showAnim && (
          <motion.div key={problem.question} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {problem.group === 'A'
              ? <DiffAnimA a={problem.a} n={problem.n} />
              : <DiffAnimB type={problem.type} c={problem.c} />
            }
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

