import { useState, useEffect } from 'react'
//import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
//import { BlockMath } from 'react-katex'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const DiffAnim = ({ n }) => {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2500),
      setTimeout(() => setStep(4), 3500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [n])

  return (
    <div style={{ fontSize: '32px', margin: '20px 0', position: 'relative', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* ステップ0・1：D(xⁿ) 表示、指数が光る */}
      {step <= 1 && (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span>D(x</span>
          <motion.span
            animate={{ color: step === 1 ? '#ff4444' : 'white', scale: step === 1 ? 1.4 : 1 }}
            transition={{ duration: 0.4 }}
            style={{ fontSize: '20px', lineHeight: '1' }}
          >
            {n}
          </motion.span>
          <span>)</span>
        </div>
      )}

      {/* ステップ2：nがxの前に移動 */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <span>D(</span>
          <motion.span style={{ color: '#ff4444' }}>{n}</motion.span>
          <span>x</span>
          <span style={{ fontSize: '20px' }}>{n}</span>
          <span>)</span>
        </motion.div>
      )}

      {/* ステップ3：指数がn-1に変化 */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <span style={{ color: '#ff4444' }}>{n}</span>
          <span>x</span>
          <motion.span
            style={{ fontSize: '20px', color: '#ff4444' }}
          >
            {n}-1
          </motion.span>
        </motion.div>
      )}

      {/* ステップ4：完成 */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: 'flex', alignItems: 'flex-start', color: 'lightgreen' }}
        >
          <span>{n}x</span>
          <span style={{ fontSize: '20px' }}>{n - 1}</span>
        </motion.div>
      )}

    </div>
  )
}

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
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
    const question = questionType === 0
      ? `(x^{${n}})'=?`
      : String.raw`\frac{d}{dx}(x^{${n}})=?`
      //: `\\frac{d}{dx}(x^{${n}})=?`

    return {
      question: question,
      correct: correct,
      choices: choices
    }
  }

  const navigate = useNavigate()
  const [problem, setProblem] = useState(generateProblem())
  const [message, setMessage] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  //const [hint, setHint] = useState('')
  const [hint, setHint] = useState('')
  const [showAnim, setShowAnim] = useState(false)
  const [animN, setAnimN] = useState(3)

  const checkAnswer = (answer) => {
  setSelectedAnswer(answer)
  if (answer === problem.correct) {
    setMessage('⭕')
    setHint('')
    setShowAnim(false)
  } else {
    setMessage('❌')
    setHint('')
    // 問いのnと被らない例を選ぶ
    const currentN = parseInt(problem.question.match(/\d+/)[0])
    const exampleN = currentN === 3 ? 4 : 3
    setAnimN(exampleN)
    setShowAnim(false)
    setTimeout(() => setShowAnim(true), 100)
  }
}
  const nextProblem = () => {
  setMessage('')
  setSelectedAnswer(null)
  setHint('')
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

      {/* アニメーション */}
      <AnimatePresence>
        {showAnim && (
          <motion.div key={animN} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DiffAnim n={animN} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hint && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ color: 'orange', fontSize: '18px' }}
          >
            {hint}
          </motion.p>
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


