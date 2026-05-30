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

  const correct = `${dterm(c1,e1)}+${dterm(c2,e2)}`
  const wrong1  = `${dterm(a1,e1)}+${dterm(c2,e2)}`
  const wrong2  = `${dterm(c1,e1)}+${dterm(c2,n2)}`
  const wrong3  = `${dterm(c1,n1)}+${dterm(c2,e2)}`
   
  
  // 問いの式
  // 和か差かランダムに選ぶ
  const isPlus = randomInt(0, 1) === 0

  // 問いの式
  const sign = isPlus ? '+' : '-'
  const inner = `${term(a1,n1)}${sign}${term(a2,n2)}`
  const qType = randomInt(0, 2)
  const question = qType === 0
    ? `D(${inner})=?`
    : qType === 1
    ? `(${inner})'=?`
    : String.raw`\frac{d}{dx}(${inner})=?`
  
  // 正解・不正解も符号に合わせる
  const correctSigned = `${dterm(c1,e1)}${sign}${dterm(c2,e2)}`
  const wrong1Signed  = `${dterm(a1,e1)}${sign}${dterm(c2,e2)}`
  const wrong2Signed  = `${dterm(c1,e1)}${sign}${dterm(c2,n2)}`
  const wrong3Signed  = `${dterm(c1,n1)}${sign}${dterm(c2,e2)}`

  return {
    question,
    correct: correctSigned,
    choices: shuffleArray([correctSigned, wrong1Signed, wrong2Signed, wrong3Signed]),
    a1, n1, a2, n2, isPlus
  }
}

const DiffAnim = ({ a1, n1, a2, n2, isPlus }) => {
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => setStep(3), 3000),
      setTimeout(() => setStep(4), 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [a1, n1, a2, n2, isPlus])

  // 例として固定値を使う（問いと被らないよう調整）
  const ea1 = a1 === 2 ? 3 : 2
  const en1 = n1 === 3 ? 4 : 3
  const ea2 = a2 === 1 ? 2 : 1
  const en2 = n2 === 2 ? 3 : 2

  const ec1 = ea1 * en1
  const ec2 = ea2 * en2
  const ee1 = en1 - 1
  const ee2 = en2 - 1

  const s = {
    wrap:  { fontSize: '28px', margin: '10px 0', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2px' },
    sup:   { fontSize: '18px', lineHeight: 1 },
    red:   { color: '#ff4444' },
    green: { color: 'lightgreen' },
  }

  return (
    <div style={{ margin: '10px 0' }}>

      {/* ステップ0：D(ea1 x^en1 + ea2 x^en2) を表示 */}
      {step === 0 && (
        <div style={s.wrap}>
          <span>D(</span>
          <span>{ea1}x</span><span style={s.sup}>{en1}</span>
          <span>+</span>
          <span>{ea2}x</span><span style={s.sup}>{en2}</span>
          <span>)</span>
        </div>
      )}

      {/* ステップ1：第1項が光る */}
      {step === 1 && (
        <div style={s.wrap}>
          <span>D(</span>
          <motion.span style={s.red} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
            {ea1}x<span style={s.sup}>{en1}</span>
          </motion.span>
          <span>{isPlus ? '+' : '-'}</span>
          <span>{ea2}x</span><span style={s.sup}>{en2}</span>
          <span>)</span>
        </div>
      )}

      {/* ステップ2：第1項が微分される */}
      {step === 2 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.span style={s.red}>{ec1}x<span style={s.sup}>{ee1}</span></motion.span>
          <span>+ D(</span>
          <span style={s.red}>{ea2}x</span><span style={{ ...s.sup, ...s.red }}>{en2}</span>
          <span>)</span>
        </motion.div>
      )}

      {/* ステップ3：第2項も微分される */}
      {step === 3 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span style={s.red}>{ec1}x<span style={s.sup}>{ee1}</span></span>
          <span>+</span>
          <motion.span style={s.red} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
            {ec2}x<span style={s.sup}>{ee2}</span>
          </motion.span>
        </motion.div>
      )}

      {/* ステップ4：完成 */}
      {step === 4 && (
        <motion.div style={{ ...s.wrap, ...s.green }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <span>{ec1}x<span style={s.sup}>{ee1}</span>+{ec2}x<span style={s.sup}>{ee2}</span></span>
        </motion.div>
      )}

    </div>
  )
}

export default function Step3() {
  const navigate = useNavigate()
  const [problem, setProblem]               = useState(generateProblem())
  const [message, setMessage]               = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showAnim, setShowAnim]             = useState(false)

  const checkAnswer = (answer) => {
    if (selectedAnswer !== null) return
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

      {/* アニメーション */}
      <AnimatePresence>
        {showAnim && (
          <motion.div key={problem.question} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DiffAnim a1={problem.a1} n1={problem.n1} a2={problem.a2} n2={problem.n2} isPlus={problem.isPlus} />
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
