import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }

function normalize(s) { return s.replace(/\s/g, '').toLowerCase() }

// 分数文字列を約分して正規化 "6/4" -> "3/2", "4/1" -> "4"
function reduceFrac(str) {
  if (!str.includes('/')) return str
  const [n, d] = str.split('/').map(Number)
  if (isNaN(n) || isNaN(d) || d === 0) return str
  const g = gcd(Math.abs(n), Math.abs(d))
  const rn = n / g, rd = d / g
  return rd === 1 ? `${rn}` : `${rn}/${rd}`
}

// ────────────────────────────────────────────────
// 問題データ
// type: 'simple'    → 答えを1つ入力
// type: 'twoStep'   → ステップ1(通分/逆数) → ステップ2(最終答え)
// type: 'paren'     → 問題全体表示 → ステップ1(()内) → ステップ2(全体)
//
// fullPrompt: 問題全体のKaTeX（paren型で最初に表示）
// step1prompt: ステップ1の式
// step2prompt: ステップ2の式
// step1answer / step2answer / answer: 正規化済み答え文字列
// ────────────────────────────────────────────────
const allProblems = [

  // 1-1: 同分母 足し算
  {
    type: 'simple',
    samples: [
      '\\dfrac{1}{5}+\\dfrac{2}{5}=\\dfrac{3}{5}',
      '\\dfrac{3}{7}+\\dfrac{1}{7}=\\dfrac{4}{7}',
      '\\dfrac{2}{9}+\\dfrac{4}{9}=\\dfrac{6}{9}=\\dfrac{2}{3}',
    ],
    prompt: '\\dfrac{3}{7}+\\dfrac{2}{7}=',
    answer: '5/7',
  },

  // 1-2: 同分母 引き算
  {
    type: 'simple',
    samples: [
      '\\dfrac{7}{8}-\\dfrac{4}{8}=\\dfrac{3}{8}',
      '\\dfrac{5}{6}-\\dfrac{1}{6}=\\dfrac{4}{6}=\\dfrac{2}{3}',
      '\\dfrac{9}{10}-\\dfrac{3}{10}=\\dfrac{6}{10}=\\dfrac{3}{5}',
    ],
    prompt: '\\dfrac{7}{9}-\\dfrac{4}{9}=',
    answer: '1/3',
  },

  // 1-3: 同分母 足し算・引き算
  {
    type: 'simple',
    samples: [
      '\\dfrac{4}{7}+\\dfrac{6}{7}-\\dfrac{5}{7}=\\dfrac{5}{7}',
      '\\dfrac{3}{8}+\\dfrac{5}{8}-\\dfrac{2}{8}=\\dfrac{6}{8}=\\dfrac{3}{4}',
      '\\dfrac{1}{5}+\\dfrac{4}{5}-\\dfrac{2}{5}=\\dfrac{3}{5}',
    ],
    prompt: '\\dfrac{2}{9}+\\dfrac{5}{9}-\\dfrac{4}{9}=',
    answer: '1/3',
  },

  // 1-4: 同分母 ()付き  ← paren型
  {
    type: 'paren',
    samples: [
      '\\dfrac{7}{6}-\\left(\\dfrac{3}{6}+\\dfrac{1}{6}\\right)=\\dfrac{3}{6}=\\dfrac{1}{2}',
      '\\dfrac{9}{8}-\\left(\\dfrac{2}{8}+\\dfrac{3}{8}\\right)=\\dfrac{4}{8}=\\dfrac{1}{2}',
      '\\dfrac{8}{6}-\\left(\\dfrac{1}{6}+\\dfrac{3}{6}\\right)=\\dfrac{4}{6}=\\dfrac{2}{3}',
    ],
    fullPrompt: '\\dfrac{10}{9}-\\left(\\dfrac{2}{9}+\\dfrac{5}{9}\\right)=',
    step1prompt: '\\dfrac{2}{9}+\\dfrac{5}{9}=',
    step1answer: '7/9',
    step2prompt: '\\dfrac{10}{9}-\\dfrac{7}{9}=',
    step2answer: '1/3',
  },

  // 2-1: 異分母 足し算（simple: 通分後の式を見せて答え入力）
  {
    type: 'simple',
    samples: [
      '\\dfrac{1}{4}+\\dfrac{2}{5}=\\dfrac{5}{20}+\\dfrac{8}{20}=\\dfrac{13}{20}',
      '\\dfrac{1}{3}+\\dfrac{1}{4}=\\dfrac{4}{12}+\\dfrac{3}{12}=\\dfrac{7}{12}',
      '\\dfrac{1}{2}+\\dfrac{1}{3}=\\dfrac{3}{6}+\\dfrac{2}{6}=\\dfrac{5}{6}',
    ],
    prompt: '\\dfrac{5}{15}+\\dfrac{3}{15}=',
    answer: '8/15',
  },

  // 2-2: 異分母 引き算（simple: 通分後の式を見せて答え入力）
  {
    type: 'simple',
    samples: [
      '\\dfrac{7}{8}-\\dfrac{3}{4}=\\dfrac{7}{8}-\\dfrac{6}{8}=\\dfrac{1}{8}',
      '\\dfrac{5}{6}-\\dfrac{1}{4}=\\dfrac{10}{12}-\\dfrac{3}{12}=\\dfrac{7}{12}',
      '\\dfrac{3}{4}-\\dfrac{2}{3}=\\dfrac{9}{12}-\\dfrac{8}{12}=\\dfrac{1}{12}',
    ],
    prompt: '\\dfrac{8}{12}-\\dfrac{3}{12}=',
    answer: '5/12',
  },

  // 2-3: 異分母 足し算・引き算（simple: 通分後の式を見せて答え入力）
  {
    type: 'simple',
    samples: [
      '\\dfrac{1}{4}+\\dfrac{2}{3}-\\dfrac{5}{6}=\\dfrac{3}{12}+\\dfrac{8}{12}-\\dfrac{10}{12}=\\dfrac{1}{12}',
      '\\dfrac{1}{2}+\\dfrac{1}{3}-\\dfrac{3}{4}=\\dfrac{6}{12}+\\dfrac{4}{12}-\\dfrac{9}{12}=\\dfrac{1}{12}',
      '\\dfrac{1}{3}+\\dfrac{1}{2}-\\dfrac{2}{3}=\\dfrac{2}{6}+\\dfrac{3}{6}-\\dfrac{4}{6}=\\dfrac{1}{6}',
    ],
    prompt: '\\dfrac{4}{12}+\\dfrac{3}{12}-\\dfrac{2}{12}=',
    answer: '5/12',
  },

  // 2-4: 異分母 ()付き（paren型）
  {
    type: 'paren',
    samples: [
      '\\dfrac{1}{2}-\\left(\\dfrac{1}{4}-\\dfrac{1}{5}\\right)=\\dfrac{1}{2}-\\dfrac{1}{20}=\\dfrac{9}{20}',
      '\\dfrac{3}{4}-\\left(\\dfrac{1}{3}-\\dfrac{1}{6}\\right)=\\dfrac{3}{4}-\\dfrac{1}{6}=\\dfrac{7}{12}',
      '\\dfrac{2}{3}-\\left(\\dfrac{1}{2}-\\dfrac{1}{4}\\right)=\\dfrac{2}{3}-\\dfrac{1}{4}=\\dfrac{5}{12}',
    ],
    fullPrompt: '\\dfrac{5}{6}-\\left(\\dfrac{1}{4}-\\dfrac{1}{6}\\right)=',
    step1prompt: '\\dfrac{1}{4}-\\dfrac{1}{6}=',
    step1answer: '1/12',
    step2prompt: '\\dfrac{5}{6}-\\dfrac{1}{12}=',
    step2answer: '3/4',
  },

  // 3-1: 分数×分数
  {
    type: 'simple',
    samples: [
      '\\dfrac{5}{6}\\times\\dfrac{3}{4}=\\dfrac{15}{24}=\\dfrac{5}{8}',
      '\\dfrac{2}{3}\\times\\dfrac{3}{5}=\\dfrac{6}{15}=\\dfrac{2}{5}',
      '\\dfrac{3}{4}\\times\\dfrac{2}{9}=\\dfrac{6}{36}=\\dfrac{1}{6}',
    ],
    prompt: '\\dfrac{3}{8}\\times\\dfrac{4}{9}=',
    answer: '1/6',
  },

  // 3-2: 分数3つのかけ算
  {
    type: 'simple',
    samples: [
      '\\dfrac{1}{4}\\times\\dfrac{3}{5}\\times\\dfrac{10}{7}=\\dfrac{30}{140}=\\dfrac{3}{14}',
      '\\dfrac{2}{3}\\times\\dfrac{3}{4}\\times\\dfrac{2}{5}=\\dfrac{12}{60}=\\dfrac{1}{5}',
      '\\dfrac{1}{2}\\times\\dfrac{4}{5}\\times\\dfrac{5}{6}=\\dfrac{20}{60}=\\dfrac{1}{3}',
    ],
    prompt: '\\dfrac{1}{3}\\times\\dfrac{3}{4}\\times\\dfrac{8}{5}=',
    answer: '2/5',
  },

  // 3-3: 分数×整数
  {
    type: 'simple',
    samples: [
      '\\dfrac{4}{15}\\times 4=\\dfrac{16}{15}',
      '\\dfrac{3}{8}\\times 4=\\dfrac{12}{8}=\\dfrac{3}{2}',
      '\\dfrac{2}{9}\\times 3=\\dfrac{6}{9}=\\dfrac{2}{3}',
    ],
    prompt: '\\dfrac{5}{12}\\times 4=',
    answer: '5/3',
  },

  // 3-4: 整数×分数
  {
    type: 'simple',
    samples: [
      '5\\times\\dfrac{2}{3}=\\dfrac{10}{3}',
      '4\\times\\dfrac{3}{8}=\\dfrac{12}{8}=\\dfrac{3}{2}',
      '6\\times\\dfrac{5}{9}=\\dfrac{30}{9}=\\dfrac{10}{3}',
    ],
    prompt: '8\\times\\dfrac{3}{4}=',
    answer: '6',
  },

  // 4-1: 分数÷分数（twoStep: 逆数→答え）
  {
    type: 'twoStep',
    samples: [
      '\\dfrac{5}{12}\\div\\dfrac{3}{8}=\\dfrac{5}{12}\\times\\dfrac{8}{3}=\\dfrac{40}{36}=\\dfrac{10}{9}',
      '\\dfrac{2}{3}\\div\\dfrac{4}{5}=\\dfrac{2}{3}\\times\\dfrac{5}{4}=\\dfrac{10}{12}=\\dfrac{5}{6}',
      '\\dfrac{3}{4}\\div\\dfrac{9}{8}=\\dfrac{3}{4}\\times\\dfrac{8}{9}=\\dfrac{24}{36}=\\dfrac{2}{3}',
    ],
    fullPrompt: '\\dfrac{3}{4}\\div\\dfrac{5}{6}=\\dfrac{3}{4}\\times',
    step1prompt: '\\dfrac{3}{4}\\div\\dfrac{5}{6}=\\dfrac{3}{4}\\times',
    step1answer: '6/5',
    step2prompt: '\\dfrac{3}{4}\\times\\dfrac{6}{5}=',
    step2answer: '9/10',
    step1label: '÷',
  },

  // 4-2: 分数3つの割り算
  {
    type: 'simple',
    samples: [
      '\\dfrac{9}{4}\\div\\dfrac{5}{3}\\div\\dfrac{1}{2}=\\dfrac{9}{4}\\times\\dfrac{3}{5}\\times 2=\\dfrac{54}{20}=\\dfrac{27}{10}',
      '\\dfrac{4}{3}\\div\\dfrac{2}{5}\\div\\dfrac{1}{3}=\\dfrac{4}{3}\\times\\dfrac{5}{2}\\times 3=10',
      '\\dfrac{8}{5}\\div\\dfrac{4}{3}\\div\\dfrac{2}{3}=\\dfrac{8}{5}\\times\\dfrac{3}{4}\\times\\dfrac{3}{2}=\\dfrac{9}{5}',
    ],
    prompt: '\\dfrac{3}{2}\\div\\dfrac{5}{4}\\div\\dfrac{3}{5}=',
    answer: '2',
  },

  // 4-3: 分数÷整数
  {
    type: 'simple',
    samples: [
      '\\dfrac{7}{10}\\div 3=\\dfrac{7}{30}',
      '\\dfrac{5}{6}\\div 2=\\dfrac{5}{12}',
      '\\dfrac{4}{9}\\div 4=\\dfrac{1}{9}',
    ],
    prompt: '\\dfrac{3}{8}\\div 6=',
    answer: '1/16',
  },

  // 4-4: 整数÷分数
  {
    type: 'simple',
    samples: [
      '8\\div\\dfrac{4}{5}=8\\times\\dfrac{5}{4}=10',
      '6\\div\\dfrac{3}{4}=6\\times\\dfrac{4}{3}=8',
      '9\\div\\dfrac{3}{5}=9\\times\\dfrac{5}{3}=15',
    ],
    prompt: '4\\div\\dfrac{2}{3}=',
    answer: '6',
  },

  // 5-1: 四則混合 ()なし
  {
    type: 'simple',
    samples: [
      '\\dfrac{5}{6}+\\dfrac{5}{4}\\times\\dfrac{2}{3}-\\dfrac{5}{12}\\div\\dfrac{5}{2}=\\dfrac{5}{6}+\\dfrac{5}{6}-\\dfrac{1}{6}=\\dfrac{3}{2}',
      '\\dfrac{1}{2}+\\dfrac{3}{4}\\times\\dfrac{2}{3}-\\dfrac{1}{4}\\div\\dfrac{1}{2}=\\dfrac{1}{2}+\\dfrac{1}{2}-\\dfrac{1}{2}=\\dfrac{1}{2}',
      '\\dfrac{1}{3}+\\dfrac{2}{3}\\times\\dfrac{3}{4}-\\dfrac{1}{6}\\div\\dfrac{1}{2}=\\dfrac{1}{3}+\\dfrac{1}{2}-\\dfrac{1}{3}=\\dfrac{1}{2}',
    ],
    prompt: '\\dfrac{1}{2}+\\dfrac{2}{3}\\times\\dfrac{3}{4}-\\dfrac{1}{6}\\div\\dfrac{1}{3}=',
    answer: '1/2',
  },

  // 5-2: 四則混合 ()あり（paren型）
  {
    type: 'paren',
    samples: [
      '\\left(\\dfrac{5}{2}-\\dfrac{2}{3}\\right)\\div\\dfrac{28}{15}\\times\\dfrac{14}{9}=\\dfrac{11}{6}\\div\\dfrac{28}{15}\\times\\dfrac{14}{9}=\\dfrac{55}{36}',
      '\\left(\\dfrac{3}{2}-\\dfrac{1}{3}\\right)\\times\\dfrac{6}{7}\\div\\dfrac{5}{7}=\\dfrac{7}{6}\\times\\dfrac{6}{7}\\div\\dfrac{5}{7}=\\dfrac{7}{5}',
      '\\left(\\dfrac{4}{3}-\\dfrac{1}{2}\\right)\\div\\dfrac{5}{6}\\times\\dfrac{1}{2}=\\dfrac{5}{6}\\div\\dfrac{5}{6}\\times\\dfrac{1}{2}=\\dfrac{1}{2}',
    ],
    fullPrompt: '\\left(\\dfrac{3}{4}-\\dfrac{1}{3}\\right)\\div\\dfrac{5}{12}\\times\\dfrac{2}{3}=',
    step1prompt: '\\dfrac{3}{4}-\\dfrac{1}{3}=',
    step1answer: '5/12',
    step2prompt: '\\dfrac{5}{12}\\div\\dfrac{5}{12}\\times\\dfrac{2}{3}=',
    step2answer: '2/3',
  },

  // 5-3: 四則混合 整数あり（paren型）
  {
    type: 'paren',
    samples: [
      '\\left(\\dfrac{7}{2}-2\\right)\\times\\dfrac{3}{5}\\div\\dfrac{6}{7}=\\dfrac{3}{2}\\times\\dfrac{3}{5}\\div\\dfrac{6}{7}=\\dfrac{21}{20}',
      '\\left(\\dfrac{5}{3}-1\\right)\\times\\dfrac{3}{2}\\div\\dfrac{2}{3}=\\dfrac{2}{3}\\times\\dfrac{3}{2}\\div\\dfrac{2}{3}=\\dfrac{3}{2}',
      '\\left(\\dfrac{9}{4}-2\\right)\\times\\dfrac{4}{3}\\div\\dfrac{1}{3}=\\dfrac{1}{4}\\times\\dfrac{4}{3}\\div\\dfrac{1}{3}=1',
    ],
    fullPrompt: '\\left(\\dfrac{5}{2}-1\\right)\\times\\dfrac{2}{3}\\div\\dfrac{1}{2}=',
    step1prompt: '\\dfrac{5}{2}-1=',
    step1answer: '3/2',
    step2prompt: '\\dfrac{3}{2}\\times\\dfrac{2}{3}\\div\\dfrac{1}{2}=',
    step2answer: '2',
  },
]

// ────────────────────────────────────────────────
// 分数入力UI（案B: 分子・分母ボックスをタップで切替）
// ────────────────────────────────────────────────
const FracInput = ({ numStr, denStr, focus, onFocusNum, onFocusDen, isEmpty }) => {
  const activeStyle = {
    background: '#163a5e',
    border: '2px solid #4db8ff',
    borderRadius: '6px',
    minWidth: '36px',
    padding: '2px 8px',
    textAlign: 'center',
    color: '#4db8ff',
    fontWeight: 'bold',
    fontSize: '20px',
    cursor: 'pointer',
    lineHeight: '1.4',
  }
  const inactiveStyle = {
    background: '#1a1a2e',
    border: '1.5px dashed #555',
    borderRadius: '6px',
    minWidth: '36px',
    padding: '2px 8px',
    textAlign: 'center',
    color: '#888',
    fontWeight: 'bold',
    fontSize: '20px',
    cursor: 'pointer',
    lineHeight: '1.4',
  }
  const doneStyle = {
    background: '#1a2e1a',
    border: '1.5px solid #4dff88',
    borderRadius: '6px',
    minWidth: '36px',
    padding: '2px 8px',
    textAlign: 'center',
    color: '#88ff88',
    fontWeight: 'bold',
    fontSize: '20px',
    cursor: 'pointer',
    lineHeight: '1.4',
  }

  const numDone = numStr !== '' && focus !== 'num'
  const denDone = denStr !== '' && focus !== 'den'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}>
      <div
        onClick={onFocusNum}
        style={focus === 'num' ? activeStyle : numDone ? doneStyle : inactiveStyle}
      >
        {numStr || '?'}
      </div>
      <div style={{ width: '100%', height: '2px', background: '#aaa', minWidth: '44px' }} />
      <div
        onClick={onFocusDen}
        style={focus === 'den' ? activeStyle : denDone ? doneStyle : inactiveStyle}
      >
        {denStr || '?'}
      </div>
    </div>
  )
}

// 数字キーボード（シンプル・言葉なし）
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
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btnStyle('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
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
export default function WarmUp3() {
  const navigate = useNavigate()
  const [idx, setIdx]         = useState(0)
  const [message, setMessage] = useState('')
  const [locked, setLocked]   = useState(false)
  const [score, setScore]     = useState({ correct: 0, total: 0 })

  // paren/twoStep 用
  // phase: 'view'(問題全体表示) | 'step1' | 'step2'
  const [phase, setPhase] = useState('view')

  // 分数入力状態
  const [numStr, setNumStr] = useState('')
  const [denStr, setDenStr] = useState('')
  const [focus, setFocus]   = useState('num') // 'num' | 'den'

  const problem = allProblems[idx]
  const isMultiStep = problem.type === 'twoStep' || problem.type === 'paren'

  // 入力リセット
  const resetInput = () => {
    setNumStr(''); setDenStr(''); setFocus('num')
  }

  // 現在フェーズの正解
  const getCurrentAnswer = () => {
    if (problem.type === 'simple') return problem.answer
    if (effectivePhase === 'step1') return problem.step1answer
    if (effectivePhase === 'step2') return problem.step2answer
    return ''
  }

  // 現在フェーズのプロンプト
  const getCurrentPrompt = () => {
    if (problem.type === 'simple') return problem.prompt
    if (phase === 'view' || phase === 'step1') return problem.step1prompt
    return problem.step2prompt
  }

  // ユーザー入力 → 正規化文字列
  const getUserAnswer = () => {
    if (numStr && denStr) return reduceFrac(`${numStr}/${denStr}`)
    if (numStr && !denStr) return numStr
    return ''
  }

  // 入力中のKaTeX表示（問題式の後ろに付ける）
  const getInputDisplay = () => {
    if (numStr === '' && denStr === '') return '?'
    if (denStr === '') return `\\dfrac{${numStr || '?'}}{?}`
    return `\\dfrac{${numStr || '?'}}{${denStr}}`
  }

  const handleKey = (val) => {
    if (locked) return
    if (focus === 'num') setNumStr(s => s + val)
    else setDenStr(s => s + val)
  }

  const handleDelete = () => {
    if (locked) return
    if (focus === 'num') setNumStr(s => s.slice(0, -1))
    else {
      if (denStr.length > 0) setDenStr(s => s.slice(0, -1))
      else setFocus('num')
    }
  }

  const handleEnter = () => {
    if (locked) return
    const userAns = getUserAnswer()
    if (!userAns) return
    const correct = normalize(getCurrentAnswer())
    const isCorrect = normalize(userAns) === correct

    if (effectivePhase === 'step1' && isMultiStep) {
      setMessage(isCorrect ? '⭕' : `❌`)
      setLocked(true)
    } else {
      setMessage(isCorrect ? '⭕' : '❌')
      setScore(s => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total + 1,
      }))
      setLocked(true)
    }
  }

  const handleNext = () => {
    if (effectivePhase === 'step1' && isMultiStep) {
      // ステップ1完了 → ステップ2へ
      setPhase('step2')
      setLocked(false)
      setMessage('')
      resetInput()
    } else {
      // 最終完了 → 次の問題
      setIdx(i => (i + 1) % allProblems.length)
      setPhase('view')
      setLocked(false)
      setMessage('')
      resetInput()
    }
  }

  // simple型は最初からstep1扱い（viewフェーズをスキップ）
  // 常にstep1から開始（viewフェーズは使わない）
  const effectivePhase = phase === 'view' ? 'step1' : phase

  // ステップインジケーター（●○: step1=左, step2=右）
  const StepDots = () => {
    if (!isMultiStep) return null
    const dot = (active, done) => (
      <span style={{
        display: 'inline-block', width: '10px', height: '10px',
        borderRadius: '50%', margin: '0 4px',
        background: done ? '#4dff88' : active ? '#4db8ff' : '#333',
        border: done ? 'none' : active ? 'none' : '1px solid #555',
      }} />
    )
    return (
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        {dot(effectivePhase === 'step1', effectivePhase === 'step2')}
        {dot(effectivePhase === 'step2', false)}
      </div>
    )
  }

  // 常に入力フェーズ
  const isViewPhase = false
  const isInputPhase = true


  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <h1 style={{ textAlign: 'center', marginBottom: '4px' }}>🧩 Warm Up 3</h1>

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
        {score.total > 0
          ? `✅ ${score.correct} / ${score.total}　(${Math.round(score.correct / score.total * 100)}%)`
          : '　'}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
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

      {/* ステップドット */}
      <StepDots />

      {/* 元の問題エリア（paren/twoStep型はstep1・step2中も常に表示） */}
      {isMultiStep && (
        <div style={{
          background: '#1a1a2e', border: '1px solid #666',
          borderRadius: '12px', padding: '12px 24px', marginBottom: '10px',
        }}>
          <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>❓</div>
          <BlockMath math={`${problem.fullPrompt}\\,?`} />
        </div>
      )}

      {/* ステップ入力エリア（step1/step2フェーズのみ） */}
      {isMultiStep && !isViewPhase && (
        <div style={{
          background: '#0d2137', border: '2px solid #4db8ff',
          borderRadius: '12px', padding: '12px 24px', marginBottom: '12px',
        }}>
          <div style={{ color: '#4db8ff', fontSize: '13px', marginBottom: '4px' }}>↳</div>
          <BlockMath math={
            effectivePhase === 'step1'
              ? `${problem.step1prompt}${locked ? '' : getInputDisplay()}`
              : `${problem.step2prompt}${locked ? '' : getInputDisplay()}`
          } />
        </div>
      )}

      {/* simple型の問題エリア */}
      {!isMultiStep && (
        <div style={{
          background: '#0d2137', border: '2px solid #4db8ff',
          borderRadius: '12px', padding: '16px 24px', marginBottom: '12px',
        }}>
          <div style={{ color: '#4db8ff', fontSize: '13px', marginBottom: '8px' }}>❓</div>
          <BlockMath math={`${problem.prompt}${getInputDisplay()}`} />
        </div>
      )}

      {/* 分数入力ボックス（入力フェーズのみ・ロック中非表示） */}
      {isInputPhase && !locked && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ color: '#4db8ff', fontSize: '18px' }}>=</span>
          <FracInput
            numStr={numStr}
            denStr={denStr}
            focus={focus}
            onFocusNum={() => setFocus('num')}
            onFocusDen={() => setFocus('den')}
          />
        </div>
      )}

      {/* 判定メッセージ */}
      <div style={{ textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {message && (
          <div>
            <span style={{ fontSize: '48px' }}>{message === '⭕' ? '⭕' : '❌'}</span>
            {message === '❌' && (
              <p style={{ color: '#ff9999', fontSize: '16px', margin: '4px 0 0' }}>
                → <strong style={{ color: 'white' }}>{getCurrentAnswer()}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 次へボタン */}
      {(isViewPhase || locked) && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <button onClick={handleNext} style={{
            padding: '12px 40px', fontSize: '20px', borderRadius: '10px',
            border: 'none',
            backgroundColor: isMultiStep && effectivePhase === 'step1' ? '#2a5a2a' : '#1a6ef5',
            color: 'white', cursor: 'pointer', fontWeight: 'bold',
          }}>
            {isMultiStep && effectivePhase === 'step1' ? '▶' : '↩'}
          </button>
        </div>
      )}

      {/* キーボード（入力フェーズのみ） */}
      {isInputPhase && !locked && (
        <NumKeyboard
          onKey={handleKey}
          onDelete={handleDelete}
          onEnter={handleEnter}
        />
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
