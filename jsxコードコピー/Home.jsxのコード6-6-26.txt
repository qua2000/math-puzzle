import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const levels = [
  {
    title: 'Level 1',
    steps: [
      { label: 'Step 1', path: '/step1' },
      { label: 'Step 2', path: '/step2' },
    ],
  },
  {
    title: 'Level 2',
    steps: [
      { label: 'Step 3', path: '/step3' },
      { label: 'Step 4', path: '/step4' },
    ],
  },
  {
    title: 'Level 3',
    steps: [
      { label: 'Step 5', path: '/step5' },
      { label: 'Step 6', path: '/step6' },
      { label: 'Step 7', path: '/step7' },
      { label: 'Step 8', path: '/step8' },
    ],
  },
]

// ── Coming Soon ポップアップ ─────────────────────────────
const ComingSoonPopup = ({ label, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1a1a2e',
      border: '2px solid #888',
      borderRadius: '16px',
      padding: '32px 40px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
        Coming Soon
      </div>
      <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
        {label} は準備中です
      </div>
      <button onClick={onClose} style={{
        padding: '10px 28px', borderRadius: '8px', border: 'none',
        backgroundColor: '#1a6ef5', color: 'white',
        fontSize: '15px', cursor: 'pointer', fontWeight: 'bold',
      }}>OK</button>
    </div>
  </div>
)

export default function Home() {
  const navigate = useNavigate()
  const [popup, setPopup] = useState(null) // null or label string

  return (
    <div style={{
      padding: '40px 30px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      {popup && <ComingSoonPopup label={popup} onClose={() => setPopup(null)} />}

      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Math Puzzle</h1>

      {/* ── WarmUp セクション ── */}
      <div style={{
        marginBottom: '30px',
        border: '1px solid #555',
        borderRadius: '12px',
        padding: '20px',
        background: '#1a1a1a',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#aaffaa' }}>
            🧩 Warm Up
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* WarmUp1 ボタン（実装済み） */}
          <button
            onClick={() => navigate('/warmup1')}
            style={{
              padding: '14px 28px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2a6a2a',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            WarmUp 1
          </button>

          {/* WarmUp2 ボタン（Coming Soon） */}
          <button
            onClick={() => setPopup('📘 WarmUp 2')}
            style={{
              padding: '14px 28px',
              borderRadius: '8px',
              border: '1px dashed #667766',
              backgroundColor: '#1a2a1a',
              color: '#667766',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            WarmUp 2
          </button>
        </div>
      </div>

      {/* ── Level セクション ── */}
      {levels.map((level) => (
        <div key={level.title} style={{
          marginBottom: '30px',
          border: '1px solid #444',
          borderRadius: '12px',
          padding: '20px',
          opacity: level.locked ? 0.4 : 1,
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#4db8ff' }}>
              {level.title}
            </span>
            {level.locked && <span style={{ marginLeft: '8px' }}>🔒</span>}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {level.steps.map((step) => (
              <button
                key={step.path}
                onClick={() => navigate(step.path)}
                style={{
                  padding: '14px 28px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1a6ef5',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
