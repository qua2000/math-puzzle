import { useState, useEffect } from 'react'
//import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
//import { BlockMath } from 'react-katex'
import { motion, AnimatePresence } from 'framer-motion'

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

function App() {

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

    const n = randomInt(2, 9)

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
    <div style={{ padding: '30px' }}>

      <h1>Math Puzzle</h1>

      <BlockMath math={"D(x^2)=2x"} />
      <BlockMath math={"(x^2)'=2x"} />
      <BlockMath math={String.raw`\frac{d}{dx}(x^2)=2x`} /> 

      <BlockMath math={"D(x^5)=5x^4"} />
      <BlockMath math={"(x^5)'=5x^4"} />
      <BlockMath math={String.raw`\frac{d}{dx}(x^5)=5x^4`} />
     
      
      <br />

      <BlockMath math={problem.question} />

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}
      >
        {problem.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => checkAnswer(choice)}
            style={{
              padding: '10px 20px',
              fontSize: '20px',

              backgroundColor:
                selectedAnswer === choice
                  ? choice === problem.correct
                    ? 'lightgreen'
                    : 'fuchsia' //'#ff9999'
                  : 'blue' //'white'
            }}
>
            <BlockMath math={choice} />
          </button>
        ))}
      </div>

      <h2>{message}</h2>
      <AnimatePresence>
        {showAnim && (
          <motion.div
            key={animN}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
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

      <button onClick={nextProblem}>
        Next
      </button>
      <hr />
      <a href="/step2">→ Step 2へ</a>

    </div>
  )
}

export default App


