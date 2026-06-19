import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

function inputToKatex(tokens) {
  const base = tokens.map(t => t.val).join('')
  return base === '' ? '?' : base
}

function inputToAnswer(tokens) {
  return tokens.map(t => t.val).join('').replace(/\s/g, '')
}

const KeyboardKey = ({ label, onClick, color }) => {
  const colors = {
    num:   { bg: '#1a2a3e', border: '#4db8ff55', text: 'white' },
    alpha: { bg: '#1a2e1a', border: '#4dff8855', text: 'white' },
    sym:   { bg: '#2e1a2e', border: '#cc88ff55', text: 'white' },
    del:   { bg: '#3a1a1a', border: '#ff666655', text: '#ff9999' },
    enter: { bg: '#1a4a1a', border: '#44ff8855', text: '#88ff88' },
  }
  const c = colors[color] || colors.num
  return (
    <button onClick={onClick} style={{
      padding: '11px 4px',
      minWidth: '42px',
      flex: color === 'enter' ? 2 : 1,
      maxWidth: color === 'enter' ? '110px' : '58px',
      borderRadius: '8px',
      border: `1.5px solid ${c.border}`,
      background: c.bg, color: c.text,
      fontSize: '14px', fontWeight: 'bold',
      cursor: 'pointer', textAlign: 'center', fontFamily: 'sans-serif',
    }}>
      {label}
    </button>
  )
}

const CustomKeyboard = ({ onKey, onDelete, onEnter, showAlpha }) => {
  const rowStyle = {
    display: 'flex', gap: '5px',
    justifyContent: 'center', marginBottom: '5px', flexWrap: 'wrap',
  }
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <KeyboardKey key={n} label={n} color="num" onClick={() => onKey(n)} />
        ))}
      </div>
      {showAlpha && (
        <div style={rowStyle}>
          {['a','b','c','x','y','z'].map(c => (
            <KeyboardKey key={c} label={c} color="alpha" onClick={() => onKey(c)} />
          ))}
        </div>
      )}
      <div style={rowStyle}>
        {['+', '-'].map(s => (
          <KeyboardKey key={s} label={s} color="sym" onClick={() => onKey(s)} />
        ))}
      </div>
      <div style={rowStyle}>
        <KeyboardKey label="⌫" color="del" onClick={onDelete} />
        <KeyboardKey label="✓" color="enter" onClick={onEnter} />
      </div>
    </div>
  )
}

// ── 問題データ（56問・順番固定・サンプル3問）────────────────
const allProblems = [

  // 1: (-)+(-)，（）あり
  {
    samples: [
      '(-2)+(-6)=-8',
      '(-3)+(-4)=-7',
      '(-1)+(-9)=-10',
    ],
    question: '(-5)+(-3)=',
    answer: '-8',
  },

  // 2: (-)+(-)，（）なし
  {
    samples: [
      '-10-3=-13',
      '-5-6=-11',
      '-2-8=-10',
    ],
    question: '-4-7=',
    answer: '-11',
  },

  // 3: (+)+(-)，（）あり
  {
    samples: [
      '(+2)+(-6)=-4',
      '(+5)+(-3)=2',
      '(+1)+(-8)=-7',
    ],
    question: '(+4)+(-9)=',
    answer: '-5',
  },

  // 4: (+)+(-)，（）なし
  {
    samples: [
      '4-16=-12',
      '3-8=-5',
      '2-9=-7',
    ],
    question: '5-11=',
    answer: '-6',
  },

  // 5: (-)+(+)，（）あり
  {
    samples: [
      '(-15)+(+7)=-8',
      '(-4)+(+9)=5',
      '(-2)+(+6)=4',
    ],
    question: '(-6)+(+2)=',
    answer: '-4',
  },

  // 6: (-)+(+)，（）なし
  {
    samples: [
      '-3+8=5',
      '-5+9=4',
      '-7+3=-4',
    ],
    question: '-6+2=',
    answer: '-4',
  },

  // 7: (+)-(+)，（）あり
  {
    samples: [
      '(+2)-(+4)=-2',
      '(+3)-(+8)=-5',
      '(+1)-(+6)=-5',
    ],
    question: '(+5)-(+9)=',
    answer: '-4',
  },

  // 8: (+)-(+)，（）なし
  {
    samples: [
      '7-13=-6',
      '4-11=-7',
      '3-10=-7',
    ],
    question: '5-12=',
    answer: '-7',
  },

  // 9: (-)-(-)，（）あり
  {
    samples: [
      '(-8)-(-7)=-1',
      '(-3)-(-5)=2',
      '(-1)-(-4)=3',
    ],
    question: '(-6)-(-2)=',
    answer: '-4',
  },

  // 10: (-)-(-)，（）なし
  {
    samples: [
      '-6-(-9)=3',
      '-2-(-7)=5',
      '-4-(-1)=-3',
    ],
    question: '-3-(-8)=',
    answer: '5',
  },

  // 11: (+)-(-)，（）あり
  {
    samples: [
      '(+4)-(-4)=8',
      '(+3)-(-6)=9',
      '(+2)-(-3)=5',
    ],
    question: '(+5)-(-4)=',
    answer: '9',
  },

  // 12: (+)-(-)，（）なし
  {
    samples: [
      '3-(-8)=11',
      '5-(-2)=7',
      '1-(-6)=7',
    ],
    question: '4-(-3)=',
    answer: '7',
  },

  // 13: (-)-(+)，（）あり
  {
    samples: [
      '(-3)-(+5)=-8',
      '(-2)-(+4)=-6',
      '(-1)-(+7)=-8',
    ],
    question: '(-4)-(+3)=',
    answer: '-7',
  },

  // 14: 0-(-)，（）あり
  {
    samples: [
      '0-(-5)=5',
      '0-(-3)=3',
      '0-(-9)=9',
    ],
    question: '0-(-8)=',
    answer: '8',
  },

  // 15: 0-(+)，（）あり
  {
    samples: [
      '0-(+7)=-7',
      '0-(+4)=-4',
      '0-(+9)=-9',
    ],
    question: '0-(+6)=',
    answer: '-6',
  },

  // 16: 0-(+)，（）なし
  {
    samples: [
      '0-4=-4',
      '0-7=-7',
      '0-2=-2',
    ],
    question: '0-9=',
    answer: '-9',
  },

  // 17: (-)×(+)，（）あり
  {
    samples: [
      '(-3) \\times (+7)=-21',
      '(-4) \\times (+5)=-20',
      '(-2) \\times (+8)=-16',
    ],
    question: '(-6) \\times (+3)=',
    answer: '-18',
  },

  // 18: (-)×(+)，（）なし
  {
    samples: [
      '-2 \\times 9=-18',
      '-3 \\times 4=-12',
      '-5 \\times 6=-30',
    ],
    question: '-4 \\times 7=',
    answer: '-28',
  },

  // 19: (+)×(-)，（）あり
  {
    samples: [
      '(+3) \\times (-5)=-15',
      '(+4) \\times (-3)=-12',
      '(+2) \\times (-7)=-14',
    ],
    question: '(+6) \\times (-4)=',
    answer: '-24',
  },

  // 20: (+)×(-)，（）なし
  {
    samples: [
      '6 \\times (-4)=-24',
      '5 \\times (-3)=-15',
      '8 \\times (-2)=-16',
    ],
    question: '7 \\times (-3)=',
    answer: '-21',
  },

  // 21: (-)×(-)，（）あり
  {
    samples: [
      '(-5) \\times (-6)=30',
      '(-3) \\times (-4)=12',
      '(-2) \\times (-7)=14',
    ],
    question: '(-4) \\times (-8)=',
    answer: '32',
  },

  // 22: (-)×(-)，（）なし
  {
    samples: [
      '-8 \\times (-2)=16',
      '-3 \\times (-5)=15',
      '-4 \\times (-6)=24',
    ],
    question: '-7 \\times (-3)=',
    answer: '21',
  },

  // 23: (-)÷(-)，（）あり
  {
    samples: [
      '(-21) \\div (-7)=3',
      '(-18) \\div (-6)=3',
      '(-24) \\div (-8)=3',
    ],
    question: '(-15) \\div (-3)=',
    answer: '5',
  },

  // 24: (-)÷(-)，（）なし
  {
    samples: [
      '-15 \\div (-3)=5',
      '-12 \\div (-4)=3',
      '-20 \\div (-5)=4',
    ],
    question: '-18 \\div (-6)=',
    answer: '3',
  },

  // 25: (-)÷(+)，（）あり
  {
    samples: [
      '(-72) \\div (+9)=-8',
      '(-24) \\div (+4)=-6',
      '(-30) \\div (+5)=-6',
    ],
    question: '(-16) \\div (+8)=',
    answer: '-2',
  },

  // 26: (-)÷(+)，（）なし
  {
    samples: [
      '-16 \\div 8=-2',
      '-12 \\div 4=-3',
      '-20 \\div 5=-4',
    ],
    question: '-18 \\div 9=',
    answer: '-2',
  },

  // 27: (+)÷(-)，（）あり
  {
    samples: [
      '(+35) \\div (-5)=-7',
      '(+24) \\div (-6)=-4',
      '(+18) \\div (-3)=-6',
    ],
    question: '(+14) \\div (-2)=',
    answer: '-7',
  },

  // 28: (+)÷(-)，（）なし
  {
    samples: [
      '14 \\div (-2)=-7',
      '12 \\div (-4)=-3',
      '20 \\div (-5)=-4',
    ],
    question: '18 \\div (-3)=',
    answer: '-6',
  },

  // 29: 加減混合，（）あり
  {
    samples: [
      '3+(-2)+8+(-3)=6',
      '-1+5+(-4)+3=3',
      '2+(-5)+7+(-1)=3',
    ],
    question: '-2+(-3)+6+(-1)=',
    answer: '0',
  },

  // 30: 加減混合，（）なし
  {
    samples: [
      '-2+9-5+4=6',
      '-3+8-6+1=0',
      '-1+6-4+2=3',
    ],
    question: '-4+7-3+2=',
    answer: '2',
  },

  // 31: 加減混合，（）なし
  {
    samples: [
      '-5+9-8-12=-16',
      '-3+7-6-8=-10',
      '-4+8-9-6=-11',
    ],
    question: '-2+6-7-5=',
    answer: '-8',
  },

  // 32: 加減混合，（）あり（中かっこ）
  {
    samples: [
      '5-\\{8-(3-6)\\}=-6',
      '4-\\{6-(2-5)\\}=-5',
      '3-\\{7-(1-4)\\}=-7',
    ],
    question: '2-\\{5-(1-3)\\}=',
    answer: '-5',
  },

  // 33: 加減混合，（）あり（中かっこ複合）
  {
    samples: [
      '\\{(-3+2)-7\\}-(6-9)=-5',
      '\\{(-2+1)-5\\}-(4-7)=-3',
      '\\{(-1+3)-6\\}-(5-8)=-1',
    ],
    question: '\\{(-4+2)-3\\}-(7-9)=',
    answer: '-3',
  },

  // 34: 3数のかけ算
  {
    samples: [
      '(-2) \\times (-3) \\times 5=30',
      '(-1) \\times (-4) \\times 3=12',
      '(-2) \\times (-5) \\times 4=40',
    ],
    question: '(-3) \\times (-2) \\times 6=',
    answer: '36',
  },

  // 35: 3数のかけ算
  {
    samples: [
      '4 \\times (-1) \\times 2=-8',
      '3 \\times (-2) \\times 4=-24',
      '5 \\times (-1) \\times 6=-30',
    ],
    question: '6 \\times (-1) \\times 3=',
    answer: '-18',
  },

  // 36: 3数のかけ算
  {
    samples: [
      '(-5) \\times (-2) \\times (-4)=-40',
      '(-3) \\times (-2) \\times (-5)=-30',
      '(-4) \\times (-3) \\times (-2)=-24',
    ],
    question: '(-2) \\times (-3) \\times (-4)=',
    answer: '-24',
  },

  // 37: 3数の割り算
  {
    samples: [
      '36 \\div (-3) \\div (-2)=6',
      '24 \\div (-4) \\div (-2)=3',
      '40 \\div (-5) \\div (-2)=4',
    ],
    question: '30 \\div (-3) \\div (-2)=',
    answer: '5',
  },

  // 38: 3数の割り算
  {
    samples: [
      '24 \\div (-1) \\div 8=-3',
      '18 \\div (-1) \\div 6=-3',
      '20 \\div (-1) \\div 4=-5',
    ],
    question: '16 \\div (-1) \\div 4=',
    answer: '-4',
  },

  // 39: 3数の割り算
  {
    samples: [
      '(-72) \\div (-6) \\div (-2)=-6',
      '(-36) \\div (-4) \\div (-3)=-3',
      '(-40) \\div (-5) \\div (-2)=-4',
    ],
    question: '(-24) \\div (-4) \\div (-2)=',
    answer: '-3',
  },

  // 40: 乗除混合
  {
    samples: [
      '(-6) \\times (-4) \\div 8=3',
      '(-3) \\times (-6) \\div 9=2',
      '(-4) \\times (-5) \\div 10=2',
    ],
    question: '(-3) \\times (-8) \\div 6=',
    answer: '4',
  },

  // 41: 乗除混合
  {
    samples: [
      '(-3) \\div (-2) \\times 8=12',
      '(-4) \\div (-2) \\times 5=10',
      '(-6) \\div (-3) \\times 4=8',
    ],
    question: '(-5) \\div (-1) \\times 3=',
    answer: '15',
  },

  // 42: 四則混合
  {
    samples: [
      '2 \\times (-3+6)=6',
      '3 \\times (-2+5)=9',
      '4 \\times (-1+4)=12',
    ],
    question: '5 \\times (-2+6)=',
    answer: '20',
  },

  // 43: 四則混合
  {
    samples: [
      '(-4-2) \\times (-8)=48',
      '(-3-1) \\times (-6)=24',
      '(-5-1) \\times (-4)=24',
    ],
    question: '(-2-4) \\times (-5)=',
    answer: '30',
  },

  // 44: 四則混合
  {
    samples: [
      '-5-(-16) \\div 2=3',
      '-3-(-12) \\div 4=0',
      '-4-(-18) \\div 3=2',
    ],
    question: '-2-(-15) \\div 3=',
    answer: '3',
  },

  // 45: 四則混合
  {
    samples: [
      '9+(-36) \\div 6=3',
      '8+(-24) \\div 4=2',
      '7+(-21) \\div 3=0',
    ],
    question: '5+(-20) \\div 4=',
    answer: '0',
  },

  // 46: 四則混合
  {
    samples: [
      '-4-(-9) \\times 2=14',
      '-3-(-5) \\times 4=17',
      '-2-(-6) \\times 3=16',
    ],
    question: '-5-(-4) \\times 3=',
    answer: '7',
  },

  // 47: 四則混合
  {
    samples: [
      '-18 \\div (-6+3)=6',
      '-12 \\div (-4+2)=6',
      '-20 \\div (-6+2)=5',
    ],
    question: '-15 \\div (-7+2)=',
    answer: '3',
  },

  // 48: 四則混合
  {
    samples: [
      '3 \\times (-4)+(-5) \\times 2=-22',
      '2 \\times (-3)+(-4) \\times 3=-18',
      '4 \\times (-2)+(-3) \\times 3=-17',
    ],
    question: '5 \\times (-2)+(-4) \\times 2=',
    answer: '-18',
  },

  // 49: 四則混合
  {
    samples: [
      '(-7+31) \\div (-8)=-3',
      '(-4+28) \\div (-6)=-4',
      '(-2+14) \\div (-3)=-4',
    ],
    question: '(-3+21) \\div (-6)=',
    answer: '-3',
  },

  // 50: 四則混合
  {
    samples: [
      '28 \\div 4+63 \\div (-7)=-2',
      '24 \\div 6+30 \\div (-5)=-1',
      '36 \\div 4+20 \\div (-5)=-1',
    ],
    question: '18 \\div 3+24 \\div (-4)=',
    answer: '0',
  },

  // 51: 文字式
  {
    samples: [
      '-2a \\times 3=-6a',
      '-3b \\times 4=-12b',
      '-5c \\times 2=-10c',
    ],
    question: '-4x \\times 3=',
    answer: '-12x',
  },

  // 52: 文字式
  {
    samples: [
      '3x-8x=-5x',
      '5a-9a=-4a',
      '2y-7y=-5y',
    ],
    question: '4b-10b=',
    answer: '-6b',
  },

  // 53: 文字式
  {
    samples: [
      '4b \\times (-2)=-8b',
      '3x \\times (-5)=-15x',
      '6a \\times (-3)=-18a',
    ],
    question: '5y \\times (-4)=',
    answer: '-20y',
  },

  // 54: 文字式
  {
    samples: [
      '-2y-5y=-7y',
      '-3a-4a=-7a',
      '-4x-3x=-7x',
    ],
    question: '-5b-3b=',
    answer: '-8b',
  },

  // 55: 文字式
  {
    samples: [
      '(-16c) \\div 8=-2c',
      '(-12x) \\div 4=-3x',
      '(-20a) \\div 5=-4a',
    ],
    question: '(-18y) \\div 6=',
    answer: '-3y',
  },

  // 56: 文字式
  {
    samples: [
      '6y \\div (-2)=-3y',
      '8x \\div (-4)=-2x',
      '15a \\div (-3)=-5a',
    ],
    question: '12b \\div (-4)=',
    answer: '-3b',
  },
]

function normalize(s) {
  return s.replace(/\s/g, '').toLowerCase()
}

// 文字式問題かどうか判定（アルファベットキーを表示するか）
function isAlpha(problem) {
  return /[a-z]/.test(problem.answer)
}

export default function WarmUp2() {
  const navigate = useNavigate()
  const [idx, setIdx]         = useState(0)
  const [message, setMessage] = useState('')
  const [locked, setLocked]   = useState(false)
  const [score, setScore]     = useState({ correct: 0, total: 0 })
  const [tokens, setTokens]   = useState([])

  const problem = allProblems[idx]

  const handleKey = (val) => {
    if (locked) return
    setMessage('')
    setTokens(ts => {
      const last = ts[ts.length - 1]
      if (last && last.type === 'text') {
        return [...ts.slice(0, -1), { type: 'text', val: last.val + val }]
      }
      return [...ts, { type: 'text', val }]
    })
  }

  const handleDelete = () => {
    if (locked) return
    setMessage('')
    setTokens(ts => {
      if (ts.length === 0) return ts
      const last = ts[ts.length - 1]
      const newVal = last.val.slice(0, -1)
      if (newVal === '') return ts.slice(0, -1)
      return [...ts.slice(0, -1), { type: 'text', val: newVal }]
    })
  }

  const handleEnter = () => {
    if (locked) return
    if (tokens.length === 0) return
    const userAns = normalize(inputToAnswer(tokens))
    const correct = normalize(problem.answer)
    const isCorrect = userAns === correct
    setMessage(isCorrect ? '⭕' : '❌')
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    setLocked(true)
  }

  const handleNext = () => {
    setTokens([])
    setMessage('')
    setLocked(false)
    setIdx(i => (i + 1) % allProblems.length)
  }

  const displayKatex = inputToKatex(tokens)
  const isEmpty = tokens.length === 0

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <h1 style={{ textAlign: 'center', marginBottom: '4px' }}>🧩 Warm Up 2</h1>

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
        {score.total > 0
          ? `✅ ${score.correct} / ${score.total}　(${Math.round(score.correct / score.total * 100)}%)`
          : '　'}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '12px', minHeight: '24px' }}>
        <span style={{ color: '#556', fontSize: '12px' }}>
          {idx + 1} / {allProblems.length}
        </span>
      </div>

      {/* サンプルエリア */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #444',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '20px',
      }}>
        <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>📖</div>
        {problem.samples.map((s, i) => <BlockMath key={i} math={s} />)}
      </div>

      {/* 問題エリア */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        <div style={{ color: '#4db8ff', fontSize: '13px', marginBottom: '8px' }}>❓</div>
        <BlockMath math={`${problem.question}${isEmpty ? '?' : displayKatex}`} />
      </div>

      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 8px', minHeight: '60px' }}>
        {message}
      </h2>

      {locked && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {message === '❌' && (
            <p style={{ color: '#ff9999', fontSize: '16px', marginBottom: '8px' }}>
              → <strong style={{ color: 'white' }}>{problem.answer}</strong>
            </p>
          )}
          <button onClick={handleNext} style={{
            padding: '12px 32px', fontSize: '16px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>↩</button>
        </div>
      )}

      <CustomKeyboard
        onKey={handleKey}
        onDelete={handleDelete}
        onEnter={handleEnter}
        showAlpha={isAlpha(problem)}
      />

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/')} style={{
          padding: '12px 28px', fontSize: '16px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent',
          color: '#aaa', cursor: 'pointer',
        }}>← Home</button>
      </div>
    </div>
  )
}
