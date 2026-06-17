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

// 文字列正規化（空白除去・小文字化）
function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

// 入力文字列をKaTeX表示用に変換
// 例: "x^2-3x" → "x^{2}-3x"
function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+|-?[a-zA-Z])/g, (_, exp) => `^{${exp}}`)
}

// ────────────────────────────────────────────────
// 問題データ
// answerType: 'poly' → 多項式の文字列入力
// answer: 正解文字列（normalize後比較）
// altAnswers: 別解の配列
// ────────────────────────────────────────────────
const allProblems = [

  // ── Section A: 2文字の同類項（基本） ─────────────

  // #1
  {
    answerType: 'poly',
    samples: [
      '2x+5y+3x-4y=5x+y',
      '4a+3b+2a-b=6a+2b',
      '6m+2n-m+3n=5m+5n',
    ],
    prompt: '3x+4y+2x-y=',
    answer: '5x+3y',
  },
  // #2
  {
    answerType: 'poly',
    samples: [
      '5p+2q-3p+4q=2p+6q',
      '7a+b-2a+3b=5a+4b',
      '4x+6y-x-2y=3x+4y',
    ],
    prompt: '8m+3n-5m+2n=',
    answer: '3m+5n',
  },
  // #3
  {
    answerType: 'poly',
    samples: [
      '2x+5y+3x-4y=5x+y',
      '5p+2q-3p+4q=2p+6q',
      '3a+7b-a-3b=2a+4b',
    ],
    prompt: '6x+5y-2x-3y=',
    answer: '4x+2y',
  },
  // #4（質問問題）
  {
    answerType: 'poly',
    samples: [
      '2x+5y+3x-4y=5x+y',
      '8m+3n-5m+2n=3m+5n',
      '6x+5y-2x-3y=4x+2y',
    ],
    prompt: '9a+2b-4a+5b=',
    answer: '5a+7b',
  },

  // ── Section B: 2文字＋負の係数 ───────────────────

  // #5
  {
    answerType: 'poly',
    samples: [
      '2x-4y-7x+2y=-5x-2y',
      '-3a+5b+a-2b=-2a+3b',
      '4m-n-6m+3n=-2m+2n',
    ],
    prompt: '3x-5y-8x+2y=',
    answer: '-5x-3y',
  },
  // #6
  {
    answerType: 'poly',
    samples: [
      '-4p+3q+6p-5q=2p-2q',
      '-x+7y+4x-3y=3x+4y',
      '2a-6b-5a+b=-3a-5b',
    ],
    prompt: '-2m+4n+7m-6n=',
    answer: '5m-2n',
  },
  // #7
  {
    answerType: 'poly',
    samples: [
      '2x-4y-7x+2y=-5x-2y',
      '-4p+3q+6p-5q=2p-2q',
      '-3a-b+5a-4b=2a-5b',
    ],
    prompt: '-6x+3y+9x-7y=',
    answer: '3x-4y',
  },
  // #8（質問問題）
  {
    answerType: 'poly',
    samples: [
      '3x-5y-8x+2y=-5x-3y',
      '-2m+4n+7m-6n=5m-2n',
      '-6x+3y+9x-7y=3x-4y',
    ],
    prompt: '-5a+2b+8a-9b=',
    answer: '3a-7b',
  },

  // ── Section C: 2文字＋定数項 ──────────────────────

  // #9
  {
    answerType: 'poly',
    samples: [
      '5x-y-8+x-3y+3=6x-4y-5',
      '3a+2b-1-a+4b+5=2a+6b+4',
      '4m-3n+6+2m+n-2=6m-2n+4',
    ],
    prompt: '2x+3y-4+5x-y+6=',
    answer: '7x+2y+2',
  },
  // #10
  {
    answerType: 'poly',
    samples: [
      '2p-5q+3-4p+2q-7=-2p-3q-4',
      '-x+4y+8+3x-2y-5=2x+2y+3',
      '6a-b-3-2a+5b+1=4a+4b-2',
    ],
    prompt: '3m+2n+5-m-4n-3=',
    answer: '2m-2n+2',
  },
  // #11
  {
    answerType: 'poly',
    samples: [
      '5x-y-8+x-3y+3=6x-4y-5',
      '3m+2n+5-m-4n-3=2m-2n+2',
      '-3p+q-2+5p-4q+7=2p-3q+5',
    ],
    prompt: '4a-2b+1-6a+3b-4=',
    answer: '-2a+b-3',
  },
  // #12（質問問題）
  {
    answerType: 'poly',
    samples: [
      '2x+3y-4+5x-y+6=7x+2y+2',
      '3m+2n+5-m-4n-3=2m-2n+2',
      '4a-2b+1-6a+3b-4=-2a+b-3',
    ],
    prompt: '-x+5y+3+4x-2y-7=',
    answer: '3x+3y-4',
  },

  // ── Section D: 係数1の省略を含む ─────────────────

  // #13
  {
    answerType: 'poly',
    samples: [
      'x+3x-2x=2x',
      'y-4y+2y=-y',
      'a+5a-3a=3a',
    ],
    prompt: 'm-3m+5m=',
    answer: '3m',
  },
  // #14
  {
    answerType: 'poly',
    samples: [
      'x+y-2x+3y=-x+4y',
      'a-b+3a-2b=4a-3b',
      '2m+n-m-3n=m-2n',
    ],
    prompt: 'p+2q-3p+q=',
    answer: '-2p+3q',
    altAnswers: ['3q-2p'],
  },
  // #15
  {
    answerType: 'poly',
    samples: [
      'x+y-2x+3y=-x+4y',
      'p+2q-3p+q=-2p+3q',
      '3a+b-a-2b=2a-b',
    ],
    prompt: '2x+y-x+3y=',
    answer: 'x+4y',
  },
  // #16（質問問題）
  {
    answerType: 'poly',
    samples: [
      'm-3m+5m=3m',
      'p+2q-3p+q=-2p+3q',
      '2x+y-x+3y=x+4y',
    ],
    prompt: 'a-2b+3a+b=',
    answer: '4a-b',
  },

  // ── Section E: 2次式＋1次式＋定数項 ──────────────

  // #17
  {
    answerType: 'poly',
    samples: [
      '5a^2-7a+6-3a^2+8a-3=2a^2+a+3',
      '3x^2+4x-2-x^2-2x+5=2x^2+2x+3',
      '4m^2-m+7-2m^2+3m-4=2m^2+2m+3',
    ],
    prompt: '6x^2-3x+1-2x^2+x-4=',
    answer: '4x^2-2x-3',
  },
  // #18
  {
    answerType: 'poly',
    samples: [
      '-2a^2+5a-3+4a^2-a+6=2a^2+4a+3',
      '-x^2+3x+1+5x^2-7x-2=4x^2-4x-1',
      '3y^2-2y+4-y^2+5y-9=2y^2+3y-5',
    ],
    prompt: '-3m^2+4m+2+7m^2-m-5=',
    answer: '4m^2+3m-3',
  },
  // #19
  {
    answerType: 'poly',
    samples: [
      '5a^2-7a+6-3a^2+8a-3=2a^2+a+3',
      '6x^2-3x+1-2x^2+x-4=4x^2-2x-3',
      '-3m^2+4m+2+7m^2-m-5=4m^2+3m-3',
    ],
    prompt: '2x^2+5x-1-5x^2-2x+4=',
    answer: '-3x^2+3x+3',
  },
  // #20（質問問題）
  {
    answerType: 'poly',
    samples: [
      '5a^2-7a+6-3a^2+8a-3=2a^2+a+3',
      '6x^2-3x+1-2x^2+x-4=4x^2-2x-3',
      '2x^2+5x-1-5x^2-2x+4=-3x^2+3x+3',
    ],
    prompt: '4a^2-a+3-a^2+3a-5=',
    answer: '3a^2+2a-2',
  },

  // ── Section F: 3文字混在 ──────────────────────────

  // #21
  {
    answerType: 'poly',
    samples: [
      '3x+2y-z+x-5y+4z=4x-3y+3z',
      '2a-b+3c+a+4b-c=3a+3b+2c',
      '5p-2q+r-3p+q-4r=2p-q-3r',
    ],
    prompt: '4x-3y+2z+x+y-5z=',
    answer: '5x-2y-3z',
  },
  // #22
  {
    answerType: 'poly',
    samples: [
      '-a+3b-2c+4a-b+5c=3a+2b+3c',
      '2x-y+4z-5x+3y-z=-3x+2y+3z',
      '-3m+n-2k+m+4n+5k=-2m+5n+3k',
    ],
    prompt: '-2p+5q-r+3p-2q+4r=',
    answer: 'p+3q+3r',
  },
  // #23
  {
    answerType: 'poly',
    samples: [
      '3x+2y-z+x-5y+4z=4x-3y+3z',
      '-2p+5q-r+3p-2q+4r=p+3q+3r',
      '4a+b-3c-a+2b+c=3a+3b-2c',
    ],
    prompt: '2x-4y+3z-x+2y-z=',
    answer: 'x-2y+2z',
  },
  // #24（質問問題）
  {
    answerType: 'poly',
    samples: [
      '4x-3y+2z+x+y-5z=5x-2y-3z',
      '-2p+5q-r+3p-2q+4r=p+3q+3r',
      '2x-4y+3z-x+2y-z=x-2y+2z',
    ],
    prompt: '5a-2b+c-3a+b-4c=',
    answer: '2a-b-3c',
  },

  // ── Section G: 分数係数 ───────────────────────────

  // #25
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{2}x+\\dfrac{3}{2}x=2x',
      '\\dfrac{2}{3}a+\\dfrac{1}{3}a=a',
      '\\dfrac{3}{4}m+\\dfrac{1}{4}m=m',
    ],
    prompt: '\\dfrac{1}{3}x+\\dfrac{2}{3}x=',
    answer: 'x',
  },
  // #26
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{2}x+\\dfrac{1}{2}y+\\dfrac{3}{2}x-\\dfrac{3}{2}y=2x-y',
      '\\dfrac{2}{3}a-\\dfrac{1}{3}b+\\dfrac{1}{3}a+\\dfrac{4}{3}b=a+b',
      '\\dfrac{3}{4}p+\\dfrac{1}{4}q-\\dfrac{1}{4}p+\\dfrac{3}{4}q=\\dfrac{1}{2}p+q',
    ],
    prompt: '\\dfrac{1}{2}x+\\dfrac{3}{4}y+\\dfrac{1}{2}x-\\dfrac{1}{4}y=',
    answer: 'x+\\dfrac{1}{2}y',
    answerDisplay: 'x+\\dfrac{1}{2}y',
  },
  // #27
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{3}x+\\dfrac{2}{3}x=x',
      '\\dfrac{1}{2}x+\\dfrac{1}{2}y+\\dfrac{3}{2}x-\\dfrac{3}{2}y=2x-y',
      '\\dfrac{2}{5}a+\\dfrac{3}{5}a-\\dfrac{1}{5}b+\\dfrac{4}{5}b=a+\\dfrac{3}{5}b',
    ],
    prompt: '\\dfrac{1}{4}m+\\dfrac{3}{4}m+\\dfrac{1}{2}n-\\dfrac{3}{2}n=',
    answer: 'm-n',
  },
  // #28（質問問題）
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{3}x+\\dfrac{2}{3}x=x',
      '\\dfrac{1}{2}x+\\dfrac{3}{4}y+\\dfrac{1}{2}x-\\dfrac{1}{4}y=x+\\dfrac{1}{2}y',
      '\\dfrac{1}{4}m+\\dfrac{3}{4}m+\\dfrac{1}{2}n-\\dfrac{3}{2}n=m-n',
    ],
    prompt: '\\dfrac{2}{3}a+\\dfrac{1}{3}b+\\dfrac{1}{3}a-\\dfrac{4}{3}b=',
    answer: 'a-b',
  },

  // ── Section H: 2変数の積（xy²など）────────────────

  // #29
  {
    answerType: 'poly',
    samples: [
      '-xy^2+9-5xy+6xy^2+7xy-5=5xy^2+2xy+4',
      '3ab^2-2ab-ab^2+5ab=2ab^2+3ab',
      '-2x^2y+xy+4x^2y-3xy=2x^2y-2xy',
    ],
    prompt: '4a^2b-3ab+2a^2b-ab=',
    answer: '6a^2b-4ab',
    altAnswers: ['-4ab+6a^2b'],
  },
  // #30
  {
    answerType: 'poly',
    samples: [
      '5x^2y-3xy^2+2x^2y-xy^2=7x^2y-4xy^2',
      '-2ab^2+3a^2b+5ab^2-a^2b=3ab^2+2a^2b',
      '4xy^2-x^2y-2xy^2+3x^2y=2xy^2+2x^2y',
    ],
    prompt: '3xy^2-2x^2y+xy^2+5x^2y=',
    answer: '4xy^2+3x^2y',
    altAnswers: ['3x^2y+4xy^2'],
  },
  // #31
  {
    answerType: 'poly',
    samples: [
      '-xy^2+9-5xy+6xy^2+7xy-5=5xy^2+2xy+4',
      '4a^2b-3ab+2a^2b-ab=6a^2b-4ab',
      '3xy^2-2x^2y+xy^2+5x^2y=4xy^2+3x^2y',
    ],
    prompt: '-2a^2b+5ab^2+4a^2b-3ab^2=',
    answer: '2a^2b+2ab^2',
    altAnswers: ['2ab^2+2a^2b'],
  },
  // #32（質問問題）
  {
    answerType: 'poly',
    samples: [
      '-xy^2+9-5xy+6xy^2+7xy-5=5xy^2+2xy+4',
      '4a^2b-3ab+2a^2b-ab=6a^2b-4ab',
      '-2a^2b+5ab^2+4a^2b-3ab^2=2a^2b+2ab^2',
    ],
    prompt: '7x^2y-4xy^2-3x^2y+6xy^2=',
    answer: '4x^2y+2xy^2',
    altAnswers: ['2xy^2+4x^2y'],
  },
]

// ────────────────────────────────────────────────
// 入力ボックス共通スタイル
// ────────────────────────────────────────────────
const boxActive = {
  background: '#163a5e', border: '2px solid #4db8ff', borderRadius: '6px',
  minWidth: '140px', padding: '4px 12px', textAlign: 'center',
  color: '#4db8ff', fontWeight: 'bold', fontSize: '18px',
  cursor: 'pointer', lineHeight: '1.6',
}

// ────────────────────────────────────────────────
// ^ガイドバッジ
// ────────────────────────────────────────────────
const CaretGuide = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginBottom: '8px', flexWrap: 'wrap',
  }}>
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
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^2y</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>
        x<sup style={{ fontSize: '11px' }}>2</sup>y
      </span>
    </div>
  </div>
)

// ────────────────────────────────────────────────
// キーボード
// ────────────────────────────────────────────────
const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '5px', justifyContent: 'center', marginBottom: '5px' }
  const btnStyle = (color) => ({
    padding: '11px 4px', minWidth: '42px', flex: 1,
    maxWidth: color === 'enter' ? '110px' : '58px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'sans-serif',
  })
  const smBtnStyle = (color) => ({
    ...btnStyle(color),
    padding: '8px 2px', minWidth: '28px', maxWidth: '42px', fontSize: '13px',
  })
  const caretBtnStyle = {
    ...smBtnStyle('num'),
    background: '#1a3a1a',
    border: '1.5px solid #aaffaa55',
    color: '#aaffaa',
  }
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btnStyle('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        {['a','b','c','d','e','f','g','h','i','j'].map(c => (
          <button key={c} style={smBtnStyle('num')} onClick={() => onKey(c)}>{c}</button>
        ))}
      </div>
      <div style={rowStyle}>
        {['k','l','m','n','o','p','q','r','s','t'].map(c => (
          <button key={c} style={smBtnStyle('num')} onClick={() => onKey(c)}>{c}</button>
        ))}
      </div>
      <div style={rowStyle}>
        {['u','v','w','x','y','z','-','+'].map(c => (
          <button key={c} style={smBtnStyle('num')} onClick={() => onKey(c)}>{c}</button>
        ))}
        <button style={caretBtnStyle} onClick={() => onKey('^')}>^</button>
      </div>
      <div style={rowStyle}>
        <button style={{ ...btnStyle('del'), flex: 1, maxWidth: '80px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btnStyle('enter'), flex: 2, maxWidth: '160px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────
export default function Prep3() {
  const navigate = useNavigate()
  const [idx,     setIdx]     = useState(0)
  const [message, setMessage] = useState('')
  const [locked,  setLocked]  = useState(false)
  const [score,   setScore]   = useState({ correct: 0, total: 0 })
  const [polyStr, setPolyStr] = useState('')

  const problem = allProblems[idx]

  const resetInput = () => setPolyStr('')

  const handleKey = (val) => {
    if (locked) return
    setPolyStr(s => s + val)
  }

  const handleDelete = () => {
    if (locked) return
    setPolyStr(s => s.slice(0, -1))
  }

  const handleEnter = () => {
    if (locked) return
    if (!polyStr) return
    const normUser = normalize(polyStr)
    const normAns  = normalize(problem.answer)
    const isCorrect = normUser === normAns
      || (problem.altAnswers || []).some(alt => normUser === normalize(alt))
    setMessage(isCorrect ? '⭕' : '❌')
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }))
    setLocked(true)
  }

  const handleNext = () => {
    setIdx(i => (i + 1) % allProblems.length)
    setLocked(false)
    setMessage('')
    resetInput()
  }

  const answerKatex = problem.answerDisplay || toKatex(problem.answer)
  const previewKatex = toKatex(polyStr)

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <h1 style={{ textAlign: 'center', marginBottom: '4px' }}>🧩 Prep 3</h1>

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
        {score.total > 0
          ? `✅ ${score.correct} / ${score.total}　(${Math.round(score.correct / score.total * 100)}%)`
          : '　'}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ color: '#556', fontSize: '12px' }}>{idx + 1} / {allProblems.length}</span>
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
        borderRadius: '12px', padding: '16px 24px', marginBottom: '12px',
      }}>
        <div style={{ color: '#4db8ff', fontSize: '13px', marginBottom: '8px' }}>❓</div>
        <BlockMath math={`${problem.prompt}\\,?`} />
      </div>

      {/* 入力エリア */}
      {!locked && (
        <div style={{ marginBottom: '8px' }}>
          <CaretGuide />

          <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ color: '#4db8ff', fontSize: '18px' }}>=</span>

            <div style={{
              ...boxActive,
              fontFamily: 'monospace', fontSize: '16px', letterSpacing: '1px',
              minWidth: '120px',
            }}>
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
            <span style={{ fontSize: '48px' }}>{message === '⭕' ? '⭕' : '❌'}</span>
            {message === '❌' && (
              <p style={{ color: '#ff9999', fontSize: '16px', margin: '4px 0 0' }}>
                → <strong style={{ color: 'white' }}><InlineMath math={answerKatex} /></strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 次へボタン */}
      {locked && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <button onClick={handleNext} style={{
            padding: '12px 40px', fontSize: '20px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5',
            color: 'white', cursor: 'pointer', fontWeight: 'bold',
          }}>↩</button>
        </div>
      )}

      {/* キーボード */}
      {!locked && (
        <NumKeyboard onKey={handleKey} onDelete={handleDelete} onEnter={handleEnter} />
      )}

      <div style={{ marginTop: '24px' }}>
        <button onClick={() => navigate('/')} style={{
          padding: '12px 28px', fontSize: '16px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent',
          color: '#aaa', cursor: 'pointer',
        }}>← Home</button>
      </div>

    </div>
  )
}
