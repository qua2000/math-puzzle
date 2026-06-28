import { useState } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useNavigate, Link } from 'react-router-dom'

const BlockMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const InlineMath = ({ math }) => {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function toKatex(str) {
  if (!str) return ''
  return str.replace(/\^(-?\d+)/g, (_, e) => `^{${e}}`)
}

// 答えチェック：^{-2} と ^-2 を同一視
function norm(s) {
  return String(s)
    .replace(/\s/g, '')
    .replace(/\{(-?\d+)\}/g, '$1')
    .toLowerCase()
}
function checkAns(userStr, correctList) {
  if (!userStr) return false
  const u = norm(userStr)
  return correctList.some(c => norm(c) === u)
}

// 指数法則
const RULES = [
  'x^0 = 1',
  '\\dfrac{1}{x^a} = x^{-a}',
  '\\sqrt[a]{x} = x^{1/a}',
  '\\sqrt[a]{x^b} = x^{b/a}',
  'x^a \\cdot x^b = x^{a+b}',
  '\\dfrac{x^a}{x^b} = x^{a-b}',
  '(x^a)^b = x^{ab}',
  '(nx)^a = n^a x^a',
  '\\left(\\dfrac{n}{x}\\right)^a = n^a x^{-a}',
]

// ── 問題セット定義 ─────────────────────────────────────────
// 各セット:
//   ruleKatex  : 使う公式（例題エリア上部に表示）
//   ex1, ex2   : 例題（solution配列）
//   q          : 問題
//     prob     : 元の問題式（分数など・ページ上部に表示）
//     s1Q      : ステップ①の穴埋め式  例: \dfrac{3}{x^2} = 3x^{\square}
//     s1Ans[]  : ステップ①の正解リスト
//     s1Show   : ①正解後に表示する変換後の式  例: 3x^{-2}
//     s2Show   : ステップ②の問題として表示する式  例: 3x^{-2}
//     s2Ans[]  : ステップ②の正解リスト
//     s2Katex  : ②正解後に表示する答え

const SETS = [
  // ─── A-1: (3x^{-1})' ─────────────────────────────────
  {
    ruleKatex: '(ax^n)\'= an\\,x^{n-1}',
    ex1: { solution: ["(x^{-1})'", '= -1 \\cdot x^{-1-1}', '= -x^{-2}'] },
    ex2: { solution: ["(2x^{-1})'", '= 2(-1)x^{-1-1}', '= -2x^{-2}'] },
    q: {
      prob: '(3x^{-1})',
      s1Q: '3x^{-1} \\;\\Rightarrow\\; n = \\square',
      s1Ans: ['-1'],
      s1Show: 'n = -1',
      s2Show: '3x^{-1}',
      s2Ans: ['-3x^{-2}', '-3x^-2'],
      s2Katex: '-3x^{-2}',
      hint: ["(4x^{-1})'", '= 4 \\times (-1) \\cdot x^{-1-1}', '= -4x^{-2}'],
    },
  },
  // ─── A-2: (x^{-2})' ──────────────────────────────────
  {
    ruleKatex: '(ax^n)\'= an\\,x^{n-1}',
    ex1: { solution: ["(x^{-1})'", '= -x^{-2}'] },
    ex2: { solution: ["(2x^{-2})'", '= 2(-2)x^{-3}', '= -4x^{-3}'] },
    q: {
      prob: '(x^{-2})',
      s1Q: 'x^{-2} \\;\\Rightarrow\\; n = \\square',
      s1Ans: ['-2'],
      s1Show: 'n = -2',
      s2Show: 'x^{-2}',
      s2Ans: ['-2x^{-3}', '-2x^-3'],
      s2Katex: '-2x^{-3}',
      hint: ["(3x^{-2})'", '= 3 \\times (-2) \\cdot x^{-2-1}', '= -6x^{-3}'],
    },
  },
  // ─── A-3: (3x^{-2})' ─────────────────────────────────
  {
    ruleKatex: '(ax^n)\'= an\\,x^{n-1}',
    ex1: { solution: ["(x^{-2})'", '= -2x^{-3}'] },
    ex2: { solution: ["(2x^{-3})'", '= 2(-3)x^{-4}', '= -6x^{-4}'] },
    q: {
      prob: '(3x^{-2})',
      s1Q: '3x^{-2} \\;\\Rightarrow\\; n = \\square',
      s1Ans: ['-2'],
      s1Show: 'n = -2',
      s2Show: '3x^{-2}',
      s2Ans: ['-6x^{-3}', '-6x^-3'],
      s2Katex: '-6x^{-3}',
      hint: ["(2x^{-2})'", '= 2 \\times (-2) \\cdot x^{-2-1}', '= -4x^{-3}'],
    },
  },
  // ─── A-4: (x^{-3})' ──────────────────────────────────
  {
    ruleKatex: '(ax^n)\'= an\\,x^{n-1}',
    ex1: { solution: ["(x^{-2})'", '= -2x^{-3}'] },
    ex2: { solution: ["(x^{-4})'", '= -4x^{-5}'] },
    q: {
      prob: '(x^{-3})',
      s1Q: 'x^{-3} \\;\\Rightarrow\\; n = \\square',
      s1Ans: ['-3'],
      s1Show: 'n = -3',
      s2Show: 'x^{-3}',
      s2Ans: ['-3x^{-4}', '-3x^-4'],
      s2Katex: '-3x^{-4}',
      hint: ["(2x^{-3})'", '= 2 \\times (-3) \\cdot x^{-3-1}', '= -6x^{-4}'],
    },
  },
  // ─── A-5: (2x^{-3})' ─────────────────────────────────
  {
    ruleKatex: '(ax^n)\'= an\\,x^{n-1}',
    ex1: { solution: ["(x^{-3})'", '= -3x^{-4}'] },
    ex2: { solution: ["(3x^{-3})'", '= 3(-3)x^{-4}', '= -9x^{-4}'] },
    q: {
      prob: '(2x^{-3})',
      s1Q: '2x^{-3} \\;\\Rightarrow\\; n = \\square',
      s1Ans: ['-3'],
      s1Show: 'n = -3',
      s2Show: '2x^{-3}',
      s2Ans: ['-6x^{-4}', '-6x^-4'],
      s2Katex: '-6x^{-4}',
      hint: ["(4x^{-3})'", '= 4 \\times (-3) \\cdot x^{-3-1}', '= -12x^{-4}'],
    },
  },
  // ─── B: (3/x)' ───────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x} = x^{-1}',
    ex1: {
      solution: [
        "\\left(\\dfrac{1}{x}\\right)'",
        "= (x^{-1})'",
        '= -x^{-2} = -\\dfrac{1}{x^2}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{2}{x}\\right)'",
        "= (2x^{-1})'",
        '= -2x^{-2} = -\\dfrac{2}{x^2}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{3}{x}\\right)',
      s1Q: '\\dfrac{3}{x} = 3x^{\\square}',
      s1Ans: ['-1'],
      s1Show: '3x^{-1}',
      s2Show: '3x^{-1}',
      s2Ans: ['-3x^{-2}', '-3/x^2', '-3x^-2'],
      s2Katex: '-3x^{-2} = -\\dfrac{3}{x^2}',
      hint: ["(4x^{-1})'", '= 4 \\times (-1) \\cdot x^{-1-1}', '= -4x^{-2}'],
    },
  },
  // ─── C: (3/4x)' ──────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(\\dfrac{1}{2x}\\right)'",
        "= \\left(\\dfrac{1}{2}x^{-1}\\right)'",
        '= \\dfrac{1}{2}(-1)x^{-2}',
        '= -\\dfrac{1}{2x^2}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{2}{3x}\\right)'",
        "= \\left(\\dfrac{2}{3}x^{-1}\\right)'",
        '= -\\dfrac{2}{3x^2}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{3}{4x}\\right)',
      s1Q: '\\dfrac{3}{4x} = \\dfrac{3}{4}x^{\\square}',
      s1Ans: ['-1'],
      s1Show: '\\dfrac{3}{4}x^{-1}',
      s2Show: '\\dfrac{3}{4}x^{-1}',
      s2Ans: ['-(3/4)x^{-2}', '-3/(4x^2)', '-(3/4)x^-2', '-3/4x^{-2}', '-3/4x^-2'],
      s2Katex: '-\\dfrac{3}{4}x^{-2} = -\\dfrac{3}{4x^2}',
      hint: ["\\left(\\dfrac{1}{2}x^{-1}\\right)'", '= \\dfrac{1}{2} \\times (-1) \\cdot x^{-1-1}', '= -\\dfrac{1}{2}x^{-2}'],
    },
  },
  // ─── D: (-3/x)' ──────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(-\\dfrac{1}{x}\\right)'",
        "= (-x^{-1})'",
        '= -(-1)x^{-2}',
        '= x^{-2} = \\dfrac{1}{x^2}',
      ],
    },
    ex2: {
      solution: [
        "\\left(-\\dfrac{2}{x}\\right)'",
        "= (-2x^{-1})'",
        '= 2x^{-2} = \\dfrac{2}{x^2}',
      ],
    },
    q: {
      prob: '\\left(-\\dfrac{3}{x}\\right)',
      s1Q: '-\\dfrac{3}{x} = -3x^{\\square}',
      s1Ans: ['-1'],
      s1Show: '-3x^{-1}',
      s2Show: '-3x^{-1}',
      s2Ans: ['3x^{-2}', '3/x^2', '3x^-2'],
      s2Katex: '3x^{-2} = \\dfrac{3}{x^2}',
      hint: ["(-2x^{-1})'", '= -2 \\times (-1) \\cdot x^{-1-1}', '= 2x^{-2}'],
    },
  },
  // ─── E: (-3/4x)' ─────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(-\\dfrac{1}{2x}\\right)'",
        "= \\left(-\\dfrac{1}{2}x^{-1}\\right)'",
        '= -\\dfrac{1}{2}(-1)x^{-2}',
        '= \\dfrac{1}{2x^2}',
      ],
    },
    ex2: {
      solution: [
        "\\left(-\\dfrac{2}{3x}\\right)'",
        "= \\left(-\\dfrac{2}{3}x^{-1}\\right)'",
        '= \\dfrac{2}{3x^2}',
      ],
    },
    q: {
      prob: '\\left(-\\dfrac{3}{4x}\\right)',
      s1Q: '-\\dfrac{3}{4x} = -\\dfrac{3}{4}x^{\\square}',
      s1Ans: ['-1'],
      s1Show: '-\\dfrac{3}{4}x^{-1}',
      s2Show: '-\\dfrac{3}{4}x^{-1}',
      s2Ans: ['(3/4)x^{-2}', '3/(4x^2)', '(3/4)x^-2', '3/4x^{-2}', '3/4x^-2'],
      s2Katex: '\\dfrac{3}{4}x^{-2} = \\dfrac{3}{4x^2}',
      hint: ["\\left(-\\dfrac{1}{2}x^{-1}\\right)'", '= -\\dfrac{1}{2} \\times (-1) \\cdot x^{-1-1}', '= \\dfrac{1}{2}x^{-2}'],
    },
  },
  // ─── F: (3/x^2)' ─────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^2} = x^{-2}',
    ex1: {
      solution: [
        "\\left(\\dfrac{1}{x^2}\\right)'",
        "= (x^{-2})'",
        '= -2x^{-3} = -\\dfrac{2}{x^3}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{2}{x^2}\\right)'",
        "= (2x^{-2})'",
        '= -4x^{-3} = -\\dfrac{4}{x^3}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{3}{x^2}\\right)',
      s1Q: '\\dfrac{3}{x^2} = 3x^{\\square}',
      s1Ans: ['-2'],
      s1Show: '3x^{-2}',
      s2Show: '3x^{-2}',
      s2Ans: ['-6x^{-3}', '-6/x^3', '-6x^-3'],
      s2Katex: '-6x^{-3} = -\\dfrac{6}{x^3}',
      hint: ["(2x^{-2})'", '= 2 \\times (-2) \\cdot x^{-2-1}', '= -4x^{-3}'],
    },
  },
  // ─── G: (1/2x^2)' ────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(\\dfrac{1}{3x^2}\\right)'",
        "= \\left(\\dfrac{1}{3}x^{-2}\\right)'",
        '= \\dfrac{1}{3}(-2)x^{-3}',
        '= -\\dfrac{2}{3x^3}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{2}{5x^2}\\right)'",
        "= \\left(\\dfrac{2}{5}x^{-2}\\right)'",
        '= -\\dfrac{4}{5x^3}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{1}{2x^2}\\right)',
      s1Q: '\\dfrac{1}{2x^2} = \\dfrac{1}{2}x^{\\square}',
      s1Ans: ['-2'],
      s1Show: '\\dfrac{1}{2}x^{-2}',
      s2Show: '\\dfrac{1}{2}x^{-2}',
      s2Ans: ['-x^{-3}', '-1/x^3', '-x^-3', '-1x^{-3}'],
      s2Katex: '-x^{-3} = -\\dfrac{1}{x^3}',
      hint: ["\\left(\\dfrac{1}{3}x^{-2}\\right)'", '= \\dfrac{1}{3} \\times (-2) \\cdot x^{-2-1}', '= -\\dfrac{2}{3}x^{-3}'],
    },
  },
  // ─── H: (3/x^3)' ─────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^3} = x^{-3}',
    ex1: {
      solution: [
        "\\left(\\dfrac{1}{x^3}\\right)'",
        "= (x^{-3})'",
        '= -3x^{-4} = -\\dfrac{3}{x^4}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{2}{x^3}\\right)'",
        "= (2x^{-3})'",
        '= -6x^{-4} = -\\dfrac{6}{x^4}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{3}{x^3}\\right)',
      s1Q: '\\dfrac{3}{x^3} = 3x^{\\square}',
      s1Ans: ['-3'],
      s1Show: '3x^{-3}',
      s2Show: '3x^{-3}',
      s2Ans: ['-9x^{-4}', '-9/x^4', '-9x^-4'],
      s2Katex: '-9x^{-4} = -\\dfrac{9}{x^4}',
      hint: ["(2x^{-3})'", '= 2 \\times (-3) \\cdot x^{-3-1}', '= -6x^{-4}'],
    },
  },
  // ─── I: (3/4x^3)' ────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(\\dfrac{2}{5x^3}\\right)'",
        "= \\left(\\dfrac{2}{5}x^{-3}\\right)'",
        '= \\dfrac{2}{5}(-3)x^{-4}',
        '= -\\dfrac{6}{5x^4}',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{1}{3x^3}\\right)'",
        "= \\left(\\dfrac{1}{3}x^{-3}\\right)'",
        '= -\\dfrac{1}{x^4}',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{3}{4x^3}\\right)',
      s1Q: '\\dfrac{3}{4x^3} = \\dfrac{3}{4}x^{\\square}',
      s1Ans: ['-3'],
      s1Show: '\\dfrac{3}{4}x^{-3}',
      s2Show: '\\dfrac{3}{4}x^{-3}',
      s2Ans: ['-(9/4)x^{-4}', '-9/(4x^4)', '-(9/4)x^-4', '-9/4x^{-4}', '-9/4x^-4'],
      s2Katex: '-\\dfrac{9}{4}x^{-4} = -\\dfrac{9}{4x^4}',
      hint: ["\\left(\\dfrac{2}{5}x^{-3}\\right)'", '= \\dfrac{2}{5} \\times (-3) \\cdot x^{-3-1}', '= -\\dfrac{6}{5}x^{-4}'],
    },
  },
  // ─── J: (-3/x^2)' ────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(-\\dfrac{1}{x^2}\\right)'",
        "= (-x^{-2})'",
        '= -(-2)x^{-3}',
        '= 2x^{-3} = \\dfrac{2}{x^3}',
      ],
    },
    ex2: {
      solution: [
        "\\left(-\\dfrac{2}{x^2}\\right)'",
        "= (-2x^{-2})'",
        '= 4x^{-3} = \\dfrac{4}{x^3}',
      ],
    },
    q: {
      prob: '\\left(-\\dfrac{3}{x^2}\\right)',
      s1Q: '-\\dfrac{3}{x^2} = -3x^{\\square}',
      s1Ans: ['-2'],
      s1Show: '-3x^{-2}',
      s2Show: '-3x^{-2}',
      s2Ans: ['6x^{-3}', '6/x^3', '6x^-3'],
      s2Katex: '6x^{-3} = \\dfrac{6}{x^3}',
      hint: ["(-2x^{-2})'", '= -2 \\times (-2) \\cdot x^{-2-1}', '= 4x^{-3}'],
    },
  },
  // ─── K: (-3/4x^2)' ───────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(-\\dfrac{2}{3x^2}\\right)'",
        "= \\left(-\\dfrac{2}{3}x^{-2}\\right)'",
        '= -\\dfrac{2}{3}(-2)x^{-3}',
        '= \\dfrac{4}{3x^3}',
      ],
    },
    ex2: {
      solution: [
        "\\left(-\\dfrac{1}{2x^2}\\right)'",
        "= \\left(-\\dfrac{1}{2}x^{-2}\\right)'",
        '= x^{-3} = \\dfrac{1}{x^3}',
      ],
    },
    q: {
      prob: '\\left(-\\dfrac{3}{4x^2}\\right)',
      s1Q: '-\\dfrac{3}{4x^2} = -\\dfrac{3}{4}x^{\\square}',
      s1Ans: ['-2'],
      s1Show: '-\\dfrac{3}{4}x^{-2}',
      s2Show: '-\\dfrac{3}{4}x^{-2}',
      s2Ans: ['(3/2)x^{-3}', '3/(2x^3)', '(3/2)x^-3', '3/2x^{-3}', '3/2x^-3'],
      s2Katex: '\\dfrac{3}{2}x^{-3} = \\dfrac{3}{2x^3}',
      hint: ["\\left(-\\dfrac{2}{3}x^{-2}\\right)'", '= -\\dfrac{2}{3} \\times (-2) \\cdot x^{-2-1}', '= \\dfrac{4}{3}x^{-3}'],
    },
  },
  // ─── L: (-3/x^3)' ────────────────────────────────────
  {
    ruleKatex: '\\dfrac{1}{x^a} = x^{-a}',
    ex1: {
      solution: [
        "\\left(-\\dfrac{1}{x^3}\\right)'",
        "= (-x^{-3})'",
        '= -(-3)x^{-4}',
        '= 3x^{-4} = \\dfrac{3}{x^4}',
      ],
    },
    ex2: {
      solution: [
        "\\left(-\\dfrac{2}{x^3}\\right)'",
        "= (-2x^{-3})'",
        '= 6x^{-4} = \\dfrac{6}{x^4}',
      ],
    },
    q: {
      prob: '\\left(-\\dfrac{3}{x^3}\\right)',
      s1Q: '-\\dfrac{3}{x^3} = -3x^{\\square}',
      s1Ans: ['-3'],
      s1Show: '-3x^{-3}',
      s2Show: '-3x^{-3}',
      s2Ans: ['9x^{-4}', '9/x^4', '9x^-4'],
      s2Katex: '9x^{-4} = \\dfrac{9}{x^4}',
      hint: ["(-2x^{-3})'", '= -2 \\times (-3) \\cdot x^{-3-1}', '= 6x^{-4}'],
    },
  },
  // ─── M: x^m・x^n ─────────────────────────────────────
  {
    ruleKatex: 'x^a \\cdot x^b = x^{a+b}',
    ex1: {
      solution: [
        "(x^2 \\cdot x^3)'",
        "= (x^{2+3})'",
        "= (x^5)'",
        '= 5x^4',
      ],
    },
    ex2: {
      solution: [
        "(x^3 \\cdot x^4)'",
        "= (x^7)'",
        '= 7x^6',
      ],
    },
    q: {
      prob: '(x^2 \\cdot x^4)',
      s1Q: 'x^2 \\cdot x^4 = x^{\\square}',
      s1Ans: ['6', 'x^6'],
      s1Show: 'x^6',
      s2Show: 'x^6',
      s2Ans: ['6x^5'],
      s2Katex: '6x^5',
      hint: ["(x^3 \\cdot x^4)'", '= (x^{3+4})', '= (x^7)', '= 7x^6'],
    },
  },
  // ─── N: x^m/x^n ──────────────────────────────────────
  {
    ruleKatex: '\\dfrac{x^a}{x^b} = x^{a-b}',
    ex1: {
      solution: [
        "\\left(\\dfrac{x^5}{x^2}\\right)'",
        "= (x^{5-2})'",
        "= (x^3)'",
        '= 3x^2',
      ],
    },
    ex2: {
      solution: [
        "\\left(\\dfrac{x^6}{x^2}\\right)'",
        "= (x^4)'",
        '= 4x^3',
      ],
    },
    q: {
      prob: '\\left(\\dfrac{x^7}{x^3}\\right)',
      s1Q: '\\dfrac{x^7}{x^3} = x^{\\square}',
      s1Ans: ['4', 'x^4'],
      s1Show: 'x^4',
      s2Show: 'x^4',
      s2Ans: ['4x^3'],
      s2Katex: '4x^3',
      hint: ["\\left(\\dfrac{x^6}{x^2}\\right)'", '= (x^{6-2})', '= (x^4)', '= 4x^3'],
    },
  },
  // ─── O: (x^m)^n ──────────────────────────────────────
  {
    ruleKatex: '(x^a)^b = x^{ab}',
    ex1: {
      solution: [
        "((x^2)^3)'",
        "= (x^{2 \\times 3})'",
        "= (x^6)'",
        '= 6x^5',
      ],
    },
    ex2: {
      solution: [
        "((x^3)^2)'",
        "= (x^6)'",
        '= 6x^5',
      ],
    },
    q: {
      prob: '((x^2)^4)',
      s1Q: '(x^2)^4 = x^{\\square}',
      s1Ans: ['8', 'x^8'],
      s1Show: 'x^8',
      s2Show: 'x^8',
      s2Ans: ['8x^7'],
      s2Katex: '8x^7',
      hint: ["((x^3)^2)'", '= (x^{3 \\times 2})', '= (x^6)', '= 6x^5'],
    },
  },
  // ─── P: (ax)^m ───────────────────────────────────────
  {
    ruleKatex: '(nx)^a = n^a x^a',
    ex1: {
      solution: [
        "((3x)^2)'",
        "= (3^2 x^2)'",
        "= (9x^2)'",
        '= 18x',
      ],
    },
    ex2: {
      solution: [
        "((2x)^3)'",
        "= (8x^3)'",
        '= 24x^2',
      ],
    },
    q: {
      prob: '((2x)^4)',
      s1Q: '(2x)^4 = \\square x^4',
      s1Ans: ['16', '16x^4'],
      s1Show: '16x^4',
      s2Show: '16x^4',
      s2Ans: ['64x^3'],
      s2Katex: '64x^3',
      hint: ["((3x)^2)'", '= (9x^2)', '= 18x'],
    },
  },
  // ─── Q: (a/x)^m ──────────────────────────────────────
  {
    ruleKatex: '\\left(\\dfrac{n}{x}\\right)^a = n^a x^{-a}',
    ex1: {
      solution: [
        "\\left[\\left(\\dfrac{2}{x}\\right)^3\\right]'",
        "= (2^3 x^{-3})'",
        "= (8x^{-3})'",
        '= -24x^{-4} = -\\dfrac{24}{x^4}',
      ],
    },
    ex2: {
      solution: [
        "\\left[\\left(\\dfrac{3}{x}\\right)^2\\right]'",
        "= (9x^{-2})'",
        '= -18x^{-3} = -\\dfrac{18}{x^3}',
      ],
    },
    q: {
      prob: '\\left[\\left(\\dfrac{2}{x}\\right)^4\\right]',
      s1Q: '\\left(\\dfrac{2}{x}\\right)^4 = 16x^{\\square}',
      s1Ans: ['-4'],
      s1Show: '16x^{-4}',
      s2Show: '16x^{-4}',
      s2Ans: ['-64x^{-5}', '-64/x^5', '-64x^-5'],
      s2Katex: '-64x^{-5} = -\\dfrac{64}{x^5}',
      hint: ["\\left[\\left(\\dfrac{3}{x}\\right)^2\\right]'", '= (9x^{-2})', '= -18x^{-3}'],
    },
  },
]

// solution配列 → aligned KaTeX
// solution[0] が問題行（'を含む）、[1]以降が = ... 行
function buildAligned(solution) {
  const lines = solution.map((line, i) => {
    if (i === 0) return `${line} &`
    const t = line.trim()
    return t.startsWith('=') ? `& ${t}` : `&= ${t}`
  })
  return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`
}

// ── UI部品 ────────────────────────────────────────────────
const CaretGuide = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
    <div style={{
      background: '#1a2a3e', border: '1px solid #4db8ff44',
      borderRadius: '8px', padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#4db8ff', fontSize: '15px', fontFamily: 'monospace' }}>x^-2</span>
      <span style={{ color: '#888', fontSize: '13px' }}>→</span>
      <span style={{ color: '#aaffaa', fontSize: '15px' }}>x<sup style={{ fontSize: '11px' }}>−2</sup></span>
    </div>
  </div>
)

const NumKeyboard = ({ onKey, onDelete, onEnter }) => {
  const rowStyle = { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px' }
  const btn = (color) => ({
    padding: '12px 4px', minWidth: '42px', flex: 1, maxWidth: '58px',
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
          <button key={n} style={btn('num')} onClick={() => onKey(n)}>{n}</button>
        ))}
      </div>
      <div style={rowStyle}>
        <button style={btn('num')} onClick={() => onKey('x')}>x</button>
        <button style={btn('caret')} onClick={() => onKey('^')}>^</button>
        <button style={btn('num')} onClick={() => onKey('+')}>+</button>
        <button style={btn('num')} onClick={() => onKey('-')}>−</button>
        <button style={btn('num')} onClick={() => onKey('/')}>／</button>
        <button style={btn('num')} onClick={() => onKey('(')}>（</button>
        <button style={btn('num')} onClick={() => onKey(')')}>）</button>
      </div>
      <div style={rowStyle}>
        <button style={{ ...btn('del'), flex: 1, maxWidth: '90px' }} onClick={onDelete}>⌫</button>
        <button style={{ ...btn('enter'), flex: 2, maxWidth: '170px' }} onClick={onEnter}>✓</button>
      </div>
    </div>
  )
}

const inputBox = (wrong) => ({
  background: '#163a5e',
  border: `2px solid ${wrong ? '#ff6666' : '#4db8ff'}`,
  borderRadius: '6px', minWidth: '140px', padding: '4px 12px',
  textAlign: 'center', color: wrong ? '#ff9999' : '#4db8ff',
  fontWeight: 'bold', fontSize: '18px', fontFamily: 'monospace',
})

// ── メインコンポーネント ─────────────────────────────────
export default function Step9() {
  const navigate = useNavigate()

  const [setIdx, setSetIdx] = useState(0)
  const [phase, setPhase] = useState(1)   // 1=ステップ①, 2=ステップ②
  const [ans1, setAns1] = useState('')
  const [ans2, setAns2] = useState('')
  const [st1, setSt1] = useState('')      // '' | 'ok' | 'ng'
  const [st2, setSt2] = useState('')
  const [cleared, setCleared] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [hintStep, setHintStep] = useState(0)
  const [hintTimerId, setHintTimerId] = useState(null)

  const cur = SETS[setIdx]
  const total = SETS.length

  function clearHintTimer(id) {
    if (id) clearInterval(id)
  }

  function startHint(hint) {
    setHintStep(1)
    let step = 1
    const id = setInterval(() => {
      step += 1
      if (step <= hint.length) {
        setHintStep(step)
      } else {
        clearInterval(id)
      }
    }, 2000)
    setHintTimerId(id)
  }

  function reset() {
    setPhase(1); setAns1(''); setAns2(''); setSt1(''); setSt2('')
    setHintStep(0)
    setHintTimerId(prev => { clearHintTimer(prev); return null })
  }

  function advance() {
    if (setIdx + 1 >= total) { setCleared(true); return }
    setSetIdx(i => i + 1)
    reset()
  }

  const kb = {
    key: (v) => {
      if (phase === 1) {
        if (st1 === 'ok') return
        if (st1 === 'ng') setSt1('')
        setAns1(s => s + v)
      } else {
        if (st2 === 'ok') return
        if (st2 === 'ng') setSt2('')
        setAns2(s => s + v)
      }
    },
    del: () => {
      if (phase === 1 && st1 !== 'ok') setAns1(s => s.slice(0, -1))
      if (phase === 2 && st2 !== 'ok') setAns2(s => s.slice(0, -1))
    },
    enter: () => {
      if (phase === 1) {
        if (st1 === 'ok' || !ans1) return
        if (checkAns(ans1, cur.q.s1Ans)) { setSt1('ok'); setPhase(2) }
        else setSt1('ng')
      } else {
        if (st2 === 'ok' || !ans2) return
        if (checkAns(ans2, cur.q.s2Ans)) {
          setSt2('ok'); setDoneCount(c => c + 1)
          setHintStep(0)
          setHintTimerId(prev => { clearHintTimer(prev); return null })
        } else {
          setSt2('ng')
          if (hintStep === 0 && cur.q.hint) {
            clearHintTimer(hintTimerId)
            startHint(cur.q.hint)
          }
        }
      }
    },
  }

  // クリア画面
  if (cleared) return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '24px' }}>Math Puzzle – Step 9</h1>
      <div style={{ fontSize: '80px', margin: '16px 0' }}>🏆</div>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
        <button onClick={() => { setSetIdx(0); setCleared(false); setDoneCount(0); reset() }}
          style={{ padding: '14px 32px', fontSize: '28px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer' }}>
          🔁
        </button>
        <button onClick={() => navigate('/')}
          style={{ padding: '14px 28px', fontSize: '18px', borderRadius: '10px', border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )

  // メイン画面
  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>Math Puzzle – Step 9</h1>

      {/* 微分記号 */}
      <div style={{ textAlign: 'center', marginBottom: '10px', background: '#1a1a2e', border: '1px solid #555', borderRadius: '10px', padding: '8px 16px' }}>
        <InlineMath math={`(f)' = D(f) = \\dfrac{d}{dx}(f)`} />
      </div>

      {/* Prep1リンク */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Link to="/prep1" style={{ color: '#4db8ff', fontSize: '14px', textDecoration: 'none' }}>
          📘 Prep 1
        </Link>
      </div>

      {/* 指数法則パネル */}
      <div style={{ border: '2px solid #666', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', background: '#1a1a2e', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {RULES.map((r, i) => (
          <div key={i} style={{ fontSize: '13px' }}>
            <InlineMath math={r} />
          </div>
        ))}
      </div>

      {/* 進捗 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#2d6a2d', color: 'white' }}>
          {doneCount} / {total}
        </span>
      </div>

      {/* ── 例題エリア ── */}
      <div style={{ background: '#1a1a2e', border: '1px solid #444', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <InlineMath math={cur.ruleKatex} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <BlockMath math={buildAligned(cur.ex1.solution)} />
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '4px', overflowX: 'auto' }}>
          <BlockMath math={buildAligned(cur.ex2.solution)} />
        </div>
      </div>

      {/* ── 問題エリア ── */}
      <div style={{ background: '#0d2137', border: '2px solid #4db8ff', borderRadius: '12px', padding: '16px 24px', marginBottom: '16px' }}>

        {/* 問題文（元の形） */}
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <BlockMath math={`${cur.q.prob}' = \\,?`} />
        </div>

        {/* ① 指数変換ボックス */}
        <div style={{
          background: '#0a1e30',
          border: `2px solid ${st1 === 'ok' ? '#4dff88' : '#4db8ff'}`,
          borderRadius: '8px', padding: '12px', marginBottom: '12px',
        }}>
          {/* ①の式 */}
          <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
            <BlockMath math={cur.q.s1Q} />
          </div>
          {/* 入力欄 or 正解表示 */}
          {st1 !== 'ok' ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={inputBox(st1 === 'ng')}>{ans1 || '?'}</div>
              {ans1 && (
                <>
                  <span style={{ color: '#888' }}>→</span>
                  <div style={{ background: '#1a2e1a', border: '1.5px solid #4dff88', borderRadius: '6px', padding: '4px 12px', color: '#88ff88' }}>
                    <InlineMath math={toKatex(ans1)} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#88ff88', fontSize: '18px' }}>
              ✅ <InlineMath math={cur.q.s1Show} />
            </div>
          )}
          {st1 === 'ng' && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
            </div>
          )}
        </div>

        {/* ② 微分ボックス（①正解後に表示） */}
        {st1 === 'ok' && (
          <div style={{
            background: '#0a1e30',
            border: `2px solid ${st2 === 'ok' ? '#4dff88' : '#44bb66'}`,
            borderRadius: '8px', padding: '12px',
          }}>
            {/* ②の式：変換後の式 + ' = ? */}
            <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
              <BlockMath math={`(${cur.q.s2Show})' = \\,?`} />
            </div>
            {/* 入力欄 or 正解表示 */}
            {st2 !== 'ok' ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={inputBox(st2 === 'ng')}>{ans2 || '?'}</div>
                {ans2 && (
                  <>
                    <span style={{ color: '#888' }}>→</span>
                    <div style={{ background: '#1a2e1a', border: '1.5px solid #4dff88', borderRadius: '6px', padding: '4px 12px', color: '#88ff88' }}>
                      <InlineMath math={toKatex(ans2)} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭕</div>
                <div style={{ color: '#88ff88' }}><InlineMath math={cur.q.s2Katex} /></div>
              </div>
            )}
            {st2 === 'ng' && (
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '36px' }}>❌</span><div style={{ fontSize: '28px' }}>🔄</div>
              </div>
            )}
            {/* ヒント表示（不正解後・2秒間隔で段階表示） */}
            {hintStep > 0 && cur.q.hint && (
              <div style={{ marginTop: '12px', background: '#0f2a1a', border: '1.5px solid #44bb66', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ color: '#88ff88', fontSize: '13px', marginBottom: '6px', textAlign: 'center' }}>
                  step :
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <BlockMath math={buildAligned(cur.q.hint.slice(0, hintStep))} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next / キーボード */}
      {st2 === 'ok' ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button onClick={advance} style={{ padding: '14px 40px', fontSize: '20px', borderRadius: '10px', border: 'none', backgroundColor: '#1a6ef5', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Next ▶
          </button>
        </div>
      ) : (
        <>
          <CaretGuide />
          <NumKeyboard onKey={kb.key} onDelete={kb.del} onEnter={kb.enter} />
        </>
      )}

      {/* Home */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', fontSize: '16px', borderRadius: '10px', border: '1px solid #555', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' }}>
          ← Home
        </button>
      </div>
    </div>
  )
}
