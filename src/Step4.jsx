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
  const notation = qType === 0 ? 'D' : qType === 1 ? 'prime' : 'dfrac'
  const question = formatQ(notation, inner)

  // ヒント用サンプル（固定例：2x⁴-3x²+5 → 実際の問題の数字とは別の値）
  const hintStages = [
    formatQ(notation, `2x^{4}-3x^{2}+5`),
    `8x^{4}-6x^{2}+0`,
    `8x^{4-1}-6x^{2-1}`,
    `8x^{3}-6x`,
  ]

  return {
    question, correct: correctStr,
    choices: shuffleArray([correctStr, wrong1, wrong2, wrong3]
      .filter((v, i, a) => a.indexOf(v) === i)  // 重複除去
      .slice(0, 4)),
    terms,
    hintStages,
  }
}

export default function Step4() {
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
