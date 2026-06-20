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

// 係数が1のとき省略する
const term = (a, n) => {
  if (n === 1 && a === 1) return `x`
  if (n === 1) return `${a}x`
  if (a === 1) return `x^{${n}}`
  return `${a}x^{${n}}`
}

// 微分後の項表示
const dterm = (c, e) => {
  if (e === 0) return `${c}`
  if (e === 1 && c === 1) return `x`
  if (e === 1) return `${c}x`
  if (c === 1) return `x^{${e}}`
  return `${c}x^{${e}}`
}

// ヒント用：指数をそのまま文字式で見せる項（例：x^{4-1}）
const symTerm = (coef, expStr) => {
  if (coef === 1) return `x^{${expStr}}`
  return `${coef}x^{${expStr}}`
}

const generateProblem = () => {
  // 第1項：a1 x^n1
  const a1 = randomInt(1, 5)
  const n1 = randomInt(2, 5)
  // 第2項：a2 x^n2 （n2はn1と異なる）
  const a2 = randomInt(1, 5)
  let n2 = randomInt(2, 5)
  while (n2 === n1) n2 = randomInt(2, 5)

  // 正解
  const c1 = a1 * n1  // 第1項の係数
  const c2 = a2 * n2  // 第2項の係数
  const e1 = n1 - 1   // 第1項の指数
  const e2 = n2 - 1   // 第2項の指数

  const wrong1  = `${dterm(a1,e1)}+${dterm(c2,e2)}`
  const wrong2  = `${dterm(c1,e1)}+${dterm(c2,n2)}`
  const wrong3  = `${dterm(c1,n1)}+${dterm(c2,e2)}`

  // 問いの式
  // 和か差かランダムに選ぶ
  const isPlus = randomInt(0, 1) === 0

  // 記号（D() / ()' / d/dx）をランダムに選ぶ
  const qType = randomInt(0, 2)
  const notation = qType === 0 ? 'D' : qType === 1 ? 'prime' : 'dfrac'

  // 問いの式
  const sign = isPlus ? '+' : '-'
  const inner = `${term(a1,n1)}${sign}${term(a2,n2)}`
  const question = formatQ(notation, inner)

  // 正解・不正解も符号に合わせる
  const correctSigned = `${dterm(c1,e1)}${sign}${dterm(c2,e2)}`
  const wrong1Signed  = `${dterm(a1,e1)}${sign}${dterm(c2,e2)}`
  const wrong2Signed  = `${dterm(c1,e1)}${sign}${dterm(c2,n2)}`
  const wrong3Signed  = `${dterm(c1,n1)}${sign}${dterm(c2,e2)}`

  // ヒント用サンプル（問いのa1,n1,a2,n2と被らない数を使う）
  const exA1 = a1 === 2 ? 3 : 2
  const exN1 = n1 === 3 ? 4 : 3
  const exA2 = a2 === 1 ? 2 : 1
  const exN2 = n2 === 2 ? 3 : 2

  const hintStages = [
    formatQ(notation, `${term(exA1, exN1)}${sign}${term(exA2, exN2)}`),
    `${term(exA1 * exN1, exN1)}${sign}${term(exA2 * exN2, exN2)}`,
    `${symTerm(exA1 * exN1, `${exN1}-1`)}${sign}${symTerm(exA2 * exN2, `${exN2}-1`)}`,
    `${dterm(exA1 * exN1, exN1 - 1)}${sign}${dterm(exA2 * exN2, exN2 - 1)}`,
  ]

  return {
    question,
    correct: correctSigned,
    choices: shuffleArray([correctSigned, wrong1Signed, wrong2Signed, wrong3Signed]),
    hintStages,
  }
}

export default function Step3() {
  const navigate = useNavigate()
  const [problem, setProblem]               = useState(generateProblem())
  const [message, setMessage]               = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAnim, setShowAnim]             = useState(false)

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
    setMessage('')
    setSelectedAnswer(null)
    setShowAnim(false)
    setProblem(generateProblem())
  }

  const examples = [
    `D(x^2+x^3)=2x+3x^2`,
    `(2x^3+x^2)'=6x^2+2x`,
    String.raw`\frac{d}{dx}(x^4-3x^2)=4x^3-6x`,
    `D(3x^3-2x^2)=9x^2-4x`,
    `(x^5+2x^2)'=5x^4+4x`,
    String.raw`\frac{d}{dx}(4x^3-x^2)=12x^2-2x`,
  ]

  return (
    <div style={{
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 3</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
      }}>
        {examples.map((ex) => <BlockMath key={ex} math={ex} />)}
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
