import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const InlineMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 文字列正規化（空白除去・小文字化）
function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

// 入力文字列をKaTeX表示用に変換　例: "9x^2-15x" → "9x^{2}-15x"
function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+)/g, (_, exp) => `^{${exp}}`)
}

// ── Prepバッジ ──────────────────────────────────────────
const PrepBadge = ({ num, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', fontSize: '13px', fontWeight: 'bold',
      borderRadius: '20px', border: '1.5px solid #f0a500',
      backgroundColor: 'rgba(240,165,0,0.15)', color: '#f0a500',
      cursor: 'pointer', verticalAlign: 'middle', marginLeft: '8px', lineHeight: 1.2,
    }}
  >
    📘 Prep{num}
  </button>
)

// ── 準備中ポップアップ ───────────────────────────────────
const PrepPopup = ({ num, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a1a2e', border: '2px solid #f0a500',
      borderRadius: '16px', padding: '32px 40px', textAlign: 'center', minWidth: '220px',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f0a500' }}>Prep {num}</div>
      <div style={{ fontSize: '28px', marginTop: '8px' }}>Coming Soon</div>
      <button onClick={onClose} style={{
        marginTop: '24px', padding: '10px 28px', fontSize: '16px',
        borderRadius: '10px', border: 'none', backgroundColor: '#f0a500',
        color: '#000', cursor: 'pointer', fontWeight: 'bold',
      }}>OK</button>
    </div>
  </div>
)

// ── ^ガイド ─────────────────────────────────────────────
const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^2</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>
        x<sup style={{ fontSize: '11px' }}>2</sup>
      </span>
    </div>
  </div>
)

// ── キーボード（x専用・シンプル版） ───────────────────────
const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }
  const btnStyle = (color) => ({
    padding: '12px 4px', minWidth: '46px', flex: 1, maxWidth: '60px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : color === 'caret' ? '#aaffaa55' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : color === 'caret' ? '#1a3a1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : color === 'caret' ? '#aaffaa' : 'white',
    fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'sans-serif',
  })
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btnStyle('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        <button style={btnStyle('num')} onClick={() => onKey('x')}>x</button>
        <button style={btnStyle('caret')} onClick={() => onKey('^')}>^</button>
        <button style={btnStyle('num')} onClick={() => onKey('+')}>+</button>
        <button style={btnStyle('num')} onClick={() => onKey('-')}>-</button>
      </div>
      <div style={rowStyle}>
        <button style={{ ...btnStyle('del'), flex: 1, maxWidth: '90px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btnStyle('enter'), flex: 2, maxWidth: '170px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

const boxStyle = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px',
  minWidth: '140px', padding: '4px 12px', textAlign: 'center',
  color: wrong ? '#ff9999' : '#4db8ff', fontWeight: 'bold', fontSize: '18px',
  fontFamily: 'monospace', letterSpacing: '1px',
})

// ── 項を文字列化するヘルパー ─────────────────────────────
// coef・指数 から "9x^2" や "-15x" や "7" のような文字列を作る
const termToStr = (coef, exp) => {
  if (exp === 0) return `${coef}`
  const xPart = exp === 1 ? 'x' : `x^${exp}`
  if (coef === 1)  return xPart
  if (coef === -1) return `-${xPart}`
  return `${coef}${xPart}`
}

// 2項を符号でつなげる
const joinTerms = (t1, t2) => (t2.startsWith('-') ? `${t1}${t2}` : `${t1}+${t2}`)

// ── 問題生成 ────────────────────────────────────────────
// D(x^n・(ax+b)) を「展開してから微分」で解く問題
const generateProblem = () => {
  const n = randomInt(2, 5)
  const a = randomInt(1, 5)
  const b = randomInt(1, 9) * (randomInt(0, 1) === 0 ? 1 : -1)

  const fStr = `x^{${n}}`
  const aPart = a === 1 ? 'x' : `${a}x`
  const gStr = b >= 0 ? `${aPart}+${b}` : `${aPart}${b}`

  // 微分後の答え: a(n+1)x^n + bn・x^{n-1}
  const coef1 = a * (n + 1)
  const coef2 = b * n

  const term1 = termToStr(coef1, n)
  const term2 = termToStr(coef2, n - 1)

  const correctAnswer = joinTerms(term1, term2)
  const altAnswer      = joinTerms(term2, term1)   // 順番を入れ替えたパターン（別解として許容）

  return {
    n, a, b, fStr, gStr,
    question: `D(${fStr} \\cdot (${gStr}))`,
    answer: correctAnswer,
    altAnswers: [altAnswer],
  }
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step5() {
  const navigate = useNavigate()
  const [problem, setProblem] = useState(generateProblem())
  const [polyStr, setPolyStr] = useState('')
  const [message, setMessage] = useState('')
  const [locked,  setLocked]  = useState(false)
  const [prepNum, setPrepNum] = useState(null)

  const handleKey = (val) => {
    if (locked) return
    if (message === '❌') setMessage('')   // 再入力スタートでメッセージを消す
    setPolyStr(s => s + val)
  }

  const handleDelete = () => {
    if (locked) return
    if (message === '❌') setMessage('')
    setPolyStr(s => s.slice(0, -1))
  }

  const handleEnter = () => {
    if (locked) return
    if (!polyStr) return
    const normUser = normalize(polyStr)
    const normAns  = normalize(problem.answer)
    const isCorrect = normUser === normAns
      || problem.altAnswers.some(alt => normUser === normalize(alt))

    if (isCorrect) {
      setMessage('⭕')
      setLocked(true)          // 正解の時だけロック→Nextボタンへ
    } else {
      setMessage('❌')          // 不正解はロックしない→そのまま再入力できる
    }
  }

  const nextProblem = () => {
    setProblem(generateProblem())
    setPolyStr('')
    setMessage('')
    setLocked(false)
  }

  const previewKatex = toKatex(polyStr)

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 5</h1>

      {/* 例示エリア */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #444',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
      }}>
        {/* 例1: x^2・(3x+1) */}
        <BlockMath math={String.raw`D(x^2 \cdot (3x+1)) = D(3x^3+x^2)`} />
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px', marginBottom: '6px' }}>
          <PrepBadge num={1} onClick={() => setPrepNum(1)} />
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
        </div>
        <BlockMath math={String.raw`\begin{aligned} &= D(3x^3)+D(x^2) \\ &= 9x^2+2x \end{aligned}`} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>

        <BlockMath math={String.raw`\,`} />

        {/* 例2: x^3・(2x-5) */}
        <BlockMath math={String.raw`D(x^3 \cdot (2x-5)) = D(2x^4-5x^3)`} />
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px', marginBottom: '6px' }}>
          <PrepBadge num={1} onClick={() => setPrepNum(1)} />
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
        </div>
        <BlockMath math={String.raw`\begin{aligned} &= D(2x^4)+D(-5x^3) \\ &= 8x^3-15x^2 \end{aligned}`} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>
      </div>

      {/* 問題エリア */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        <BlockMath math={`${problem.question}=\\,?`} />
      </div>

      {/* 入力エリア（正解するまで表示） */}
      {!locked && (
        <div style={{ marginBottom: '8px' }}>
          <CaretGuide />
          <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ color: '#4db8ff', fontSize: '18px' }}>=</span>
            <div style={boxStyle(message === '❌')}>
              {polyStr || '?'}
            </div>
            {polyStr && (
              <>
                <span style={{ color: '#888', fontSize: '14px' }}>→</span>
                <div style={{
                  background: '#1a2e1a', border: '1.5px solid #4dff88',
                  borderRadius: '6px', padding: '4px 12px',
                  color: '#88ff88', minWidth: '60px', textAlign: 'center',
                }}>
                  <InlineMath math={previewKatex} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 判定メッセージ */}
      <div style={{ textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {message && (
          <div>
            <span style={{ fontSize: '48px' }}>{message}</span>
            {message === '❌' && (
              <div style={{ fontSize: '32px', marginTop: '2px' }}>🔄</div>
            )}
          </div>
        )}
      </div>

      {/* 正解するまでキーボード／正解後はNextボタン */}
      {!locked ? (
        <NumKeyboard onKey={handleKey} onDelete={handleDelete} onEnter={handleEnter} />
      ) : (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={nextProblem} style={{
            padding: '14px 40px', fontSize: '20px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>
            Next
          </button>
        </div>
      )}

      {/* Homeボタン */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{
          padding: '12px 28px', fontSize: '16px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent',
          color: '#aaa', cursor: 'pointer',
        }}>← Home</button>
      </div>

      {/* Prepポップアップ */}
      {prepNum !== null && (
        <PrepPopup num={prepNum} onClose={() => setPrepNum(null)} />
      )}
    </div>
  )
}
