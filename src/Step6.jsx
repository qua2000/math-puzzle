import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5)

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
      }}>
        OK
      </button>
    </div>
  </div>
)

// ── 係数・指数を文字列に変換するヘルパー ────────────────
// 係数±の符号を含む項文字列（例: +2x, -3）
const termStr = (coef, varPart) => {
  if (varPart === '') return `${coef}`        // 定数項
  if (coef === 1)  return varPart
  if (coef === -1) return `-${varPart}`
  return `${coef}${varPart}`
}

// ax±b の文字列（KaTeX用）
const linearStr = (a, b) => {
  const bAbs = Math.abs(b)
  const sign  = b >= 0 ? '+' : '-'
  if (a === 1)  return b >= 0 ? `x+${b}`  : `x-${bAbs}`
  if (a === -1) return b >= 0 ? `-x+${b}` : `-x-${bAbs}`
  return b >= 0 ? `${a}x+${b}` : `${a}x-${bAbs}`
}

// ax^n±b の文字列（KaTeX用）
const polyStr = (a, n, b) => {
  const xPart = n === 1 ? 'x' : `x^{${n}}`
  const head  = a === 1 ? xPart : a === -1 ? `-${xPart}` : `${a}${xPart}`
  const bAbs  = Math.abs(b)
  const tail  = b === 0 ? '' : b > 0 ? `+${b}` : `-${bAbs}`
  return head + tail
}

// 微分文字列 D(ax^n±b) = an·x^{n-1}（定数項は消える）
const diffPoly = (a, n) => {
  const coef = a * n
  if (n === 1) return `${coef}`           // D(ax+b)=a
  if (n === 2) return `${coef}x`          // D(ax²+b)=2ax
  return `${coef}x^{${n-1}}`
}

// ── 前半問題生成：f=ax±b, g=cx±d ───────────────────────
const generateFront = () => {
  const a = randomInt(1, 5)
  const b = randomInt(1, 9) * (randomInt(0,1) === 0 ? 1 : -1)
  const c = randomInt(1, 5)
  const d = randomInt(1, 9) * (randomInt(0,1) === 0 ? 1 : -1)

  const fStr = linearStr(a, b)
  const gStr = linearStr(c, d)

  const df = `${a}` // D(ax+b)=a
  const dg = `${c}` // D(cx+d)=c

  // 最終答: a(cx+d) + (ax+b)c = 2ac·x + (ad+bc)
  const coefX    = 2 * a * c
  const coefConst = a * d + b * c
  const finalStr = coefConst === 0
    ? `${coefX}x`
    : coefConst > 0
    ? `${coefX}x+${coefConst}`
    : `${coefX}x${coefConst}`

  // 問1選択肢 D(f)=a
  const df_w1 = `${a}x`
  const df_w2 = `${a+1}`
  const df_w3 = `0`

  // 問2選択肢 D(g)=c
  const dg_w1 = `${c}x`
  const dg_w2 = `${c+1}`
  const dg_w3 = `0`

  // 問3選択肢
  const fin_w1 = coefConst > 0
    ? `${coefX+1}x+${coefConst}` : `${coefX+1}x${coefConst}`
  const fin_w2 = coefConst > 0
    ? `${a*c}x+${coefConst}`     : `${a*c}x${coefConst}`   // 2ac→ac
  const fin_w3 = `${coefX}x`   // 定数項落とし

  return {
    fStr, gStr, df, dg, finalStr,
    question: `D\\{(${fStr})(${gStr})\\}`,
    q1: { question: `D(${fStr})=?`,  correct: df,       choices: shuffleArray([df,df_w1,df_w2,df_w3]) },
    q2: { question: `D(${gStr})=?`,  correct: dg,       choices: shuffleArray([dg,dg_w1,dg_w2,dg_w3]) },
    q3: {
      question: `D(${fStr}) \\cdot (${gStr}) + (${fStr}) \\cdot D(${gStr})=?`,
      correct: finalStr,
      choices: shuffleArray([finalStr, fin_w1, fin_w2, fin_w3]),
    },
  }
}

// ── 後半問題生成：f=ax^n±b, g=cx^m±d ──────────────────
const generateBack = () => {
  // パターンをランダムに選ぶ
  const pattern = randomInt(0, 2)

  let a, n, b, c, m, d

  if (pattern === 0) {
    // (ax^n ± b)(cx ± d)
    n = randomInt(2, 3); m = 1
    a = randomInt(1, 3) * (randomInt(0,1) === 0 ? 1 : -1)
    b = randomInt(1, 5) * (randomInt(0,1) === 0 ? 1 : -1)
    c = randomInt(1, 4)
    d = randomInt(1, 8) * (randomInt(0,1) === 0 ? 1 : -1)
  } else if (pattern === 1) {
    // (ax ± b)(cx^m ± d)
    n = 1; m = randomInt(2, 3)
    a = randomInt(1, 4)
    b = randomInt(1, 8) * (randomInt(0,1) === 0 ? 1 : -1)
    c = randomInt(1, 3) * (randomInt(0,1) === 0 ? 1 : -1)
    d = randomInt(1, 5) * (randomInt(0,1) === 0 ? 1 : -1)
  } else {
    // (ax^n ± b)(cx^m ± d) 両方高次
    n = randomInt(2, 3); m = randomInt(2, 3)
    a = randomInt(1, 3) * (randomInt(0,1) === 0 ? 1 : -1)
    b = randomInt(1, 5) * (randomInt(0,1) === 0 ? 1 : -1)
    c = randomInt(1, 3) * (randomInt(0,1) === 0 ? 1 : -1)
    d = randomInt(1, 5) * (randomInt(0,1) === 0 ? 1 : -1)
  }

  const fStr = polyStr(a, n, b)
  const gStr = polyStr(c, m, d)

  const df = diffPoly(a, n)   // D(ax^n+b) = an·x^{n-1}
  const dg = diffPoly(c, m)   // D(cx^m+d) = cm·x^{m-1}

  // 最終答：df·g + f·dg（展開・同類項まとめ）
  // df = an·x^{n-1}, f = ax^n+b, dg = cm·x^{m-1}, g = cx^m+d
  const an = a * n
  const cm = c * m
  // df·g = an·x^{n-1}·(cx^m+d) = an·c·x^{n+m-1} + an·d·x^{n-1}
  // f·dg = (ax^n+b)·cm·x^{m-1} = a·cm·x^{n+m-1} + b·cm·x^{m-1}
  // 同次の項：x^{n+m-1} の係数 = an·c + a·cm = ac(n+m)
  const topExp  = n + m - 1
  const topCoef = an * c + a * cm   // = a*c*(n+m)

  // x^{n-1} の係数 = an·d（ただし n>1 のとき）
  // x^{m-1} の係数 = b·cm（ただし m>1 のとき）
  // n=1のとき x^0=定数になるため別処理

  // 各項を配列で管理してまとめる
  const terms = {}  // exp -> coef
  const addTerm = (exp, coef) => { terms[exp] = (terms[exp] || 0) + coef }

  addTerm(topExp, topCoef)
  if (n - 1 >= 0) addTerm(n - 1, an * d)
  if (m - 1 >= 0) addTerm(m - 1, b * cm)

  // 降冪で文字列化
  const exps = Object.keys(terms).map(Number).sort((a, b) => b - a)
  const finalStr = exps.map((exp, i) => {
    const coef = terms[exp]
    if (coef === 0) return ''
    const xp = exp === 0 ? '' : exp === 1 ? 'x' : `x^{${exp}}`
    const absCoef = Math.abs(coef)
    const head = exp === 0 ? `${coef}` : coef === 1 ? xp : coef === -1 ? `-${xp}` : `${coef}${xp}`
    if (i === 0) return head
    return coef > 0 ? `+${absCoef === 1 && xp ? xp : absCoef + xp}` : `-${absCoef === 1 && xp ? xp : absCoef + xp}`
  }).filter(Boolean).join('')

  // 問1選択肢
  const df_w1 = diffPoly(a, n + 1)    // 指数ミス
  const df_w2 = n === 1 ? `${a+1}` : `${a}x^{${n-1}}`  // 係数ミス
  const df_w3 = `${a}`                  // 微分しない

  // 問2選択肢
  const dg_w1 = diffPoly(c, m + 1)
  const dg_w2 = m === 1 ? `${c+1}` : `${c}x^{${m-1}}`
  const dg_w3 = `${c}`

  // 問3選択肢（係数を少しずらす）
  const tweakStr = (s) => s.replace(/^(-?\d+)/, (_, n) => `${parseInt(n) + 1}`)
  const fin_w1 = tweakStr(finalStr)
  const fin_w2 = finalStr.replace(/\+/g, '-').replace(/--/g, '+')  // 符号ミス
  const fin_w3 = (() => {
    // topCoef だけ変える
    const alt = { ...terms }
    alt[topExp] = topCoef - a * cm   // f·dg部分だけ
    return Object.keys(alt).map(Number).sort((a,b)=>b-a).map((exp,i)=>{
      const coef = alt[exp]; if(!coef) return ''
      const xp = exp===0?'':exp===1?'x':`x^{${exp}}`
      const head = exp===0?`${coef}`:coef===1?xp:coef===-1?`-${xp}`:`${coef}${xp}`
      if(i===0) return head
      const abs = Math.abs(coef)
      return coef>0?`+${abs===1&&xp?xp:abs+xp}`:`-${abs===1&&xp?xp:abs+xp}`
    }).filter(Boolean).join('')
  })()

  return {
    fStr, gStr, df, dg, finalStr,
    question: `D\\{(${fStr})(${gStr})\\}`,
    q1: { question: `D(${fStr})=?`,  correct: df, choices: shuffleArray([df,df_w1,df_w2,df_w3]) },
    q2: { question: `D(${gStr})=?`,  correct: dg, choices: shuffleArray([dg,dg_w1,dg_w2,dg_w3]) },
    q3: {
      question: `D(${fStr}) \\cdot (${gStr}) + (${fStr}) \\cdot D(${gStr})=?`,
      correct: finalStr,
      choices: shuffleArray([finalStr, fin_w1, fin_w2, fin_w3]),
    },
  }
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step6() {
  const navigate  = useNavigate()
  const [stage, setStage]     = useState('front')          // 'front' | 'back'
  const [problem, setProblem] = useState(generateFront())
  const [phase, setPhase]     = useState(1)                // 1,2,3
  const [answers, setAnswers] = useState({})
  const [message, setMessage] = useState('')
  const [prepNum, setPrepNum] = useState(null)
  const [frontCount, setFrontCount] = useState(0)          // 前半正解数カウント
  const FRONT_REQUIRED = 3                                  // 前半この数クリアで後半へ

  const currentQ = phase === 1 ? problem.q1 : phase === 2 ? problem.q2 : problem.q3
  const selected = answers[phase]

  const checkAnswer = (answer) => {
    if (selected !== undefined) return
    setAnswers(prev => ({ ...prev, [phase]: answer }))
    setMessage(answer === currentQ.correct ? '⭕' : '❌')
  }

  const nextPhase = () => { setPhase(phase + 1); setMessage('') }

  const nextProblem = () => {
    // 問3正解かどうか確認
    const q3correct = answers[3] === problem.q3.correct || selected === problem.q3.correct

    if (stage === 'front') {
      const newCount = q3correct ? frontCount + 1 : frontCount
      if (newCount >= FRONT_REQUIRED) {
        // 後半へ移行
        setStage('back')
        setProblem(generateBack())
        setFrontCount(0)
      } else {
        setFrontCount(newCount)
        setProblem(generateFront())
      }
    } else {
      setProblem(generateBack())
    }
    setPhase(1); setAnswers({}); setMessage('')
  }

  // 例示エリア（前半・後半で切り替え）
  const ExamplesArea = () => stage === 'front' ? (
    <div style={{
      background: '#1a1a2e', border: '1px solid #444',
      borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
    }}>
      <BlockMath math={String.raw`\boxed{\times = \cdot}`} />
      <BlockMath math={String.raw`D\{f \cdot g\} = D(f) \cdot g + f \cdot D(g)`} />
      <BlockMath math={String.raw`\,`} />

      {/* 例1: (2x+1)(3x-4) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <BlockMath math={String.raw`\begin{aligned}
            D\{(2x+1)(3x-4)\}
              &= D(2x+1)(3x-4)+(2x+1)D(3x-4) \\
              &= 2(3x-4)+(2x+1) \cdot 3 \\
              &= 6x-8+6x+3 \\
              &= 12x-5
          \end{aligned}`} />
        </div>
        <div style={{ paddingTop: '60px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>
      </div>

      <BlockMath math={String.raw`\,`} />

      {/* 例2: (4x-8)(2x+5) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <BlockMath math={String.raw`\begin{aligned}
            D\{(4x-8)(2x+5)\}
              &= D(4x-8)(2x+5)+(4x-8)D(2x+5) \\
              &= 4(2x+5)+(4x-8) \cdot 2 \\
              &= 8x+20+8x-16 \\
              &= 16x+4
          \end{aligned}`} />
        </div>
        <div style={{ paddingTop: '60px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>
      </div>
    </div>
  ) : (
    <div style={{
      background: '#1a1a2e', border: '1px solid #444',
      borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
    }}>
      <BlockMath math={String.raw`D\{f \cdot g\} = D(f) \cdot g + f \cdot D(g)`} />
      <BlockMath math={String.raw`\,`} />

      {/* 例1: (x^2-1)(3x+2) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <BlockMath math={String.raw`\begin{aligned}
            D\{(x^2-1)(3x+2)\}
              &= D(x^2-1)(3x+2)+(x^2-1)D(3x+2) \\
              &= 2x(3x+2)+(x^2-1) \cdot 3 \\
              &= 6x^2+4x+3x^2-3 \\
              &= 9x^2+4x-3
          \end{aligned}`} />
        </div>
        <div style={{ paddingTop: '60px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>
      </div>

      <BlockMath math={String.raw`\,`} />

      {/* 例2: (x+2)(2x^2-5) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <BlockMath math={String.raw`\begin{aligned}
            D\{(x+2)(2x^2-5)\}
              &= D(x+2)(2x^2-5)+(x+2)D(2x^2-5) \\
              &= 1 \cdot (2x^2-5)+(x+2) \cdot 4x \\
              &= 2x^2-5+4x^2+8x \\
              &= 6x^2+8x-5
          \end{aligned}`} />
        </div>
        <div style={{ paddingTop: '60px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PrepBadge num={2} onClick={() => setPrepNum(2)} />
          <PrepBadge num={3} onClick={() => setPrepNum(3)} />
        </div>
      </div>
    </div>
  )

  const btnStyle = (choice) => ({
    padding: '12px 20px', fontSize: '20px', borderRadius: '10px',
    border: '2px solid #555', cursor: 'pointer',
    backgroundColor:
      selected === choice
        ? choice === currentQ.correct ? '#2d6a2d' : '#6a2d2d'
        : '#2a2a3e',
    color: 'white', minWidth: '80px', textAlign: 'center',
  })

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Math Puzzle – Step 6</h1>

      {/* 前半/後半インジケーター */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span style={{
          padding: '4px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
          backgroundColor: stage === 'front' ? '#1a6ef5' : '#2d6a2d',
          color: 'white',
        }}>
          {stage === 'front' ? `Phase 1　${frontCount} / ${FRONT_REQUIRED}` : 'Phase 2'}
        </span>
      </div>

      {/* 例示エリア */}
      <ExamplesArea />

      {/* 問題タイトル */}
      <div style={{
        background: '#0d2137', border: '2px solid #4db8ff',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        <BlockMath math={problem.question} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: '32px', height: '8px', borderRadius: '4px',
              backgroundColor: i <= phase ? '#4db8ff' : '#333',
            }} />
          ))}
        </div>
      </div>

      {/* 現在の問い */}
      <div style={{
        background: '#1a2a1a', border: '2px solid #4dff88',
        borderRadius: '12px', padding: '16px 24px', marginBottom: '16px',
      }}>
        {phase >= 2 && (
          <div style={{ color: '#aaa', marginBottom: '8px' }}>
            <BlockMath math={`D(${problem.fStr}) = ${problem.df}`} />
          </div>
        )}
        {phase >= 3 && (
          <div style={{ color: '#aaa', marginBottom: '8px' }}>
            <BlockMath math={`D(${problem.gStr}) = ${problem.dg}`} />
          </div>
        )}
        <BlockMath math={currentQ.question} />
      </div>

      {/* 選択肢 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {currentQ.choices.map((choice) => (
          <button key={choice} onClick={() => checkAnswer(choice)} style={btnStyle(choice)}>
            <BlockMath math={choice} />
          </button>
        ))}
      </div>

      {/* メッセージ */}
      <h2 style={{ textAlign: 'center', fontSize: '48px', margin: '0 0 16px' }}>{message}</h2>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        {selected !== undefined && phase < 3 && (
          <button onClick={nextPhase} style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>
            Next →
          </button>
        )}
        {selected !== undefined && phase === 3 && (
          <button onClick={nextProblem} style={{
            padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
            border: 'none', backgroundColor: '#1a6ef5', color: 'white',
            cursor: 'pointer', fontWeight: 'bold',
          }}>
            Next
          </button>
        )}
        <button onClick={() => navigate('/')} style={{
          padding: '14px 32px', fontSize: '18px', borderRadius: '10px',
          border: '1px solid #555', backgroundColor: 'transparent',
          color: '#aaa', cursor: 'pointer',
        }}>
          ← Home
        </button>
      </div>

      {/* Prepポップアップ */}
      {prepNum !== null && (
        <PrepPopup num={prepNum} onClose={() => setPrepNum(null)} />
      )}
    </div>
  )
}
