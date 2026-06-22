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

function normalize(s) { return String(s).replace(/\s/g, '').toLowerCase() }

function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+)/g, (_, exp) => `^{${exp}}`)
}

// ── 多項式ヘルパー ──────────────────────────────────────
function addTermTo(terms, exp, coef) {
  terms[exp] = (terms[exp] || 0) + coef
}

function formatTermsObj(terms) {
  const exps = Object.keys(terms).map(Number).filter(e => terms[e] !== 0).sort((a, b) => b - a)
  if (exps.length === 0) return '0'
  return exps.map((exp, i) => {
    const coef = terms[exp]
    const absC = Math.abs(coef)
    const xp = exp === 0 ? '' : exp === 1 ? 'x' : `x^{${exp}}`
    let body
    if (exp === 0) body = `${absC}`
    else if (absC === 1) body = xp
    else body = `${absC}${xp}`
    if (i === 0) return coef < 0 ? `-${body}` : body
    return coef < 0 ? `-${body}` : `+${body}`
  }).join('')
}

function formatMonomial(coef, exp) {
  const xp = exp === 0 ? '' : exp === 1 ? 'x' : `x^{${exp}}`
  if (exp === 0) return `${coef}`
  if (coef === 1) return xp
  if (coef === -1) return `-${xp}`
  return `${coef}${xp}`
}

// ax^n + b の KaTeX 用文字列
function polyKatex(a, n, b) {
  const xp = n === 1 ? 'x' : `x^{${n}}`
  const head = a === 1 ? xp : a === -1 ? `-${xp}` : `${a}${xp}`
  if (b === 0) return head
  return b > 0 ? `${head}+${b}` : `${head}${b}`
}

// ── 柔軟な正解判定 ──────────────────────────────────────
function parseTerms(str) {
  const s = String(str).replace(/\s/g, '')
  if (!s) return null
  const withSign = (s[0] === '+' || s[0] === '-') ? s : '+' + s
  const tokens = withSign.match(/[+-][^+-]+/g)
  if (!tokens) return null
  const terms = {}
  for (const tok of tokens) {
    const sign = tok[0] === '-' ? -1 : 1
    const body = tok.slice(1)
    if (!body) return null
    if (body.includes('x')) {
      const idx = body.indexOf('x')
      const coefPart = body.slice(0, idx)
      const expPart  = body.slice(idx + 1)
      const coef = coefPart === '' ? 1 : Number(coefPart)
      if (Number.isNaN(coef)) return null
      let exp = 1
      if (expPart.startsWith('^')) {
        let expNum = expPart.slice(1)
        // x^{2} 形式（KaTeX用の波括弧）にも対応
        if (expNum.startsWith('{') && expNum.endsWith('}')) expNum = expNum.slice(1, -1)
        exp = Number(expNum)
        if (Number.isNaN(exp)) return null
      } else if (expPart !== '') return null
      terms[exp] = (terms[exp] || 0) + sign * coef
    } else {
      const coef = Number(body)
      if (Number.isNaN(coef)) return null
      terms[0] = (terms[0] || 0) + sign * coef
    }
  }
  Object.keys(terms).forEach(k => { if (terms[k] === 0) delete terms[k] })
  return terms
}

function checkAnswer(userStr, correctStr) {
  if (!userStr) return false
  if (normalize(userStr) === normalize(correctStr)) return true
  const t1 = parseTerms(userStr)
  const t2 = parseTerms(correctStr)
  if (!t1 || !t2) return false
  const k1 = Object.keys(t1), k2 = Object.keys(t2)
  if (k1.length !== k2.length) return false
  return k1.every(k => t1[k] === t2[k])
}

// ── Prepバッジ ──────────────────────────────────────────
const PrepBadge = ({ num, onClick }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', fontSize: '13px', fontWeight: 'bold',
    borderRadius: '20px', border: '1.5px solid #f0a500',
    backgroundColor: 'rgba(240,165,0,0.15)', color: '#f0a500',
    cursor: 'pointer', verticalAlign: 'middle', marginLeft: '8px', lineHeight: 1.2,
  }}>
    📘 Prep{num}
  </button>
)

const PrepPopup = ({ num, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a1a2e', border: '2px solid #f0a500',
      borderRadius: '16px', padding: '32px 40px', textAlign: 'center', minWidth: '220px',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📘</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f0a500' }}>Prep {num}</div>
      <button onClick={onClose} style={{
        marginTop: '24px', padding: '10px 28px', fontSize: '16px',
        borderRadius: '10px', border: 'none', backgroundColor: '#f0a500',
        color: '#000', cursor: 'pointer', fontWeight: 'bold',
      }}>OK</button>
    </div>
  </div>
)

const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^2</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>x<sup style={{ fontSize: '11px' }}>2</sup></span>
    </div>
  </div>
)

const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }
  const btnStyle = (color) => ({
    padding: '12px 4px', minWidth: '46px', flex: 1, maxWidth: '60px',
    borderRadius: '8px',
    border: `1.5px solid ${color === 'del' ? '#ff666655' : color === 'enter' ? '#44ff8855' : color === 'caret' ? '#aaffaa55' : '#4db8ff55'}`,
    background: color === 'del' ? '#3a1a1a' : color === 'enter' ? '#1a4a1a' : color === 'caret' ? '#1a3a1a' : '#1a2a3e',
    color: color === 'del' ? '#ff9999' : color === 'enter' ? '#88ff88' : color === 'caret' ? '#aaffaa' : 'white',
    fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
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

// 穴埋め用ボックス（クリックで選択切り替え）
const BlankBox = ({ value, status, active, onClick }) => (
  <span onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '60px', padding: '3px 10px', margin: '0 2px',
    borderRadius: '6px', cursor: status === 'correct' ? 'default' : 'pointer',
    border: `2px solid ${status === 'correct' ? '#4dff88' : status === 'wrong' ? '#ff6666' : active ? '#4db8ff' : '#555'}`,
    background: '#163a5e',
    color: status === 'correct' ? '#aaffaa' : status === 'wrong' ? '#ff9999' : '#4db8ff',
    fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', verticalAlign: 'middle',
  }}>
    {value || '□'}
  </span>
)

// 単一回答ボックス
const singleBoxStyle = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px', minWidth: '140px', padding: '4px 12px',
  textAlign: 'center', color: wrong ? '#ff9999' : '#4db8ff',
  fontWeight: 'bold', fontSize: '18px', fontFamily: 'monospace',
})

// ── 問題生成 ────────────────────────────────────────────
function buildProblem(a, n, b, c, m, d) {
  const fStr = polyKatex(a, n, b)
  const gStr = polyKatex(c, m, d)
  const dfCoef = a * n, dfExp = n - 1
  const dgCoef = c * m, dgExp = m - 1
  const dfStr = formatMonomial(dfCoef, dfExp)
  const dgStr = formatMonomial(dgCoef, dgExp)

  // D(f)・g を展開（表示用：正解ではなく問題に埋め込む値）
  const term1 = {}
  addTermTo(term1, dfExp + m, dfCoef * c)
  if (d !== 0) addTermTo(term1, dfExp, dfCoef * d)
  const term1Str = formatTermsObj(term1)   // 表示済みの値

  // f・D(g) を展開（?2 の正解）
  const term2 = {}
  addTermTo(term2, n + dgExp, a * dgCoef)
  if (b !== 0) addTermTo(term2, dgExp, b * dgCoef)
  const term2Str = formatTermsObj(term2)

  // 最終答え（?3 ／ Stage2・3の正解）
  const finalTerms = {}
  Object.keys(term1).forEach(k => addTermTo(finalTerms, Number(k), term1[Number(k)]))
  Object.keys(term2).forEach(k => addTermTo(finalTerms, Number(k), term2[Number(k)]))
  const finalStr = formatTermsObj(finalTerms)

  return {
    fStr, gStr, dfStr, dgStr, term1Str, term2Str, finalStr,
    q: `D\\{(${fStr})(${gStr})\\}`,
  }
}

// 前半：1次式 × 1次式
function generateFront() {
  const a = randomInt(1, 6)
  const b = randomInt(1, 9) * (randomInt(0,1) ? 1 : -1)
  const c = randomInt(1, 6)
  const d = randomInt(1, 9) * (randomInt(0,1) ? 1 : -1)
  return buildProblem(a, 1, b, c, 1, d)
}

// 後半：高次項あり
function generateBack() {
  const pat = randomInt(0, 2)
  let a, n, b, c, m, d
  if (pat === 0) {
    n = randomInt(2, 3); m = 1
    a = randomInt(1, 3) * (randomInt(0,1) ? 1 : -1)
    b = randomInt(1, 6) * (randomInt(0,1) ? 1 : -1)
    c = randomInt(1, 4); d = randomInt(1, 8) * (randomInt(0,1) ? 1 : -1)
  } else if (pat === 1) {
    n = 1; m = randomInt(2, 3)
    a = randomInt(1, 4); b = randomInt(1, 8) * (randomInt(0,1) ? 1 : -1)
    c = randomInt(1, 3) * (randomInt(0,1) ? 1 : -1)
    d = randomInt(1, 6) * (randomInt(0,1) ? 1 : -1)
  } else {
    n = randomInt(2, 3); m = randomInt(2, 3)
    a = randomInt(1, 3) * (randomInt(0,1) ? 1 : -1)
    b = randomInt(1, 5) * (randomInt(0,1) ? 1 : -1)
    c = randomInt(1, 3) * (randomInt(0,1) ? 1 : -1)
    d = randomInt(1, 5) * (randomInt(0,1) ? 1 : -1)
  }
  return buildProblem(a, n, b, c, m, d)
}

const FRONT_TOTAL  = 3   // 前半の問題数
const BACK_S1      = 2   // 後半：Stage1で出す問題数
const BACK_S2      = 3   // 後半：Stage2で出す問題数（これ以降Stage3）
const FINAL_STREAK = 3   // Stage3で連続正解したらクリア

// scaffoldLevel: 1=穴埋め  2=公式ヒントあり  3=ヒントなし
function getScaffold(stage, backCount) {
  if (stage === 'front') return 1
  if (backCount < BACK_S1) return 1
  if (backCount < BACK_S1 + BACK_S2) return 2
  return 3
}

// ── メインコンポーネント ─────────────────────────────────
export default function Step6() {
  const navigate = useNavigate()
  const [stage,       setStage]       = useState('front')
  const [frontCount,  setFrontCount]  = useState(0)
  const [backCount,   setBackCount]   = useState(0)
  const [streak,      setStreak]      = useState(0)
  const [cleared,     setCleared]     = useState(false)
  const [problem,     setProblem]     = useState(() => generateFront())
  const [prepNum,     setPrepNum]     = useState(null)

  // Stage1 用
  const [inputs,      setInputs]      = useState({ 1:'', 2:'', 3:'' })
  const [blankSt,     setBlankSt]     = useState({ 1:null, 2:null, 3:null })
  const [activeBlank, setActiveBlank] = useState(1)

  // Stage2・3 用
  const [answer,  setAnswer]  = useState('')
  const [msg,     setMsg]     = useState('')
  const [locked,  setLocked]  = useState(false)

  const scaffold = getScaffold(stage, backCount)
  const allCorrect = blankSt[1]==='correct' && blankSt[2]==='correct' && blankSt[3]==='correct'

  function resetStates() {
    setInputs({ 1:'', 2:'', 3:'' })
    setBlankSt({ 1:null, 2:null, 3:null })
    setActiveBlank(1)
    setAnswer(''); setMsg(''); setLocked(false)
  }

  function advance() {
    if (stage === 'front') {
      const next = frontCount + 1
      if (next >= FRONT_TOTAL) {
        setStage('back'); setFrontCount(0); setBackCount(0)
        setProblem(generateBack())
      } else {
        setFrontCount(next); setProblem(generateFront())
      }
    } else {
      const nextBack = backCount + 1
      if (scaffold === 3) {
        const newStreak = streak + 1
        if (newStreak >= FINAL_STREAK) { setCleared(true); resetStates(); return }
        setStreak(newStreak)
      } else {
        setStreak(0)
      }
      setBackCount(nextBack)
      setProblem(generateBack())
    }
    resetStates()
  }

  // Stage1 キーボード操作
  const kb1 = {
    key: (v) => {
      if (blankSt[activeBlank] === 'correct') return
      setInputs(p => ({ ...p, [activeBlank]: p[activeBlank] + v }))
      if (blankSt[activeBlank] === 'wrong') setBlankSt(p => ({ ...p, [activeBlank]: null }))
    },
    del: () => {
      if (blankSt[activeBlank] === 'correct') return
      setInputs(p => ({ ...p, [activeBlank]: p[activeBlank].slice(0,-1) }))
      if (blankSt[activeBlank] === 'wrong') setBlankSt(p => ({ ...p, [activeBlank]: null }))
    },
    enter: () => {
      if (blankSt[activeBlank] === 'correct') return
      const val = inputs[activeBlank]
      if (!val) return
      const ans = activeBlank === 1 ? problem.dfStr : activeBlank === 2 ? problem.term2Str : problem.finalStr
      const ok = checkAnswer(val, ans)
      if (ok) {
        const next = { ...blankSt, [activeBlank]: 'correct' }
        setBlankSt(next)
        const rem = [1,2,3].filter(id => next[id] !== 'correct')
        if (rem.length > 0) setActiveBlank(rem[0])
      } else {
        setBlankSt(p => ({ ...p, [activeBlank]: 'wrong' }))
      }
    },
  }

  // Stage2・3 キーボード操作
  const kb2 = {
    key: (v) => { if (locked) return; if (msg==='❌') setMsg(''); setAnswer(s=>s+v) },
    del: ()  => { if (locked) return; if (msg==='❌') setMsg(''); setAnswer(s=>s.slice(0,-1)) },
    enter: () => {
      if (locked || !answer) return
      const ok = checkAnswer(answer, problem.finalStr)
      if (ok) { setMsg('⭕'); setLocked(true) } else { setMsg('❌') }
    },
  }

  // ── クリア画面 ─────────────────────────────────────────
  if (cleared) return (
    <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto', fontFamily:'sans-serif', textAlign:'center' }}>
      <h1 style={{ marginBottom:'24px' }}>Math Puzzle – Step 6</h1>
      <div style={{ fontSize:'80px', margin:'16px 0' }}>🏆</div>
      <div style={{ fontSize:'48px' }}>🎉</div>
      <div style={{ display:'flex', gap:'16px', justifyContent:'center', marginTop:'32px' }}>
        <button onClick={() => { setStage('front'); setFrontCount(0); setBackCount(0); setStreak(0); setCleared(false); setProblem(generateFront()); resetStates() }}
          style={{ padding:'14px 32px', fontSize:'28px', borderRadius:'10px', border:'none', backgroundColor:'#1a6ef5', color:'white', cursor:'pointer' }}>
          🔁
        </button>
        <button onClick={() => navigate('/')}
          style={{ padding:'14px 28px', fontSize:'18px', borderRadius:'10px', border:'1px solid #555', backgroundColor:'transparent', color:'#aaa', cursor:'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )

  // ── メイン画面 ─────────────────────────────────────────
  return (
    <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto', fontFamily:'sans-serif' }}>
      <h1 style={{ textAlign:'center', marginBottom:'16px' }}>Math Puzzle – Step 6</h1>

      {/* 進捗バッジ */}
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        <span style={{
          padding:'4px 14px', borderRadius:'20px', fontSize:'14px', fontWeight:'bold',
          backgroundColor: stage==='front' ? '#1a6ef5' : '#2d6a2d', color:'white',
        }}>
          {stage==='front' ? `${frontCount+1} / ${FRONT_TOTAL}` : `${backCount+1}`}
        </span>
        <span style={{
          padding:'4px 14px', borderRadius:'20px', fontSize:'14px', fontWeight:'bold',
          backgroundColor:'#333', color:'white',
        }}>
          {scaffold===1 ? '🧩 Stage 1' : scaffold===2 ? '📝 Stage 2' : '🎯 Stage 3'}
        </span>
        {scaffold===3 && (
          <span style={{
            padding:'4px 14px', borderRadius:'20px', fontSize:'14px', fontWeight:'bold',
            backgroundColor:'#5a4a00', color:'#ffe07a',
          }}>
            🏁 {streak} / {FINAL_STREAK}
          </span>
        )}
      </div>

      {/* 例示エリア */}
      <div style={{ background:'#1a1a2e', border:'1px solid #444', borderRadius:'12px', padding:'16px 24px', marginBottom:'24px' }}>
        <BlockMath math={String.raw`D\{f \cdot g\} = D(f)\cdot g + f\cdot D(g)`} />

        {/* 前半例：1次式×1次式 */}
        {stage === 'front' && <>
          <BlockMath math={String.raw`\,`} />
          <BlockMath math={String.raw`\begin{aligned}
            D\{(2x+1)(3x-4)\}
            &= D(2x+1)\cdot(3x-4)+(2x+1)\cdot D(3x-4)\\
            &= 2(3x-4)+(2x+1)\cdot 3\\
            &= 6x-8+6x+3\\
            &= 12x-5
          \end{aligned}`} />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'6px', marginTop:'4px' }}>
            <PrepBadge num={2} onClick={() => setPrepNum(2)} />
            <PrepBadge num={3} onClick={() => setPrepNum(3)} />
          </div>
        </>}

        {/* 後半例：高次あり */}
        {stage === 'back' && <>
          <BlockMath math={String.raw`\,`} />
          <BlockMath math={String.raw`\begin{aligned}
            D\{(x^2-1)(3x+2)\}
            &= D(x^2-1)\cdot(3x+2)+(x^2-1)\cdot D(3x+2)\\
            &= 2x(3x+2)+(x^2-1)\cdot 3\\
            &= 6x^2+4x+3x^2-3\\
            &= 9x^2+4x-3
          \end{aligned}`} />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'6px', marginTop:'4px' }}>
            <PrepBadge num={2} onClick={() => setPrepNum(2)} />
            <PrepBadge num={3} onClick={() => setPrepNum(3)} />
          </div>
        </>}
      </div>

      {/* 問題エリア */}
      <div style={{ background:'#0d2137', border:'2px solid #4db8ff', borderRadius:'12px', padding:'16px 24px', marginBottom:'16px' }}>

        {/* Stage1：穴埋め3か所 */}
        {scaffold === 1 && (<>
          {/* 1行目：公式適用 */}
          <div style={{ overflowX:'auto' }}>
            <BlockMath math={`${problem.q}=D(${problem.fStr})\\cdot(${problem.gStr})+(${problem.fStr})\\cdot D(${problem.gStr})`} />
          </div>

          {/* 2行目：?1 と D(g)の値を埋め込み */}
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px', margin:'6px 0 6px 24px' }}>
            <span style={{ color:'#ccc', fontSize:'18px' }}>=</span>
            <BlankBox
              value={inputs[1]} status={blankSt[1]}
              active={activeBlank===1 && blankSt[1]!=='correct'}
              onClick={() => { if (blankSt[1]!=='correct') setActiveBlank(1) }}
            />
            <InlineMath math={`\\cdot(${problem.gStr})+(${problem.fStr})\\cdot(${problem.dgStr})`} />
            {blankSt[1]==='wrong'   && <span style={{ fontSize:'20px' }}>🔄</span>}
            {blankSt[1]==='correct' && <span style={{ fontSize:'18px' }}>⭕</span>}
          </div>

          {/* 3行目：term1 は表示済み、?2 を入力 */}
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px', margin:'6px 0 6px 24px' }}>
            <span style={{ color:'#ccc', fontSize:'18px' }}>=</span>
            <InlineMath math={problem.term1Str + '+'} />
            <BlankBox
              value={inputs[2]} status={blankSt[2]}
              active={activeBlank===2 && blankSt[2]!=='correct'}
              onClick={() => { if (blankSt[2]!=='correct') setActiveBlank(2) }}
            />
            {blankSt[2]==='wrong'   && <span style={{ fontSize:'20px' }}>🔄</span>}
            {blankSt[2]==='correct' && <span style={{ fontSize:'18px' }}>⭕</span>}
          </div>

          {/* 4行目：?3（最終答え） */}
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px', margin:'6px 0 6px 24px' }}>
            <span style={{ color:'#ccc', fontSize:'18px' }}>=</span>
            <BlankBox
              value={inputs[3]} status={blankSt[3]}
              active={activeBlank===3 && blankSt[3]!=='correct'}
              onClick={() => { if (blankSt[3]!=='correct') setActiveBlank(3) }}
            />
            {blankSt[3]==='wrong'   && <span style={{ fontSize:'20px' }}>🔄</span>}
            {blankSt[3]==='correct' && <span style={{ fontSize:'18px' }}>⭕</span>}
          </div>
        </>)}

        {/* Stage2：公式ヒントあり＋最終答えだけ入力 */}
        {scaffold === 2 && (<>
          <div style={{ overflowX:'auto' }}>
            <BlockMath math={`${problem.q}=D(${problem.fStr})\\cdot(${problem.gStr})+(${problem.fStr})\\cdot D(${problem.gStr})`} />
          </div>
          <BlockMath math={`${problem.q}=\\,?`} />
        </>)}

        {/* Stage3：問題だけ */}
        {scaffold === 3 && (
          <BlockMath math={`${problem.q}=\\,?`} />
        )}
      </div>

      {/* Stage2・3 の入力プレビュー */}
      {scaffold !== 1 && !locked && (
        <div style={{ marginBottom:'8px' }}>
          <CaretGuide />
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
            <span style={{ color:'#4db8ff', fontSize:'18px' }}>=</span>
            <div style={singleBoxStyle(msg==='❌')}>{answer || '?'}</div>
            {answer && (<>
              <span style={{ color:'#888', fontSize:'14px' }}>→</span>
              <div style={{ background:'#1a2e1a', border:'1.5px solid #4dff88', borderRadius:'6px', padding:'4px 12px', color:'#88ff88', minWidth:'60px', textAlign:'center' }}>
                <InlineMath math={toKatex(answer)} />
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* 判定メッセージ（Stage2・3） */}
      {scaffold !== 1 && (
        <div style={{ textAlign:'center', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {msg && (
            <div>
              <span style={{ fontSize:'48px' }}>{msg}</span>
              {msg==='❌' && <div style={{ fontSize:'32px', marginTop:'2px' }}>🔄</div>}
            </div>
          )}
        </div>
      )}

      {/* キーボード / Next ボタン */}
      {scaffold === 1 ? (
        allCorrect ? (
          <div style={{ textAlign:'center', marginTop:'8px' }}>
            <button onClick={advance} style={{
              padding:'14px 40px', fontSize:'20px', borderRadius:'10px',
              border:'none', backgroundColor:'#1a6ef5', color:'white', cursor:'pointer', fontWeight:'bold',
            }}>Next ▶</button>
          </div>
        ) : (
          <>
            <CaretGuide />
            <NumKeyboard onKey={kb1.key} onDelete={kb1.del} onEnter={kb1.enter} />
          </>
        )
      ) : (
        locked ? (
          <div style={{ textAlign:'center', marginTop:'8px' }}>
            <button onClick={advance} style={{
              padding:'14px 40px', fontSize:'20px', borderRadius:'10px',
              border:'none', backgroundColor:'#1a6ef5', color:'white', cursor:'pointer', fontWeight:'bold',
            }}>Next ▶</button>
          </div>
        ) : (
          <NumKeyboard onKey={kb2.key} onDelete={kb2.del} onEnter={kb2.enter} />
        )
      )}

      {/* Homeボタン */}
      <div style={{ marginTop:'24px', textAlign:'center' }}>
        <button onClick={() => navigate('/')} style={{
          padding:'12px 28px', fontSize:'16px', borderRadius:'10px',
          border:'1px solid #555', backgroundColor:'transparent', color:'#aaa', cursor:'pointer',
        }}>← Home</button>
      </div>

      {prepNum !== null && <PrepPopup num={prepNum} onClose={() => setPrepNum(null)} />}
    </div>
  )
}
