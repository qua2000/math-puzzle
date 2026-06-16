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
// 例: "x^2-3x" → "x^{2}-3x"  (^の後の数字・1文字変数を{}で囲む)
function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+|-?[a-zA-Z])/g, (_, exp) => `^{${exp}}`)
}

// ────────────────────────────────────────────────
// 問題データ
// answerType: 'poly' → 多項式の文字列入力
// answer: 正解文字列（normalize後比較）
// altAnswers: 別解の配列
// answerDisplay: 不正解時のKaTeX表示（省略時はanswerをtoKatex変換）
// ────────────────────────────────────────────────
const allProblems = [

  // ── Section A: 整数 × 多項式 ──────────────────

  // #1
  {
    answerType: 'poly',
    samples: ['3(4a+2b)=12a+6b', '4(2x+3y)=8x+12y', '5(3m-2n)=15m-10n'],
    prompt: '2(5x+4y)=',
    answer: '10x+8y',
  },
  // #2
  {
    answerType: 'poly',
    samples: ['2(x+y+z)=2x+2y+2z', '3(2a-b+4)=6a-3b+12', '4(x-2y+1)=4x-8y+4'],
    prompt: '3(2x-y+5)=',
    answer: '6x-3y+15',
  },
  // #3
  {
    answerType: 'poly',
    samples: ['6(2x+3y)=12x+18y', '5(4a-3b)=20a-15b', '7(2m+n)=14m+7n'],
    prompt: '4(3x-5y)=',
    answer: '12x-20y',
  },
  // #4
  {
    answerType: 'poly',
    samples: ['3(4a+2b)=12a+6b', '4(2x+3y)=8x+12y', '5(3m-2n)=15m-10n'],
    prompt: '6(3a-2b)=',
    answer: '18a-12b',
  },

  // ── Section B: 分数 × 多項式 ──────────────────

  // #5
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{2}(4x+6y)=2x+3y',
      '\\dfrac{2}{3}(21x-15y)=14x-10y',
      '\\dfrac{3}{4}(8a+4b)=6a+3b',
    ],
    prompt: '\\dfrac{1}{3}(9x-6y)=',
    answer: '3x-2y',
  },
  // #6
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{5}(10x+15y)=2x+3y',
      '\\dfrac{2}{5}(10a-5b)=4a-2b',
      '\\dfrac{3}{5}(10x+5y)=6x+3y',
    ],
    prompt: '\\dfrac{2}{3}(12x-9y)=',
    answer: '8x-6y',
  },
  // #7
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{2}(4x+2y-6)=2x+y-3',
      '\\dfrac{1}{3}(9a-6b+3)=3a-2b+1',
      '\\dfrac{3}{4}(8x-4y+12)=6x-3y+9',
    ],
    prompt: '\\dfrac{1}{4}(8x-12y+4)=',
    answer: '2x-3y+1',
  },
  // #8
  {
    answerType: 'poly',
    samples: [
      '\\dfrac{1}{2}(4x+6y)=2x+3y',
      '\\dfrac{2}{3}(21x-15y)=14x-10y',
      '\\dfrac{3}{4}(8a+4b)=6a+3b',
    ],
    prompt: '\\dfrac{3}{5}(15a-10b)=',
    answer: '9a-6b',
  },

  // ── Section C: 文字単項式 × 多項式 ──────────────

  // #9
  {
    answerType: 'poly',
    samples: ['a(b+c)=ab+ac', 'x(y-z)=xy-xz', 'm(2n+3)=2mn+3m'],
    prompt: 'x(y+3z)=',
    answer: 'xy+3xz',
    altAnswers: ['3xz+xy'],
  },
  // #10
  {
    answerType: 'poly',
    samples: [
      'x(2x-4)=2x^2-4x',
      'y(3y+2)=3y^2+2y',
      'a(5a-1)=5a^2-a',
    ],
    prompt: 'x(4x-3)=',
    answer: '4x^2-3x',
  },
  // #11
  {
    answerType: 'poly',
    samples: [
      '2a(3x-5a)=6ax-10a^2',
      '3x(2x+y)=6x^2+3xy',
      '4y(y-2z)=4y^2-8yz',
    ],
    prompt: '2x(3x+5y)=',
    answer: '6x^2+10xy',
    altAnswers: ['10xy+6x^2'],
  },
  // #12
  {
    answerType: 'poly',
    samples: [
      'x(2x-4)=2x^2-4x',
      '2a(3x-5a)=6ax-10a^2',
      '2x^2(3x+5y)=6x^3+10x^2y',
    ],
    prompt: '3x(2x-1)=',
    answer: '6x^2-3x',
  },

  // ── Section D: 負の単項式 × 多項式 ──────────────

  // #13
  {
    answerType: 'poly',
    samples: ['-2(3x-4)=-6x+8', '-3(2a+5)=-6a-15', '-5(x-2y)=-5x+10y'],
    prompt: '-4(2x-3)=',
    answer: '-8x+12',
  },
  // #14
  {
    answerType: 'poly',
    samples: [
      '-x(x-5)=-x^2+5x',
      '-y(y+3)=-y^2-3y',
      '-a(2a-1)=-2a^2+a',
    ],
    prompt: '-x(x+4)=',
    answer: '-x^2-4x',
  },
  // #15
  {
    answerType: 'poly',
    samples: [
      '-a(b-a)=-ab+a^2',
      '-2x(x+3)=-2x^2-6x',
      '-3y(2y-1)=-6y^2+3y',
    ],
    prompt: '-2x(3x-2)=',
    answer: '-6x^2+4x',
  },
  // #16
  {
    answerType: 'poly',
    samples: [
      '-x(x-5)=-x^2+5x',
      '-2(3x-4)=-6x+8',
      '-3x(2x+1)=-6x^2-3x',
    ],
    prompt: '-5x(x-3)=',
    answer: '-5x^2+15x',
  },

  // ── Section E: 多項式 ÷ 整数 ──────────────────

  // #17
  {
    answerType: 'poly',
    samples: [
      '(4x^2+12)\\div 2=2x^2+6',
      '(6a^2-9a)\\div 3=2a^2-3a',
      '(10x^2+15x)\\div 5=2x^2+3x',
    ],
    prompt: '(8x^2-12x)\\div 4=',
    answer: '2x^2-3x',
  },
  // #18
  {
    answerType: 'poly',
    samples: [
      '(3x^2-9x+12)\\div 3=x^2-3x+4',
      '(4a^2-8a+12)\\div 4=a^2-2a+3',
      '(6x^2+9x-3)\\div 3=2x^2+3x-1',
    ],
    prompt: '(6x^2-4x+10)\\div 2=',
    answer: '3x^2-2x+5',
  },
  // #19
  {
    answerType: 'poly',
    samples: [
      '(12x^2+8x)\\div 4=3x^2+2x',
      '(15a^2-10a)\\div 5=3a^2-2a',
      '(18y^2+12y-6)\\div 6=3y^2+2y-1',
    ],
    prompt: '(9x^2-6x+3)\\div 3=',
    answer: '3x^2-2x+1',
  },
  // #20
  {
    answerType: 'poly',
    samples: [
      '(4x^2+12)\\div 2=2x^2+6',
      '(3x^2-9x+12)\\div 3=x^2-3x+4',
      '(10x^2+15x-5)\\div 5=2x^2+3x-1',
    ],
    prompt: '(8x^2-4x+12)\\div 4=',
    answer: '2x^2-x+3',
  },

  // ── Section F: 多項式 ÷ 文字単項式 ──────────────

  // #21
  {
    answerType: 'poly',
    samples: [
      '(8x^2+6xy)\\div 2x=4x+3y',
      '(6a^2-4a)\\div 2a=3a-2',
      '(10x^2+4x)\\div 2x=5x+2',
    ],
    prompt: '(6x^2-9xy)\\div 3x=',
    answer: '2x-3y',
  },
  // #22
  {
    answerType: 'poly',
    samples: [
      '(5x^2+15xy-10x)\\div 5x=x+3y-2',
      '(6a^2-9ab+3a)\\div 3a=2a-3b+1',
      '(4x^2+8xy-12x)\\div 4x=x+2y-3',
    ],
    prompt: '(8x^2-4xy+12x)\\div 4x=',
    answer: '2x-y+3',
  },
  // #23
  {
    answerType: 'poly',
    samples: [
      '(12x^2+8xy)\\div 4x=3x+2y',
      '(15a^3-10a^2)\\div 5a=3a^2-2a',
      '(9y^2-6xy)\\div 3y=3y-2x',
    ],
    prompt: '(10x^2-15xy)\\div 5x=',
    answer: '2x-3y',
  },
  // #24
  {
    answerType: 'poly',
    samples: [
      '(8x^2+6xy)\\div 2x=4x+3y',
      '(5x^2+15xy-10x)\\div 5x=x+3y-2',
      '(9a^2-6ab)\\div 3a=3a-2b',
    ],
    prompt: '(4x^2+6xy-8x)\\div 2x=',
    answer: '2x+3y-4',
  },

  // ── Section G: (x+a)(x+b) 型・差の積 ──────────

  // #25
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(x+2)(x+5)&=x^2+(2+5)x+2\\cdot5\\\\&=x^2+7x+10\\end{aligned}',
      '\\begin{aligned}(x+1)(x+4)&=x^2+(1+4)x+1\\cdot4\\\\&=x^2+5x+4\\end{aligned}',
      '\\begin{aligned}(x+3)(x+2)&=x^2+(3+2)x+3\\cdot2\\\\&=x^2+5x+6\\end{aligned}',
    ],
    prompt: '(x+3)(x+5)=',
    answer: 'x^2+8x+15',
  },
  // #26
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(x+3)(x-1)&=x^2+(3-1)x+3\\cdot(-1)\\\\&=x^2+2x-3\\end{aligned}',
      '\\begin{aligned}(x-4)(x+3)&=x^2+(-4+3)x+(-4)\\cdot3\\\\&=x^2-x-12\\end{aligned}',
      '\\begin{aligned}(x+5)(x-2)&=x^2+(5-2)x+5\\cdot(-2)\\\\&=x^2+3x-10\\end{aligned}',
    ],
    prompt: '(x+4)(x-2)=',
    answer: 'x^2+2x-8',
  },
  // #27
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(x+3)(x-3)&=x^2-3^2\\\\&=x^2-9\\end{aligned}',
      '\\begin{aligned}(x+y)(x-y)&=x^2-y^2\\end{aligned}',
      '\\begin{aligned}(a+5)(a-5)&=a^2-5^2\\\\&=a^2-25\\end{aligned}',
    ],
    prompt: '(x+4)(x-4)=',
    answer: 'x^2-16',
  },
  // #28
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(x+2)(x+5)&=x^2+(2+5)x+2\\cdot5\\\\&=x^2+7x+10\\end{aligned}',
      '\\begin{aligned}(x+3)(x-1)&=x^2+(3-1)x+3\\cdot(-1)\\\\&=x^2+2x-3\\end{aligned}',
      '\\begin{aligned}(x+3)(x-3)&=x^2-3^2=x^2-9\\end{aligned}',
    ],
    prompt: '(x-2)(x+6)=',
    answer: 'x^2+4x-12',
  },

  // ── Section H: 完全平方式 ──────────────────────

  // #29
  {
    answerType: 'poly',
    samples: [
      '(x+5)^2=x^2+10x+25',
      '(x+2)^2=x^2+4x+4',
      '(a+3)^2=a^2+6a+9',
    ],
    prompt: '(x+6)^2=',
    answer: 'x^2+12x+36',
  },
  // #30
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(y-4)^2&=y^2-2\\cdot4\\cdot y+4^2\\\\&=y^2-8y+16\\end{aligned}',
      '\\begin{aligned}(x-3)^2&=x^2-2\\cdot3\\cdot x+3^2\\\\&=x^2-6x+9\\end{aligned}',
      '\\begin{aligned}(a-5)^2&=a^2-2\\cdot5\\cdot a+5^2\\\\&=a^2-10a+25\\end{aligned}',
    ],
    prompt: '(x-7)^2=',
    answer: 'x^2-14x+49',
  },
  // #31
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(2x+1)^2&=(2x)^2+2\\cdot1\\cdot2x+1^2\\\\&=4x^2+4x+1\\end{aligned}',
      '\\begin{aligned}(3x+2)^2&=(3x)^2+2\\cdot2\\cdot3x+2^2\\\\&=9x^2+12x+4\\end{aligned}',
      '\\begin{aligned}(2a-3)^2&=(2a)^2-2\\cdot3\\cdot2a+3^2\\\\&=4a^2-12a+9\\end{aligned}',
    ],
    prompt: '(2x+3)^2=',
    answer: '4x^2+12x+9',
  },
  // #32
  {
    answerType: 'poly',
    samples: [
      '\\begin{aligned}(x+5)^2&=x^2+2\\cdot5\\cdot x+5^2\\\\&=x^2+10x+25\\end{aligned}',
      '\\begin{aligned}(y-4)^2&=y^2-2\\cdot4\\cdot y+4^2\\\\&=y^2-8y+16\\end{aligned}',
      '\\begin{aligned}(2x+1)^2&=(2x)^2+2\\cdot1\\cdot2x+1^2\\\\&=4x^2+4x+1\\end{aligned}',
    ],
    prompt: '(x-3)^2=',
    answer: 'x^2-6x+9',
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
// ^ガイドバッジ（x^2 → x²のビジュアル説明）
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
      <span style={{ color: '#666', fontSize: '12px' }}>&nbsp;(^ = 指数)</span>
    </div>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^2+3x</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>
        x<sup style={{ fontSize: '11px' }}>2</sup>+3x
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
  // ^キーだけ強調スタイル
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
        {/* ^キーだけ色を変えて目立たせる */}
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
export default function Prep2() {
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

  // 不正解時の正解表示（answerDisplayがあればそれ、なければtoKatex変換）
  const answerKatex = problem.answerDisplay || toKatex(problem.answer)

  // リアルタイムプレビュー（入力中）
  const previewKatex = toKatex(polyStr)

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <h1 style={{ textAlign: 'center', marginBottom: '4px' }}>🧩 Prep 2</h1>

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

      {/* 入力エリア：テキストボックス＋KaTeXプレビューを並べて表示 */}
      {!locked && (
        <div style={{ marginBottom: '8px' }}>
          {/* ^ガイド */}
          <CaretGuide />

          <div style={{
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ color: '#4db8ff', fontSize: '18px' }}>=</span>

            {/* テキスト入力ボックス（入力確認用） */}
            <div style={{
              ...boxActive,
              fontFamily: 'monospace', fontSize: '16px', letterSpacing: '1px',
              minWidth: '120px',
            }}>
              {polyStr || '?'}
            </div>

            {/* KaTeXプレビュー（右側に変換後を表示） */}
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
