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

function Step1() {

  // ランダム整数生成
  const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // 配列シャッフル
  const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5)
  }

  // 問題生成
  const generateProblem = () => {

    // サンプルのx²とx⁵を除外
    const candidates = [3, 4, 6, 7, 8, 9]
    const n = candidates[randomInt(0, candidates.length - 1)]

    const correct = `${n}x^{${n - 1}}`

    const wrong1 = `${n}x^{${n}}`
    const wrong2 = `${n - 1}x^{${n - 1}}`
    const wrong3 = `x^{${n}}`

    const choices = shuffleArray([
      correct,
      wrong1,
      wrong2,
      wrong3
    ])

    // ランダムに記号を選ぶ（0なら ()' 形式、1なら d/dx 形式）
    const questionType = randomInt(0, 1)
    const notation = questionType === 0 ? 'prime' : 'dfrac'
    const question = formatQ(notation, `x^{${n}}`)

    // ヒント用のサンプル（問いのnと被らない数を使う）
    const exampleN = n === 3 ? 4 : 3
    const hintStages = [
      formatQ(notation, `x^{${exampleN}}`),
      `${exampleN}x^{${exampleN}}`,
      `${exampleN}x^{${exampleN}-1}`,
      `${exampleN}x^{${exampleN - 1}}`,
    ]

    return {
      question: question,
      correct: correct,
      choices: choices,
      notation,
      hintStages,
    }
  }

  const navigate = useNavigate()
  const [problem, setProblem] = useState(generateProblem())
  const [message, setMessage] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAnim, setShowAnim] = useState(false)

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

  return (
    <div style={{
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '24px',
      }}>
        <BlockMath math={"D(x^2)=2x"} />
        <BlockMath math={"(x^2)'=2x"} />
        <BlockMath math={String.raw`\frac{d}{dx}(x^2)=2x`} />
        <BlockMath math={"D(x^5)=5x^4"} />
        <BlockMath math={"(x^5)'=5x^4"} />
        <BlockMath math={String.raw`\frac{d}{dx}(x^5)=5x^4`} />
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

export default Step1
