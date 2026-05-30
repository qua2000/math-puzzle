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

// 係数が1のとき省略・符号付き表示
const term = (a, n) => {
  if (n === 0) return `${Math.abs(a)}`
  if (n === 1 && Math.abs(a) === 1) return `x`
  if (n === 1) return `${Math.abs(a)}x`
  if (Math.abs(a) === 1) return `x^{${n}}`
  return `${Math.abs(a)}x^{${n}}`
}

const dterm = (c, e) => {
  if (e === 0) return `${Math.abs(c)}`
  if (e === 1 && Math.abs(c) === 1) return `x`
  if (e === 1) return `${Math.abs(c)}x`
  if (Math.abs(c) === 1) return `x^{${e}}`
  return `${Math.abs(c)}x^{${e}}`
}

// 符号を考慮した式の文字列を生成
const buildExpr = (terms) => {
  // terms = [{coef, exp}]
  return terms.map((t, i) => {
    const s = t.coef < 0 ? '-' : (i === 0 ? '' : '+')
    return `${s}${term(t.coef, t.exp)}`
  }).join('')
}

const buildDExpr = (terms) => {
  const dterms = terms
    .map(t => ({ coef: t.coef * t.exp, exp: t.exp - 1 }))
    .filter(t => t.exp >= 0 && t.coef !== 0)
  return dterms.map((t, i) => {
    const s = t.coef < 0 ? '-' : (i === 0 ? '' : '+')
    return `${s}${dterm(t.coef, t.exp)}`
  }).join('')
}

const generateProblem = () => {
  // 3項：ax^n1 ± bx^n2 ± c（定数項）
  const signs = [1, -1]
  const a1 = randomInt(1, 5) * signs[randomInt(0, 1)]
  const a2 = randomInt(1, 5) * signs[randomInt(0, 1)]
  const a3 = randomInt(1, 5) * signs[randomInt(0, 1)]

  let n1 = randomInt(3, 5)
  let n2 = randomInt(2, 4)
  while (n2 >= n1) n2 = randomInt(2, 4)

  const terms = [
    { coef: a1, exp: n1 },
    { coef: a2, exp: n2 },
    { coef: a3, exp: 0 },  // 定数項
  ]

  const inner = buildExpr(terms)
  const correctStr = buildDExpr(terms)

  // 不正解1：第1項の指数を-1し忘れ
  const w1terms = [
    { coef: a1 * n1, exp: n1 },
    { coef: a2 * n2, exp: n2 - 1 },
  ]
  const wrong1 = buildDExpr(w1terms)

  // 不正解2：第2項の係数を掛け忘れ
  const w2terms = [
    { coef: a1 * n1, exp: n1 - 1 },
    { coef: a2, exp: n2 - 1 },
  ]
  const wrong2 = buildDExpr(w2terms)

  // 不正解3：定数項を微分せず残す
  const w3terms = [
    { coef: a1 * n1, exp: n1 - 1 },
    { coef: a2 * n2, exp: n2 - 1 },
    { coef: a3, exp: 0 },
  ]
  const wrong3 = buildDExpr(w3terms)

  // 記号ランダム
  const qType = randomInt(0, 2)
  const question = qType === 0
    ? `D(${inner})=?`
    : qType === 1
    ? `(${inner})'=?`
    : String.raw`\frac{d}{dx}(${inner})=?`

  return {
    question, correct: correctStr,
    choices: shuffleArray([correctStr, wrong1, wrong2, wrong3]
      .filter((v, i, a) => a.indexOf(v) === i)  // 重複除去
      .slice(0, 4)),
    terms,
  }
}

const DiffAnim = ({ terms }) => {
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
  }, [terms])

  const s = {
    wrap:  { fontSize: '26px', margin: '10px 0', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2px' },
    sup:   { fontSize: '16px', lineHeight: 1 },
    red:   { color: '#ff4444' },
    green: { color: 'lightgreen' },
  }

  // 固定例：2x⁴ - 3x² + 5
  const ex = [
    { coef: 2, exp: 4 },
    { coef: -3, exp: 2 },
    { coef: 5, exp: 0 },
  ]
  const exInner = buildExpr(ex)
  const exResult = buildDExpr(ex)

  return (
    <div style={{ margin: '10px 0' }}>
      {step === 0 && (
        <div style={s.wrap}>
          <span>D({exInner})</span>
        </div>
      )}
      {step === 1 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.span style={s.red} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
            D(2x<span style={s.sup}>4</span>)
          </motion.span>
          <span>+D(-3x<span style={s.sup}>2</span>)+D(5)</span>
        </motion.div>
      )}
      {step === 2 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.span style={s.red}>8x<span style={s.sup}>3</span></motion.span>
          <span>+</span>
          <motion.span style={s.red} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
            D(-3x<span style={s.sup}>2</span>)
          </motion.span>
          <span>+D(5)</span>
        </motion.div>
      )}
      {step === 3 && (
        <motion.div style={s.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span style={s.red}>8x<span style={s.sup}>3</span>-6x</span>
          <span>+</span>
          <motion.span style={s.red} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
            D(5)
          </motion.span>
        </motion.div>
      )}
      {step === 4 && (
        <motion.div style={{ ...s.wrap, ...s.green }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <span>{exResult}</span>
        </motion.div>
      )}
    </div>
  )
}

export default function Step4() {
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
    `D(x^3+2x^2+1)=3x^2+4x`,
    `(2x^4-x^2+3)'=8x^3-2x`,
    String.raw`\frac{d}{dx}(-x^3+4x^2-2)=-3x^2+8x`,
    `D(3x^4-2x^3+5)=12x^3-6x^2`,
    `(-2x^3+x^2-4)'=-6x^2+2x`,
    String.raw`\frac{d}{dx}(x^4-3x^2+2x)=4x^3-6x+2`,
  ]

  return (
    <div style={{
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 4</h1>

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
            <DiffAnim terms={problem.terms} />
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


