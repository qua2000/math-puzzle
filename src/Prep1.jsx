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

// ────────────────────────────────────────────────
// 問題データ
//
// answerType:
//   'int'      → 整数1ボックス（例: 1000, -27, 1）
//   'frac'     → 分数（分子/分母ボックス）（例: 1/125）
//   'exp'      → 底+指数ボックス（例: z^8）
//   'coefexp'  → 係数+底+指数ボックス（例: 3x^3, -2b^3）
//   'str'      → 文字列入力（例: c^6z^4）
//   'fracexp'  → 分数（分子・分母それぞれに底+指数）（例: 7^2/3^2）
//   'expfrac'  → 底+分数指数（例: a^(1/4), 11^(1/2)）
//
// answer: 正解文字列（normalize後に比較）
//   exp型:     "底,指数" 形式（例: "z,8"）
//   coefexp型: "係数,底,指数" 形式（例: "3,x,3"）
//   fracexp型: "分子底,分子指数,分母底,分母指数" 形式（例: "7,2,3,2"）
//   expfrac型: "底,分子,分母" 形式（例: "a,1,4"）
//   frac型:    "分子/分母" 形式（例: "1/125"）
//   int型:     整数文字列（例: "1000"）
//   str型:     文字列そのまま（例: "c^6z^4"）
// ────────────────────────────────────────────────
const allProblems = [

  // #1: 10のべき乗
  {
    answerType: 'int',
    samples: [
      '10^2=100',
      '10^4=10000',
      '10^5=100000',
    ],
    prompt: '10^3=',
    answer: '1000',
  },

  // #2: (1/n)^m
  {
    answerType: 'frac',
    samples: [
      '\\left(\\dfrac{1}{2}\\right)^2=\\dfrac{1}{4}',
      '\\left(\\dfrac{1}{3}\\right)^3=\\dfrac{1}{27}',
      '(0.2)^2=0.04',
    ],
    prompt: '\\left(\\dfrac{1}{5}\\right)^3=',
    answer: '1/125',
  },

  // #3: (a/b)^2 vs a/b^2 vs a^2/b
  {
    answerType: 'frac',
    samples: [
      '\\left(\\dfrac{2}{3}\\right)^2=\\dfrac{4}{9}',
      '\\dfrac{2}{3^2}=\\dfrac{2}{9}',
      '\\dfrac{2^2}{3}=\\dfrac{4}{3}',
    ],
    prompt: '\\dfrac{3}{5^2}=',
    answer: '3/25',
  },

  // #4: a^0=1
  {
    answerType: 'int',
    samples: [
      '3^0=1',
      'a^0=1',
      '\\left(\\dfrac{1}{3}\\right)^0=1',
    ],
    prompt: 'x^0=',
    answer: '1',
  },

  // #5: 負の数の偶数乗
  {
    answerType: 'int',
    samples: [
      '(-2)^2=4',
      '(-2)^3=-8',
      '(-3)^2=9',
    ],
    prompt: '(-3)^3=',
    answer: '-27',
  },

  // #6: 負の数の奇数乗
  {
    answerType: 'int',
    samples: [
      '(-2)^3=-8',
      '(-1)^5=-1',
      '(-3)^3=-27',
    ],
    prompt: '(-2)^5=',
    answer: '-32',
  },

  // #7: a^(-n) = 1/a^n （整数底）
  {
    answerType: 'frac',
    samples: [
      '2^{-1}=\\dfrac{1}{2}',
      '2^{-2}=\\dfrac{1}{4}',
      '3^{-1}=\\dfrac{1}{3}',
    ],
    prompt: '3^{-2}=',
    answer: '1/9',
  },

  // #8: (1/a)^(-n) = a^n
  {
    answerType: 'int',
    samples: [
      '\\left(\\dfrac{1}{2}\\right)^{-1}=2',
      '\\left(\\dfrac{1}{2}\\right)^{-2}=4',
      '\\left(\\dfrac{1}{3}\\right)^{-1}=3',
    ],
    prompt: '\\left(\\dfrac{1}{3}\\right)^{-2}=',
    answer: '9',
  },

  // #9: (a/b)^(-n) = b^n/a^n （分子・分母が指数）
  {
    answerType: 'fracexp',
    samples: [
      '\\left(\\dfrac{5}{7}\\right)^{-1}=\\dfrac{7}{5}',
      '\\left(\\dfrac{3}{5}\\right)^{-2}=\\dfrac{5^2}{3^2}',
      '\\left(\\dfrac{1}{3}\\right)^{-3}=3^3',
    ],
    prompt: '\\left(\\dfrac{3}{7}\\right)^{-2}=',
    answer: '7,2,3,2',
  },

  // #10: (a^m)^n = a^(mn)
  {
    answerType: 'exp',
    samples: [
      '(2^2)^3=2^6',
      '(3^3)^4=3^{12}',
      '(2^5)^2=2^{10}',
    ],
    prompt: '(3^2)^4=',
    answer: '3,8',
  },

  // #11: a^m × a^n = a^(m+n)
  {
    answerType: 'exp',
    samples: [
      '2^2\\times 2^3=2^5',
      '3^5\\times 3=3^6',
      '5^3\\times 5^6=5^9',
    ],
    prompt: '4\\times 4^2=',
    answer: '4,3',
  },

  // #12: a^m × a^(-n) = a^(m-n)
  {
    answerType: 'exp',
    samples: [
      '2^{-3}\\times 2=2^{-3+1}=2^{-2}',
      '3^2\\times 3^{-4}=3^{2-4}=3^{-2}',
      '4\\times 4^{-5}=4^{1-5}=4^{-4}',
    ],
    prompt: '5^3\\times 5^{-2}=',
    answer: '5,1',
  },

  // #13: c×c×c×c×c = c^5
  {
    answerType: 'exp',
    samples: [
      'x\\times x=x^2',
      'x\\times x\\times x=x^3',
      'a\\times a\\times a=a^3',
    ],
    prompt: 'c\\times c\\times c\\times c\\times c=',
    answer: 'c,5',
  },

  // #14: a×b×b×b×c = ab^3c （tripleexp: 底×3 + 指数×3）
  {
    answerType: 'tripleexp',
    samples: [
      'a\\times a\\times b=a^2b',
      'b\\times b\\times c\\times c=b^2c^2',
      'a\\times c\\times a\\times c=a^2c^2',
    ],
    prompt: 'a\\times b\\times b\\times b\\times c=',
    // "底1,指数1,底2,指数2,底3,指数3" 形式。指数1,3は1（省略可）
    answer: 'a,1,b,3,c,1',
    altAnswers: ['a,1,b,3,c,1'],
    answerDisplay: 'ab^{3}c',
  },

  // #15: y×y×y = y^3
  {
    answerType: 'exp',
    samples: [
      'm\\times m=m^2',
      'm\\times m\\times m=m^3',
      'x\\times x\\times x\\times x=x^4',
    ],
    prompt: 'y\\times y\\times y=',
    answer: 'y,3',
  },

  // #16: x×x×3×x = 3x^3 （係数あり）
  {
    answerType: 'coefexp',
    samples: [
      'a\\times x\\times x=ax^2',
      'y\\times b\\times y\\times y=by^3',
      'z\\times z\\times d\\times c=cdz^2',
    ],
    prompt: 'x\\times x\\times 3\\times x=',
    answer: '3,x,3',
  },

  // #17: (-2)×b×b×b = -2b^3 （負の係数あり）
  {
    answerType: 'coefexp',
    samples: [
      '3\\times x\\times 2\\times x=6x^2',
      'z\\times 2\\times z\\times\\dfrac{1}{2}=z^2',
      'a\\times(-1)\\times a=-a^2',
    ],
    prompt: '(-2)\\times b\\times b\\times b=',
    answer: '-2,b,3',
  },

  // #18: a^m × a^n = a^(m+n) （文字式）
  {
    answerType: 'exp',
    samples: [
      'x^5\\times x^2=x^7',
      'y^3\\times y=y^4',
      'z^2\\times z^7=z^9',
    ],
    prompt: 'a^4\\times a^2=',
    answer: 'a,6',
  },

  // #19: a^m ÷ a^n = a^(m-n) （負の指数）
  {
    answerType: 'exp',
    samples: [
      'x^5\\div x^2=x^3',
      'y^3\\div y=y^2',
      'z^2\\div z^7=z^{-5}',
    ],
    prompt: 'a^2\\div a^4=',
    answer: 'a,-2',
  },

  // #20: 係数あり × 文字式
  {
    answerType: 'coefexp',
    samples: [
      '2x^2\\times 5x=10x^3',
      'y^3\\times 2y=2y^4',
      '8a^9\\times 9a^2=72a^{11}',
    ],
    prompt: '2z^2\\times 6z^3=',
    answer: '12,z,5',
  },

  // #21: (x^m)^n = x^(mn)
  {
    answerType: 'exp',
    samples: [
      '(x^2)^3=x^6',
      '(y^3)^2=y^6',
      '(a^5)^3=a^{15}',
    ],
    prompt: '(z^2)^4=',
    answer: 'z,8',
  },

  // #22: (x^a y^b)^n （dualexp: 底×2 + 指数×2）
  {
    answerType: 'dualexp',
    samples: [
      '(x^2y^3)^2=x^4y^6',
      '(a^3y)^3=a^9y^3',
      '(2^2b^3)^2=2^4b^6',
    ],
    prompt: '(c^3z^2)^2=',
    // "底1,指数1,底2,指数2" 形式
    answer: 'c,6,z,4',
    answerDisplay: 'c^{6}z^{4}',
  },

  // #23: 1/x^n = x^(-n)
  {
    answerType: 'exp',
    samples: [
      '\\dfrac{1}{x}=x^{-1}',
      '\\dfrac{1}{y^2}=y^{-2}',
      '\\dfrac{1}{a^3}=a^{-3}',
    ],
    prompt: '\\dfrac{1}{z^6}=',
    answer: 'z,-6',
  },

  // #24: a^m / a^n = a^(m-n)
  {
    answerType: 'exp',
    samples: [
      'a^5\\div a^2=a^3',
      '\\dfrac{a^5}{a^2}=a^3',
      '\\dfrac{x^7}{x^3}=x^4',
    ],
    prompt: '\\dfrac{y^6}{y^2}=',
    answer: 'y,4',
  },

  // #25: (xy)^n （dualexp: 底×2 + 指数×2）
  {
    answerType: 'dualexp',
    samples: [
      '(xy)^2=x^2y^2',
      '(a^2b)^3=a^6b^3',
      '(ax^2)^2=a^2x^4',
    ],
    prompt: '(b^2y)^3=',
    // "底1,指数1,底2,指数2" 形式
    answer: 'b,6,y,3',
    answerDisplay: 'b^{6}y^{3}',
  },

  // #26: (a^m)^n 再確認
  {
    answerType: 'exp',
    samples: [
      '(b^2)^3=b^6',
      '(c^4)^2=c^8',
      '(z^3)^2=z^6',
    ],
    prompt: '(y^2)^5=',
    answer: 'y,10',
  },

  // #27: 指数に変数xが含まれる場合（fixedbaseexp: 底固定・指数欄のみ入力）
  {
    answerType: 'fixedbaseexp',
    fixedBase: '5',           // 表示する固定の底
    samples: [
      '2^x\\times 2=2^{x+1}',
      '3^2\\times 3^{2x}=3^{2x+2}',
      '4^{-5}\\times 4^x=4^{x-5}',
    ],
    prompt: '5^{2x}\\times 5^5=',
    // "底,指数" 形式（底は判定にも使う）
    answer: '5,2x+5',
    answerDisplay: '5^{2x+5}',
  },

  // #28: (√a)^2 = a
  {
    answerType: 'int',
    samples: [
      '(\\sqrt{2})^2=2',
      '(\\sqrt{15})^2=15',
      '(\\sqrt{7})^2=7',
    ],
    prompt: '(\\sqrt{11})^2=',
    answer: '11',
  },

  // #29: √a = a^(1/2) （底+分数指数）
  {
    answerType: 'expfrac',
    samples: [
      '\\sqrt{2}=2^{\\frac{1}{2}}',
      '\\sqrt{15}=15^{\\frac{1}{2}}',
      '\\sqrt{7}=7^{\\frac{1}{2}}',
    ],
    prompt: '\\sqrt{11}=',
    answer: '11,1,2',
  },

  // #30: n乗根 = a^(1/n) （底+分数指数）
  {
    answerType: 'expfrac',
    samples: [
      '\\sqrt[2]{x}=\\sqrt{x}=x^{\\frac{1}{2}}',
      '\\sqrt[3]{y}=y^{\\frac{1}{3}}',
      '\\sqrt[5]{z}=z^{\\frac{1}{5}}',
    ],
    prompt: '\\sqrt[4]{a}=',
    answer: 'a,1,4',
  },

]

// ────────────────────────────────────────────────
// 入力ボックス共通スタイル
// ────────────────────────────────────────────────
const boxActive   = { background:'#163a5e', border:'2px solid #4db8ff', borderRadius:'6px', minWidth:'36px', padding:'2px 8px', textAlign:'center', color:'#4db8ff', fontWeight:'bold', fontSize:'20px', cursor:'pointer', lineHeight:'1.4' }
const boxInactive = { background:'#1a1a2e', border:'1.5px dashed #555', borderRadius:'6px', minWidth:'36px', padding:'2px 8px', textAlign:'center', color:'#888', fontWeight:'bold', fontSize:'20px', cursor:'pointer', lineHeight:'1.4' }
const boxDone     = { background:'#1a2e1a', border:'1.5px solid #4dff88', borderRadius:'6px', minWidth:'36px', padding:'2px 8px', textAlign:'center', color:'#88ff88', fontWeight:'bold', fontSize:'20px', cursor:'pointer', lineHeight:'1.4' }

function boxStyle(isFocus, isDone) {
  return isFocus ? boxActive : isDone ? boxDone : boxInactive
}

// ────────────────────────────────────────────────
// 底+指数 × 2セット（例: c^6 z^4）
// focus: 'b1'|'e1'|'b2'|'e2'
// ────────────────────────────────────────────────
const DualExpInput = ({ b1,e1,b2,e2, focus, setFocus }) => {
  const base = (f,v) => (
    <div onClick={()=>setFocus(f)} style={{ ...boxStyle(focus===f, v!==''&&focus!==f), minWidth:'28px' }}>{v||'?'}</div>
  )
  const exp = (f,v) => (
    <div onClick={()=>setFocus(f)} style={{ ...boxStyle(focus===f, v!==''&&focus!==f), minWidth:'22px', fontSize:'13px', padding:'0px 4px', marginTop:'-6px' }}>{v||'?'}</div>
  )
  return (
    <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'6px', verticalAlign:'middle' }}>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {base('b1',b1)}{exp('e1',e1)}
      </div>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {base('b2',b2)}{exp('e2',e2)}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// 底+指数 × 3セット（例: a^1 b^3 c^1）
// focus: 'b1'|'e1'|'b2'|'e2'|'b3'|'e3'
// ────────────────────────────────────────────────
const TripleExpInput = ({ b1,e1,b2,e2,b3,e3, focus, setFocus }) => {
  const base = (f,v) => (
    <div onClick={()=>setFocus(f)} style={{ ...boxStyle(focus===f, v!==''&&focus!==f), minWidth:'28px' }}>{v||'?'}</div>
  )
  const exp = (f,v) => (
    <div onClick={()=>setFocus(f)} style={{ ...boxStyle(focus===f, v!==''&&focus!==f), minWidth:'22px', fontSize:'13px', padding:'0px 4px', marginTop:'-6px' }}>{v||'?'}</div>
  )
  return (
    <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'6px', verticalAlign:'middle' }}>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {base('b1',b1)}{exp('e1',e1)}
      </div>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {base('b2',b2)}{exp('e2',e2)}
      </div>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {base('b3',b3)}{exp('e3',e3)}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// 固定底 + 指数ボックス（例: 5^[????]）
// focus: 'exp' のみ
// ────────────────────────────────────────────────
const FixedBaseExpInput = ({ fixedBase, expStr, focus, onFocusExp }) => (
  <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'2px', verticalAlign:'middle' }}>
    <div style={{ ...boxInactive, minWidth:'28px', border:'none', background:'transparent', color:'#eee' }}>{fixedBase}</div>
    <div onClick={onFocusExp} style={{ ...boxStyle(focus==='exp', expStr!==''&&focus!=='exp'), minWidth:'40px', fontSize:'14px', padding:'0px 4px', marginTop:'-6px' }}>{expStr||'?'}</div>
  </div>
)

// ────────────────────────────────────────────────
// 分数の分子・分母ボックス（WarmUp3と同じ）
// ────────────────────────────────────────────────
const FracInput = ({ numStr, denStr, focus, onFocusNum, onFocusDen }) => (
  <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:'2px', verticalAlign:'middle' }}>
    <div onClick={onFocusNum} style={boxStyle(focus==='num', numStr!==''&&focus!=='num')}>{numStr||'?'}</div>
    <div style={{ width:'100%', height:'2px', background:'#aaa', minWidth:'44px' }} />
    <div onClick={onFocusDen} style={boxStyle(focus==='den', denStr!==''&&focus!=='den')}>{denStr||'?'}</div>
  </div>
)

// ────────────────────────────────────────────────
// 底+指数ボックス（例: z^8）
// focus: 'base' | 'exp'
// ────────────────────────────────────────────────
const ExpInput = ({ baseStr, expStr, focus, onFocusBase, onFocusExp }) => (
  <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'2px', verticalAlign:'middle' }}>
    <div onClick={onFocusBase} style={{ ...boxStyle(focus==='base', baseStr!==''&&focus!=='base'), minWidth:'32px' }}>{baseStr||'?'}</div>
    <div onClick={onFocusExp}  style={{ ...boxStyle(focus==='exp',  expStr!==''&&focus!=='exp'), minWidth:'24px', fontSize:'14px', padding:'0px 4px', marginTop:'-6px' }}>{expStr||'?'}</div>
  </div>
)

// ────────────────────────────────────────────────
// 係数+底+指数ボックス（例: 3x^3）
// focus: 'coef' | 'base' | 'exp'
// ────────────────────────────────────────────────
const CoefExpInput = ({ coefStr, baseStr, expStr, focus, onFocusCoef, onFocusBase, onFocusExp }) => (
  <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'2px', verticalAlign:'middle' }}>
    <div onClick={onFocusCoef} style={{ ...boxStyle(focus==='coef', coefStr!==''&&focus!=='coef'), minWidth:'32px' }}>{coefStr||'?'}</div>
    <div onClick={onFocusBase} style={{ ...boxStyle(focus==='base', baseStr!==''&&focus!=='base'), minWidth:'28px' }}>{baseStr||'?'}</div>
    <div onClick={onFocusExp}  style={{ ...boxStyle(focus==='exp',  expStr!==''&&focus!=='exp'), minWidth:'24px', fontSize:'14px', padding:'0px 4px', marginTop:'-6px' }}>{expStr||'?'}</div>
  </div>
)

// ────────────────────────────────────────────────
// 分数指数ボックス（例: a^(1/4)）
// 底ボックス + 上付き分数（分子/分母）
// focus: 'base' | 'num' | 'den'
// ────────────────────────────────────────────────
const ExpFracInput = ({ baseStr, numStr, denStr, focus, onFocusBase, onFocusNum, onFocusDen }) => (
  <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'2px', verticalAlign:'middle' }}>
    <div onClick={onFocusBase} style={{ ...boxStyle(focus==='base', baseStr!==''&&focus!=='base'), minWidth:'32px' }}>{baseStr||'?'}</div>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'-6px', gap:'1px' }}>
      <div onClick={onFocusNum} style={{ ...boxStyle(focus==='num', numStr!==''&&focus!=='num'), minWidth:'22px', fontSize:'13px', padding:'1px 4px' }}>{numStr||'?'}</div>
      <div style={{ width:'100%', height:'1.5px', background:'#aaa', minWidth:'22px' }} />
      <div onClick={onFocusDen} style={{ ...boxStyle(focus==='den', denStr!==''&&focus!=='den'), minWidth:'22px', fontSize:'13px', padding:'1px 4px' }}>{denStr||'?'}</div>
    </div>
  </div>
)

// ────────────────────────────────────────────────
// 分数（分子・分母がそれぞれ底+指数）（例: 7²/3²）
// focus: 'nbase'|'nexp'|'dbase'|'dexp'
// ────────────────────────────────────────────────
const FracExpInput = ({ nBaseStr, nExpStr, dBaseStr, dExpStr, focus, setFocus }) => {
  const box = (f, val) => (
    <div onClick={() => setFocus(f)} style={{ ...boxStyle(focus===f, val!==''&&focus!==f), minWidth:'24px', padding:'2px 5px' }}>{val||'?'}</div>
  )
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:'2px', verticalAlign:'middle' }}>
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {box('nbase', nBaseStr)}
        <div style={{ ...boxStyle(focus==='nexp', nExpStr!==''&&focus!=='nexp'), minWidth:'20px', fontSize:'13px', padding:'0px 3px', marginTop:'-5px' }} onClick={() => setFocus('nexp')}>{nExpStr||'?'}</div>
      </div>
      <div style={{ width:'80px', height:'2px', background:'#aaa' }} />
      <div style={{ display:'inline-flex', alignItems:'flex-start', gap:'1px' }}>
        {box('dbase', dBaseStr)}
        <div style={{ ...boxStyle(focus==='dexp', dExpStr!==''&&focus!=='dexp'), minWidth:'20px', fontSize:'13px', padding:'0px 3px', marginTop:'-5px' }} onClick={() => setFocus('dexp')}>{dExpStr||'?'}</div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// キーボード
// mode: 'num'(数字のみ) | 'alpha'(数字+文字+記号)
// ────────────────────────────────────────────────
const NumKeyboard = ({ onKey, onDelete, onEnter, mode = 'num' }) => {
  const rowStyle  = { display:'flex', gap:'5px', justifyContent:'center', marginBottom:'5px' }
  const btnStyle  = (color) => ({
    padding:'11px 4px', minWidth:'42px', flex:1,
    maxWidth: color==='enter' ? '110px' : '58px',
    borderRadius:'8px',
    border:`1.5px solid ${color==='del'?'#ff666655':color==='enter'?'#44ff8855':'#4db8ff55'}`,
    background: color==='del'?'#3a1a1a':color==='enter'?'#1a4a1a':'#1a2a3e',
    color: color==='del'?'#ff9999':color==='enter'?'#88ff88':'white',
    fontSize:'14px', fontWeight:'bold', cursor:'pointer', fontFamily:'sans-serif',
  })
  const smBtnStyle = (color) => ({
    ...btnStyle(color),
    padding:'8px 2px', minWidth:'28px', maxWidth:'42px', fontSize:'13px',
  })
  return (
    <div style={{ marginTop:'16px' }}>
      <div style={rowStyle}>
        {['1','2','3','4','5','6','7','8','9','0'].map(n => (
          <button key={n} style={btnStyle('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      {mode === 'alpha' && (
        <>
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
            {['u','v','w','x','y','z','-','+','^'].map(c => (
              <button key={c} style={smBtnStyle('num')} onClick={() => onKey(c)}>{c}</button>
            ))}
          </div>
        </>
      )}
      {mode === 'num' && (
        <div style={rowStyle}>
          <button style={{ ...btnStyle('num'), maxWidth:'58px' }} onClick={() => onKey('-')}>−</button>
        </div>
      )}
      <div style={rowStyle}>
        <button style={{ ...btnStyle('del'), flex:1, maxWidth:'80px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btnStyle('enter'), flex:2, maxWidth:'160px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// 答え表示文字列（不正解時に表示）→ KaTeX文字列で返す
// ────────────────────────────────────────────────
function getAnswerKatex(problem) {
  const a = problem.answer
  switch (problem.answerType) {
    case 'int':     return a
    case 'frac': {
      const [n, d] = a.split('/')
      return d ? `\\dfrac{${n}}{${d}}` : a
    }
    case 'exp': {
      const [b, e] = a.split(',')
      return `${b}^{${e}}`
    }
    case 'coefexp': {
      const [c, b, e] = a.split(',')
      return `${c}${b}^{${e}}`
    }
    case 'str':     return problem.answerDisplay || a
    case 'fracexp': {
      const [nb, ne, db, de] = a.split(',')
      return `\\dfrac{${nb}^{${ne}}}{${db}^{${de}}}`
    }
    case 'expfrac': {
      const [b, n, d] = a.split(',')
      return `${b}^{\\frac{${n}}{${d}}}`
    }
    case 'dualexp': {
      const [b1,e1,b2,e2] = a.split(',')
      return `${b1}^{${e1}}${b2}^{${e2}}`
    }
    case 'tripleexp': {
      const [b1,e1,b2,e2,b3,e3] = a.split(',')
      // 指数が1の場合は省略して表示
      const s1 = e1==='1' ? b1 : `${b1}^{${e1}}`
      const s2 = e2==='1' ? b2 : `${b2}^{${e2}}`
      const s3 = e3==='1' ? b3 : `${b3}^{${e3}}`
      return `${s1}${s2}${s3}`
    }
    case 'fixedbaseexp': {
      const [b, e] = a.split(',')
      return `${b}^{${e}}`
    }
    default: return a
  }
}

// ────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────
export default function Prep1() {
  const navigate = useNavigate()
  const [idx,     setIdx]     = useState(0)
  const [message, setMessage] = useState('')
  const [locked,  setLocked]  = useState(false)
  const [score,   setScore]   = useState({ correct:0, total:0 })

  // 各型に対応する入力状態
  const [intStr,   setIntStr]   = useState('')         // int
  const [numStr,   setNumStr]   = useState('')         // frac 分子 / expfrac 分子
  const [denStr,   setDenStr]   = useState('')         // frac 分母 / expfrac 分母
  const [baseStr,  setBaseStr]  = useState('')         // exp・expfrac 底
  const [expStr,   setExpStr]   = useState('')         // exp 指数 / fixedbaseexp 指数
  const [coefStr,  setCoefStr]  = useState('')         // coefexp 係数
  const [coefBase, setCoefBase] = useState('')         // coefexp 底
  const [coefExp,  setCoefExp]  = useState('')         // coefexp 指数
  const [strVal,   setStrVal]   = useState('')         // str
  const [nBaseStr, setNBaseStr] = useState('')         // fracexp 分子底
  const [nExpStr,  setNExpStr]  = useState('')         // fracexp 分子指数
  const [dBaseStr, setDBaseStr] = useState('')         // fracexp 分母底
  const [dExpStr,  setDExpStr]  = useState('')         // fracexp 分母指数
  // dualexp / tripleexp 用
  const [b1,setB1] = useState(''); const [e1,setE1] = useState('')
  const [b2,setB2] = useState(''); const [e2,setE2] = useState('')
  const [b3,setB3] = useState(''); const [e3,setE3] = useState('')

  // フォーカス管理
  const [focus, setFocus] = useState('base') // 型によって異なる値

  const problem = allProblems[idx]
  const t = problem.answerType

  // ────── フォーカス初期値 ──────
  const focusInitial = () => {
    if (t === 'int')          return 'int'
    if (t === 'frac')         return 'num'
    if (t === 'exp')          return 'base'
    if (t === 'coefexp')      return 'coef'
    if (t === 'str')          return 'str'
    if (t === 'fracexp')      return 'nbase'
    if (t === 'expfrac')      return 'base'
    if (t === 'dualexp')      return 'b1'
    if (t === 'tripleexp')    return 'b1'
    if (t === 'fixedbaseexp') return 'exp'
    return 'int'
  }

  // ────── リセット ──────
  const resetInput = () => {
    setIntStr(''); setNumStr(''); setDenStr(''); setBaseStr(''); setExpStr('')
    setCoefStr(''); setCoefBase(''); setCoefExp(''); setStrVal('')
    setNBaseStr(''); setNExpStr(''); setDBaseStr(''); setDExpStr('')
    setB1(''); setE1(''); setB2(''); setE2(''); setB3(''); setE3('')
    setFocus(focusInitial())
  }

  // ────── ユーザー入力 → 正規化文字列 ──────
  const getUserAnswer = () => {
    if (t === 'int')          return intStr
    if (t === 'frac')         return numStr && denStr ? `${numStr}/${denStr}` : numStr
    if (t === 'exp')          return `${baseStr},${expStr}`
    if (t === 'coefexp')      return `${coefStr},${coefBase},${coefExp}`
    if (t === 'str')          return strVal
    if (t === 'fracexp')      return `${nBaseStr},${nExpStr},${dBaseStr},${dExpStr}`
    if (t === 'expfrac')      return `${baseStr},${numStr},${denStr}`
    if (t === 'dualexp')      return `${b1},${e1},${b2},${e2}`
    if (t === 'tripleexp')    return `${b1},${e1},${b2},${e2},${b3},${e3}`
    if (t === 'fixedbaseexp') return `${problem.fixedBase},${expStr}`
    return ''
  }

  // ────── キー入力 ──────
  const handleKey = (val) => {
    if (locked) return
    const append = (setter) => setter(s => s + val)
    if (t === 'int')     { append(setIntStr); return }
    if (t === 'frac')    { focus==='num' ? append(setNumStr) : append(setDenStr); return }
    if (t === 'exp')     { focus==='base' ? append(setBaseStr) : append(setExpStr); return }
    if (t === 'coefexp') {
      if (focus==='coef') append(setCoefStr)
      else if (focus==='base') append(setCoefBase)
      else append(setCoefExp)
      return
    }
    if (t === 'str')     { append(setStrVal); return }
    if (t === 'fracexp') {
      if (focus==='nbase') append(setNBaseStr)
      else if (focus==='nexp') append(setNExpStr)
      else if (focus==='dbase') append(setDBaseStr)
      else append(setDExpStr)
      return
    }
    if (t === 'expfrac') {
      if (focus==='base') append(setBaseStr)
      else if (focus==='num') append(setNumStr)
      else append(setDenStr)
      return
    }
    if (t === 'dualexp') {
      if (focus==='b1') append(setB1)
      else if (focus==='e1') append(setE1)
      else if (focus==='b2') append(setB2)
      else append(setE2)
      return
    }
    if (t === 'tripleexp') {
      if (focus==='b1') append(setB1)
      else if (focus==='e1') append(setE1)
      else if (focus==='b2') append(setB2)
      else if (focus==='e2') append(setE2)
      else if (focus==='b3') append(setB3)
      else append(setE3)
      return
    }
    if (t === 'fixedbaseexp') { append(setExpStr); return }
  }

  // ────── 削除 ──────
  const handleDelete = () => {
    if (locked) return
    const del = (getter, setter) => { if (getter.length > 0) setter(s => s.slice(0,-1)) }
    if (t === 'int')     { del(intStr, setIntStr); return }
    if (t === 'frac')    {
      if (focus==='num') del(numStr, setNumStr)
      else { if (denStr.length>0) del(denStr,setDenStr); else setFocus('num') }
      return
    }
    if (t === 'exp')     {
      if (focus==='base') del(baseStr,setBaseStr)
      else { if (expStr.length>0) del(expStr,setExpStr); else setFocus('base') }
      return
    }
    if (t === 'coefexp') {
      if (focus==='coef') del(coefStr,setCoefStr)
      else if (focus==='base') { if (coefBase.length>0) del(coefBase,setCoefBase); else setFocus('coef') }
      else { if (coefExp.length>0) del(coefExp,setCoefExp); else setFocus('base') }
      return
    }
    if (t === 'str')     { del(strVal, setStrVal); return }
    if (t === 'fracexp') {
      if (focus==='nbase') del(nBaseStr,setNBaseStr)
      else if (focus==='nexp') { if (nExpStr.length>0) del(nExpStr,setNExpStr); else setFocus('nbase') }
      else if (focus==='dbase') { if (dBaseStr.length>0) del(dBaseStr,setDBaseStr); else setFocus('nexp') }
      else { if (dExpStr.length>0) del(dExpStr,setDExpStr); else setFocus('dbase') }
      return
    }
    if (t === 'expfrac') {
      if (focus==='base') del(baseStr,setBaseStr)
      else if (focus==='num') { if (numStr.length>0) del(numStr,setNumStr); else setFocus('base') }
      else { if (denStr.length>0) del(denStr,setDenStr); else setFocus('num') }
      return
    }
    if (t === 'dualexp') {
      if (focus==='b1') del(b1,setB1)
      else if (focus==='e1') { if (e1.length>0) del(e1,setE1); else setFocus('b1') }
      else if (focus==='b2') { if (b2.length>0) del(b2,setB2); else setFocus('e1') }
      else { if (e2.length>0) del(e2,setE2); else setFocus('b2') }
      return
    }
    if (t === 'tripleexp') {
      if (focus==='b1') del(b1,setB1)
      else if (focus==='e1') { if (e1.length>0) del(e1,setE1); else setFocus('b1') }
      else if (focus==='b2') { if (b2.length>0) del(b2,setB2); else setFocus('e1') }
      else if (focus==='e2') { if (e2.length>0) del(e2,setE2); else setFocus('b2') }
      else if (focus==='b3') { if (b3.length>0) del(b3,setB3); else setFocus('e2') }
      else { if (e3.length>0) del(e3,setE3); else setFocus('b3') }
      return
    }
    if (t === 'fixedbaseexp') { del(expStr,setExpStr); return }
  }

  // ────── 判定 ──────
  const handleEnter = () => {
    if (locked) return
    const userAns = getUserAnswer()
    if (!userAns || userAns.includes(',') && userAns.endsWith(',')) return
    const normUser = normalize(userAns)

    // tripleexp型は指数欄が空の場合も「1」として比較する
    let normAns = normalize(problem.answer)
    let extraCheck = false
    if (t === 'tripleexp') {
      const fill = (v) => v === '' ? '1' : v
      const filled = `${b1},${fill(e1)},${b2},${fill(e2)},${b3},${fill(e3)}`
      extraCheck = normalize(filled) === normAns
    }

    const isCorrect = normUser === normAns
      || (problem.altAnswers || []).some(alt => normUser === normalize(alt))
      || extraCheck
    setMessage(isCorrect ? '⭕' : '❌')
    setScore(s => ({ correct: s.correct+(isCorrect?1:0), total: s.total+1 }))
    setLocked(true)
  }

  // ────── 次の問題 ──────
  const handleNext = () => {
    setIdx(i => (i+1) % allProblems.length)
    setLocked(false)
    setMessage('')
    resetInput()
  }

  // ────── キーボードモード ──────
  // str・exp・coefexp はアルファベットが必要 → 'alpha'
  // expfrac・fracexpは底にアルファベットが入る → 'alpha'
  // int・frac は数字のみ → 'num'
  const kbMode = (t === 'str' || t === 'exp' || t === 'coefexp' || t === 'expfrac' || t === 'fracexp' || t === 'dualexp' || t === 'tripleexp' || t === 'fixedbaseexp') ? 'alpha' : 'num'

  // ────── 入力ボックス描画 ──────
  const renderInput = () => {
    if (t === 'int') return (
      <div style={{ ...boxActive, display:'inline-block', minWidth:'60px', fontSize:'22px' }}>
        {intStr||'?'}
      </div>
    )
    if (t === 'frac') return (
      <FracInput numStr={numStr} denStr={denStr} focus={focus}
        onFocusNum={()=>setFocus('num')} onFocusDen={()=>setFocus('den')} />
    )
    if (t === 'exp') return (
      <ExpInput baseStr={baseStr} expStr={expStr} focus={focus}
        onFocusBase={()=>setFocus('base')} onFocusExp={()=>setFocus('exp')} />
    )
    if (t === 'coefexp') return (
      <CoefExpInput coefStr={coefStr} baseStr={coefBase} expStr={coefExp} focus={focus}
        onFocusCoef={()=>setFocus('coef')} onFocusBase={()=>setFocus('base')} onFocusExp={()=>setFocus('exp')} />
    )
    if (t === 'str') return (
      <div style={{ ...boxActive, display:'inline-block', minWidth:'80px', fontSize:'18px', letterSpacing:'1px' }}>
        {strVal||'?'}
      </div>
    )
    if (t === 'fracexp') return (
      <FracExpInput nBaseStr={nBaseStr} nExpStr={nExpStr} dBaseStr={dBaseStr} dExpStr={dExpStr}
        focus={focus} setFocus={setFocus} />
    )
    if (t === 'expfrac') return (
      <ExpFracInput baseStr={baseStr} numStr={numStr} denStr={denStr} focus={focus}
        onFocusBase={()=>setFocus('base')} onFocusNum={()=>setFocus('num')} onFocusDen={()=>setFocus('den')} />
    )
    if (t === 'dualexp') return (
      <DualExpInput b1={b1} e1={e1} b2={b2} e2={e2} focus={focus} setFocus={setFocus} />
    )
    if (t === 'tripleexp') return (
      <TripleExpInput b1={b1} e1={e1} b2={b2} e2={e2} b3={b3} e3={e3} focus={focus} setFocus={setFocus} />
    )
    if (t === 'fixedbaseexp') return (
      <FixedBaseExpInput fixedBase={problem.fixedBase} expStr={expStr} focus={focus} onFocusExp={()=>setFocus('exp')} />
    )
    return null
  }

  return (
    <div style={{ padding:'20px', maxWidth:'700px', margin:'0 auto', fontFamily:'sans-serif' }}>

      <h1 style={{ textAlign:'center', marginBottom:'4px' }}>🧩 Prep 1</h1>

      <div style={{ textAlign:'center', color:'#aaa', fontSize:'14px', marginBottom:'16px' }}>
        {score.total > 0
          ? `✅ ${score.correct} / ${score.total}　(${Math.round(score.correct/score.total*100)}%)`
          : '　'}
      </div>

      <div style={{ textAlign:'center', marginBottom:'8px' }}>
        <span style={{ color:'#556', fontSize:'12px' }}>{idx+1} / {allProblems.length}</span>
      </div>

      {/* サンプルエリア */}
      <div style={{
        background:'#1a1a2e', border:'1px solid #444',
        borderRadius:'12px', padding:'16px 24px', marginBottom:'20px',
      }}>
        <div style={{ color:'#aaa', fontSize:'13px', marginBottom:'8px' }}>📖</div>
        {problem.samples.map((s,i) => <BlockMath key={i} math={s} />)}
      </div>

      {/* 問題エリア */}
      <div style={{
        background:'#0d2137', border:'2px solid #4db8ff',
        borderRadius:'12px', padding:'16px 24px', marginBottom:'12px',
      }}>
        <div style={{ color:'#4db8ff', fontSize:'13px', marginBottom:'8px' }}>❓</div>
        <BlockMath math={`${problem.prompt}\\,?`} />
      </div>

      {/* 入力ボックス */}
      {!locked && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
          <span style={{ color:'#4db8ff', fontSize:'18px' }}>=</span>
          {renderInput()}
        </div>
      )}

      {/* 判定メッセージ */}
      <div style={{ textAlign:'center', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {message && (
          <div>
            <span style={{ fontSize:'48px' }}>{message==='⭕'?'⭕':'❌'}</span>
            {message==='❌' && (
              <p style={{ color:'#ff9999', fontSize:'16px', margin:'4px 0 0' }}>
                → <strong style={{ color:'white' }}><InlineMath math={getAnswerKatex(problem)} /></strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 次へボタン */}
      {locked && (
        <div style={{ textAlign:'center', marginBottom:'8px' }}>
          <button onClick={handleNext} style={{
            padding:'12px 40px', fontSize:'20px', borderRadius:'10px',
            border:'none', backgroundColor:'#1a6ef5',
            color:'white', cursor:'pointer', fontWeight:'bold',
          }}>↩</button>
        </div>
      )}

      {/* キーボード */}
      {!locked && (
        <NumKeyboard onKey={handleKey} onDelete={handleDelete} onEnter={handleEnter} mode={kbMode} />
      )}

      <div style={{ marginTop:'24px' }}>
        <button onClick={() => navigate('/')} style={{
          padding:'12px 28px', fontSize:'16px', borderRadius:'10px',
          border:'1px solid #555', backgroundColor:'transparent',
          color:'#aaa', cursor:'pointer',
        }}>← Home</button>
      </div>

    </div>
  )
}
