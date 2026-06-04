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

const warmups = [
  { label: 'WarmUp 1', path: '/warmup1' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      padding: '40px 30px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>
        Math Puzzle
      </h1>

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
          {warmups.map((w) => (
            <button
              key={w.path}
              onClick={() => navigate(w.path)}
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
              {w.label}
            </button>
          ))}
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
