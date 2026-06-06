import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Coming Soon ポップアップ ─────────────────────────────
const ComingSoonPopup = ({ onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a1a2e', border: '2px solid #888',
      borderRadius: '16px', padding: '32px 40px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Coming Soon</div>
      <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>📘 WarmUp 2</div>
      <button onClick={onClose} style={{
        padding: '10px 28px', borderRadius: '8px', border: 'none',
        backgroundColor: '#1a6ef5', color: 'white', fontSize: '15px',
        cursor: 'pointer', fontWeight: 'bold',
      }}>OK</button>
    </div>
  </div>
)

// ── WarmUp2バッジ ────────────────────────────────────────
const WarmUp2Badge = ({ onClick }) => (
  <span onClick={onClick} style={{
    display: 'inline-block', marginLeft: '8px',
    padding: '2px 8px', borderRadius: '6px',
    background: '#2a2a4a', border: '1px solid #8888cc',
    color: '#aaaaff', fontSize: '11px', fontWeight: 'bold',
    cursor: 'pointer', verticalAlign: 'middle', userSelect: 'none',
  }}>
    📘 WarmUp2
  </span>
)

// ── 入力状態の型 ─────────────────────────────────────────
// mode: 'normal' | 'numerator' | 'denominator'
// tokens: 通常入力のトークン列
// frac: { num: string, den: string } | null

// ── 入力をKaTeX文字列に変換 ──────────────────────────────
function inputToKatex(tokens, fracState) {
  // tokensを文字列化
  const base = tokens.map(t => {
    if (t.type === 'frac') return `\\dfrac{${t.num}}{${t.den}}`
    return t.val
  }).join('')

  if (fracState) {
    // 分数入力中
    const numStr = fracState.num === '' ? '\\square' : fracState.num
    const denStr = fracState.phase === 'den'
      ? (fracState.den === '' ? '\\square' : fracState.den)
      : '\\square'
    const fracKatex = fracState.phase === 'num'
      ? `\\dfrac{${numStr}}{\\square}`
      : `\\dfrac{${numStr}}{${denStr}}`
    return base + fracKatex
  }

  // 通常モード：?表示
  return base === '' ? '?' : base
}

// ── 入力をanswer比較用文字列に変換 ──────────────────────
function inputToAnswer(tokens) {
  return tokens.map(t => {
    if (t.type === 'frac') return `(${t.num})/(${t.den})`
    return t.val
  }).join('').replace(/\s/g, '')
}

// ── カスタムキーボード ───────────────────────────────────
const KeyboardKey = ({ label, onClick, color, wide }) => {
  const colors = {
    num:   { bg: '#1a2a3e', border: '#4db8ff55', text: 'white' },
    alpha: { bg: '#1a2e1a', border: '#4dff8855', text: 'white' },
    sym:   { bg: '#2e1a2e', border: '#cc88ff55', text: 'white' },
    frac:  { bg: '#2a1a3e', border: '#dd88ff55', text: '#dd88ff' },
    del:   { bg: '#3a1a1a', border: '#ff666655', text: '#ff9999' },
    enter: { bg: '#1a4a1a', border: '#44ff8855', text: '#88ff88' },
  }
  const c = colors[color] || colors.num
  return (
    <button onClick={onClick} style={{
      padding: '11px 4px',
      minWidth: wide ? '80px' : '42px',
      flex: color === 'enter' ? 2 : 1,
      maxWidth: color === 'enter' ? '110px' : wide ? '100px' : '58px',
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

const CustomKeyboard = ({ onKey, onFrac, onSlash, onDelete, onEnter, supMode, setSupMode, fracMode }) => {
  const rowStyle = {
    display: 'flex', gap: '5px',
    justifyContent: 'center', marginBottom: '5px', flexWrap: 'wrap',
  }

  const handleKey = (val) => {
    if (supMode) { onKey('^' + val); setSupMode(false) }
    else onKey(val)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      {/* 数字行 */}
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <KeyboardKey key={n} label={n} color="num" onClick={() => handleKey(n)} />
        ))}
      </div>
      {/* アルファベット行 */}
      <div style={rowStyle}>
        {['x','y','z','a','b','c','d'].map(c => (
          <KeyboardKey key={c} label={c} color="alpha" onClick={() => handleKey(c)} />
        ))}
      </div>
      {/* 記号・指数・分数行 */}
      <div style={rowStyle}>
        {['+','-','(',')'].map(s => (
          <KeyboardKey key={s} label={s} color="sym" onClick={() => handleKey(s)} />
        ))}
        {/* 分数モード中の「/」（分母へ移行） */}
        {fracMode === 'num' && (
          <KeyboardKey label="→分母" color="frac" onClick={onSlash} />
        )}
        {/* 通常時の指数ボタン */}
        {!fracMode && (
          <button onClick={() => setSupMode(s => !s)} style={{
            padding: '11px 8px', minWidth: '52px', flex: 1, maxWidth: '66px',
            borderRadius: '8px',
            border: `1.5px solid ${supMode ? '#f0a500' : '#f0a50055'}`,
            background: supMode ? '#5a4500' : '#2e2a1a',
            color: supMode ? '#f0d080' : '#f0a500',
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'sans-serif',
          }}>
            x<sup style={{ fontSize: '9px' }}>□</sup>
          </button>
        )}
        {/* 分数ボタン（通常時のみ） */}
        {!fracMode && (
          <button onClick={onFrac} style={{
            padding: '11px 6px', minWidth: '52px', flex: 1, maxWidth: '66px',
            borderRadius: '8px',
            border: '1.5px solid #dd88ff55',
            background: '#2a1a3e',
            color: '#dd88ff',
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'sans-serif',
          }}>
            a<span style={{ fontSize: '10px' }}>/</span>b
          </button>
        )}
      </div>
      {/* 消去・Enter行 */}
      <div style={rowStyle}>
        <KeyboardKey label="⌫" color="del" onClick={onDelete} />
        <KeyboardKey label="✓" color="enter" onClick={onEnter} />
      </div>
      {supMode && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#f0a500', margin: '4px 0 0' }}>
          x<sup>□</sup> →
        </p>
      )}
      {fracMode === 'num' && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#dd88ff', margin: '4px 0 0' }}>
          分子を入力 → 「→分母」で分母へ
        </p>
      )}
      {fracMode === 'den' && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#dd88ff', margin: '4px 0 0' }}>
          分母を入力 → 「✓」または続けて入力
        </p>
      )}
    </div>
  )
}

// ── 問題データ ───────────────────────────────────────────
const allProblems = [
  {
    samples: ['a+a=2a', 'b+b+b=3b', 'c+c+c+c=4c'],
    question: 'd+d+d+d+d=',
    answer: '5d',
  },
  {
    samples: ['a+a-c=2a-c', 'b+b-c+b=3b-c', '-x+y+y=-x+2y'],
    question: 'a-c+a+a=',
    answer: '3a-c',
  },
  {
    samples: ['3 \\times a=3a', 'b \\times 5=5b', 'c \\times 2 \\times 4=8c'],
    question: '2 \\times d \\times 3=',
    answer: '6d',
  },
  {
    samples: ['4a \\times 5=20a', '3 \\times 2x=6x', '-8b \\times 7=-56b'],
    question: '9x \\times \\dfrac{7}{3}=',
    answer: '21x',
  },
  {
    samples: ['12x \\div 4=3x', '-30y \\div 5=-6y'],
    question: '20c \\div (-2)=',
    answer: '-10c',
    warmup2: true,
  },
  {
    samples: ['x \\times y=xy', '3 \\times y \\times z=3yz', 'x \\times 5 \\times z=5xz'],
    question: '2 \\times y \\times 5 \\times x=',
    answer: '10xy',
  },
  {
    samples: ['(-2) \\times b \\times c=-2bc', 'a \\times (-5) \\times b=-5ab'],
    question: 'b \\times c \\times (-4)=',
    answer: '-4bc',
    warmup2: true,
  },
  {
    samples: ['1 \\times a=a', 'a \\times (-1) \\times b=-ab'],
    question: 'b \\times c \\times (-1)=',
    answer: '-bc',
    warmup2: true,
  },
  {
    samples: ['x \\div 3=\\dfrac{x}{3}', 'y \\div x=\\dfrac{y}{x}'],
    question: '(-5) \\div c=',
    answer: '(-5)/(c)',
    warmup2: true,
  },
  {
    samples: [
      '(x+3) \\div 5=\\dfrac{x+3}{5}',
      '(y-2) \\div 3=\\dfrac{y-2}{3}',
      '(z-8) \\div y=\\dfrac{z-8}{y}',
    ],
    question: '(x-7) \\div z=',
    answer: '(x-7)/(z)',
  },
  {
    samples: ['3 \\times x \\times y=3xy', 'a \\times 5 \\times b=5ab'],
    question: 'a \\times x \\times 3=',
    answer: '3ax',
  },
  {
    samples: [
      'x \\times 3 \\div 5=\\dfrac{3x}{5}',
      'a \\div b \\times 2=\\dfrac{2a}{b}',
      'x \\div 3 \\div y=\\dfrac{x}{3y}',
    ],
    question: '3 \\times c \\div 2=',
    answer: '(3c)/(2)',
  },
  {
    samples: [
      'a \\times 2 + 3 \\times b=2a+3b',
      'x \\div 2 - y \\times 5=\\dfrac{x}{2}-5y',
      'c \\times 5 - a \\times 1=5c-a',
    ],
    question: 'd \\div 3 + b \\times 2=',
    answer: '(d)/(3)+2b',
  },
  {
    samples: [
      'a \\div 3 \\times b=\\dfrac{ab}{3}',
      'a \\times d \\div b \\div c=\\dfrac{ad}{bc}',
      'x \\div a \\div b \\div c=\\dfrac{x}{abc}',
    ],
    question: 'a \\div c \\div b=',
    answer: '(a)/(bc)',
  },
  {
    samples: ['2 \\times 2=2^2', '4 \\times 4 \\times 4=4^3', '5 \\times 5 \\times 1=5^2'],
    question: '7 \\times 7 \\times 7 \\times 7=',
    answer: '7^4',
  },
  {
    samples: ['a \\times a=a^2', 'b \\times b \\times b=b^3', 'c \\times c \\times c \\times c \\times c=c^5'],
    question: 'd \\times d \\times d \\times d=',
    answer: 'd^4',
  },
  {
    samples: ['2 \\times a \\times a=2a^2', 'b \\times b \\times 4 \\times b=4b^3', 'x \\times x \\times 5=5x^2'],
    question: 'y \\times 3 \\times y=',
    answer: '3y^2',
  },
  {
    samples: ['a \\times b \\times b=ab^2', 'd \\times d \\times a \\times a=a^2d^2', 'x \\times y \\times x \\times y=x^2y^2'],
    question: 'z \\times x \\times z \\times z=',
    answer: 'xz^3',
  },
  {
    samples: ['(-5) \\times y \\times y \\times y=-5y^3', 'a \\times (-4) \\times a=-4a^2'],
    question: 'c \\times c \\times (-3)=',
    answer: '-3c^2',
    warmup2: true,
  },
  {
    samples: [
      'x \\times y \\times x \\times y \\times y=x^2y^3',
      'a \\times b \\times a \\times c=a^2bc',
      'x \\times z \\times x \\times y \\times z=x^2yz^2',
    ],
    question: 'a \\times a \\times c \\times c \\times c \\times b=',
    answer: 'a^2bc^3',
  },
  {
    samples: ['a \\times a+3=a^2+3', 'y \\times y \\times y-5=y^3-5', '6-b \\times b \\times b=6-b^3'],
    question: 'x \\times x-4=',
    answer: 'x^2-4',
  },
  {
    samples: ['a+3a=4a', 'a+2a+5a=8a', 'x+4x+x+3x=9x'],
    question: 'a+2a+3a+4a=',
    answer: '10a',
  },
  {
    samples: ['8x+4x=12x', '5y-3y=2y', '3a-a=2a'],
    question: '4c+c-3c=',
    answer: '2c',
  },
  {
    samples: ['9a-3a=6a', '4x+5x-6x=3x', '3c-c+c-2c+c=2c'],
    question: '3y+17y-19y=',
    answer: 'y',
  },
  {
    samples: ['2x+7+4x=6x+7', '3a+4-7-2a=a-3'],
    question: '-6y+2-3y=',
    answer: '-9y+2',
    warmup2: true,
  },
  {
    samples: ['3x+y+2x+2y=5x+3y', '9c+7b-8c-7b=c', '7x-3z+8z-5x=2x+5z'],
    question: '5y+3x+8y-2x=',
    answer: 'x+13y',
  },
  {
    samples: ['2x+(4x+x)=7x', '(3a-a)+2a=4a', '(5y-2y)+(6y-y)=8y'],
    question: '(6c-c)-(3c+c)=',
    answer: 'c',
  },
  {
    samples: ['x=5,\\quad x+2=7', 'x=5,\\quad 24-x=19', 'x=5,\\quad 1+x-2=4'],
    question: 'x=5,\\quad 10-x+3=',
    answer: '8',
  },
  {
    samples: ['y=2,\\quad 2 \\times y=4', 'y=2,\\quad 10 \\div y=5', 'y=2,\\quad 1+2-y=1'],
    question: 'y=2,\\quad y \\times 3-2=',
    answer: '4',
  },
  {
    samples: ['x=3,\\quad 2x+1=7', 'x=3,\\quad 10-3x=1', 'x=3,\\quad (x+1) \\times 2=8'],
    question: 'x=3,\\quad 3x-6=',
    answer: '3',
  },
  {
    samples: ['a=3,\\quad 4a=12', 'a=3,\\quad 2a+3a=15', 'a=3,\\quad 10a-6a=12'],
    question: 'a=3,\\quad 7a+a=',
    answer: '24',
  },
  {
    samples: ['a=2 \\Rightarrow 4a=8', 'a=5 \\Rightarrow 4a=20', 'a=6 \\Rightarrow 7a=42'],
    question: 'a=9 \\Rightarrow 6a=',
    answer: '54',
  },
  {
    samples: ['a=2,b=3,\\quad a+b=5', 'a=2,b=3,\\quad b-a=1', 'a=2,b=3,\\quad 2a+b=7'],
    question: 'a=2,b=3,\\quad 4a-2b=',
    answer: '2',
  },
  {
    samples: ['x=4,y=5,\\quad x+y=9', 'x=4,y=5,\\quad xy=20', 'x=4,y=5,\\quad y-x=1'],
    question: 'x=4,y=5,\\quad xy-y=',
    answer: '15',
  },
  {
    samples: ['x+1=4 \\Rightarrow x=3', 'x-7=6 \\Rightarrow x=13', 'x-1=99 \\Rightarrow x=100'],
    question: 'x-15=80 \\Rightarrow x=',
    answer: '95',
  },
  {
    samples: ['2+x=5 \\Rightarrow x=3', '10+x=22 \\Rightarrow x=12', '16+x=16 \\Rightarrow x=0'],
    question: '15+x=25 \\Rightarrow x=',
    answer: '10',
  },
  {
    samples: ['7=x+2 \\Rightarrow x=5', '34=x-3 \\Rightarrow x=37', '111=x-9 \\Rightarrow x=120'],
    question: '51=x-4 \\Rightarrow x=',
    answer: '55',
  },
  {
    samples: ['12=3+x \\Rightarrow x=9', '27=5+x \\Rightarrow x=22', '21=19+x \\Rightarrow x=2'],
    question: '100=86+x \\Rightarrow x=',
    answer: '14',
  },
  {
    samples: ['2a=6 \\Rightarrow a=3', '30=3y \\Rightarrow y=10', '36=9z \\Rightarrow z=4'],
    question: '11c=99 \\Rightarrow c=',
    answer: '9',
  },
  {
    samples: ['3x=12 \\Rightarrow x=4', '2a=32 \\Rightarrow a=16', '32=5x \\Rightarrow x=\\dfrac{32}{5}'],
    question: '180=6z \\Rightarrow z=',
    answer: '30',
  },
  {
    samples: [
      '\\dfrac{x}{3}=5 \\Rightarrow x=15',
      '\\dfrac{z}{2}=3 \\Rightarrow z=6',
      '8=\\dfrac{b}{4} \\Rightarrow b=32',
    ],
    question: '\\dfrac{c}{3}=7 \\Rightarrow c=',
    answer: '21',
  },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalize(s) {
  return s.replace(/\s/g, '').toLowerCase()
}

// ── メインコンポーネント ─────────────────────────────────
export default function WarmUp1() {
  const navigate = useNavigate()
  const [queue, setQueue]         = useState(() => shuffle(allProblems))
  const [idx, setIdx]             = useState(0)
  const [message, setMessage]     = useState('')
  const [locked, setLocked]       = useState(false)
  const [score, setScore]         = useState({ correct: 0, total: 0 })
  const [showPopup, setShowPopup] = useState(false)
  const [supMode, setSupMode]     = useState(false)

  // 入力トークン列: { type:'text', val:string } | { type:'frac', num:string, den:string }
  const [tokens, setTokens]   = useState([])
  // 分数入力中の状態: null | { phase:'num'|'den', num:string, den:string }
  const [fracState, setFracState] = useState(null)

  const problem = queue[idx % queue.length]

  // ── キー入力 ────────────────────────────────────────────
  const handleKey = (val) => {
    if (locked) return
    setMessage('')
    if (fracState) {
      setFracState(fs => ({
        ...fs,
        [fs.phase === 'num' ? 'num' : 'den']: (fs.phase === 'num' ? fs.num : fs.den) + val,
      }))
    } else {
      setTokens(ts => {
        const last = ts[ts.length - 1]
        if (last && last.type === 'text') {
          return [...ts.slice(0, -1), { type: 'text', val: last.val + val }]
        }
        return [...ts, { type: 'text', val }]
      })
    }
  }

  // ── 分数ボタン ───────────────────────────────────────────
  const handleFrac = () => {
    if (locked) return
    setMessage('')
    setFracState({ phase: 'num', num: '', den: '' })
  }

  // ── →分母ボタン（分子→分母へ） ──────────────────────────
  const handleSlash = () => {
    if (!fracState || fracState.phase !== 'num') return
    setFracState(fs => ({ ...fs, phase: 'den' }))
  }

  // ── 削除 ─────────────────────────────────────────────────
  const handleDelete = () => {
    if (locked) return
    setMessage('')
    if (fracState) {
      if (fracState.phase === 'den') {
        if (fracState.den.length > 0) {
          setFracState(fs => ({ ...fs, den: fs.den.slice(0, -1) }))
        } else {
          // 分母が空なら分子モードに戻る
          setFracState(fs => ({ ...fs, phase: 'num' }))
        }
      } else {
        if (fracState.num.length > 0) {
          setFracState(fs => ({ ...fs, num: fs.num.slice(0, -1) }))
        } else {
          // 分子も空なら分数入力キャンセル
          setFracState(null)
        }
      }
      return
    }
    setTokens(ts => {
      if (ts.length === 0) return ts
      const last = ts[ts.length - 1]
      if (last.type === 'frac') return ts.slice(0, -1)
      if (last.type === 'text') {
        const newVal = last.val.length >= 2 && last.val[last.val.length - 2] === '^'
          ? last.val.slice(0, -2)
          : last.val.slice(0, -1)
        if (newVal === '') return ts.slice(0, -1)
        return [...ts.slice(0, -1), { type: 'text', val: newVal }]
      }
      return ts
    })
  }

  // ── Enter（答え合わせ） ─────────────────────────────────
  const handleEnter = () => {
    if (locked) return

    // 分数入力中なら確定してトークンに追加
    let finalTokens = tokens
    if (fracState && fracState.phase === 'den' && fracState.den !== '') {
      finalTokens = [...tokens, { type: 'frac', num: fracState.num, den: fracState.den }]
      setTokens(finalTokens)
      setFracState(null)
    } else if (fracState) {
      return // 分数未完成
    }

    if (finalTokens.length === 0) return

    // 答え文字列を生成して比較
    const userAns = normalize(inputToAnswer(finalTokens))
    const correct = normalize(problem.answer)
    const isCorrect = userAns === correct

    setMessage(isCorrect ? '⭕' : '❌')
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    setLocked(true)
  }

  // ── 次の問題 ─────────────────────────────────────────────
  const handleNext = () => {
    setTokens([])
    setFracState(null)
    setMessage('')
    setLocked(false)
    setSupMode(false)
    setIdx(i => {
      const next = i + 1
      if (next >= queue.length) {
        setQueue(shuffle(allProblems))
        return 0
      }
      return next
    })
  }

  // ── 表示用KaTeX ──────────────────────────────────────────
  const displayKatex = inputToKatex(tokens, fracState)
    .replace(/\^(\d)/g, '^{$1}')
  const isEmpty = tokens.length === 0 && !fracState

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {showPopup && <ComingSoonPopup onClose={() => setShowPopup(false)} />}

      <h1 style={{ textAlign: 'center', marginBottom: '4px' }}>🧩 Warm Up 1</h1>

      {/* スコア */}
      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
        {score.total > 0
          ? `✅ ${score.correct} / ${score.total}　(${Math.round(score.correct / score.total * 100)}%)`
          : '　'}
      </div>

      {/* カテゴリ行（WarmUp2バッジのみ、テキストなし） */}
      <div style={{ textAlign: 'center', marginBottom: '12px', minHeight: '24px' }}>
        {problem.warmup2 && <WarmUp2Badge onClick={() => setShowPopup(true)} />}
        <span style={{ color: '#556', fontSize: '12px', marginLeft: '8px' }}>
          {idx % allProblems.length + 1} / {allProblems.length}
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

      {/* メッセージ */}
      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 8px', minHeight: '60px' }}>
        {message}
      </h2>

      {/* 正解後 */}
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
        onFrac={handleFrac}
        onSlash={handleSlash}
        onDelete={handleDelete}
        onEnter={handleEnter}
        supMode={supMode}
        setSupMode={setSupMode}
        fracMode={fracState ? fracState.phase : null}
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
