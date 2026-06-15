import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home  from './Home.jsx'
import Step1 from './Step1.jsx'
import Step2 from './Step2.jsx'
import Step3 from './Step3.jsx'
import Step4 from './Step4.jsx'
import Step5 from './Step5.jsx'
import Step6 from './Step6.jsx'
import Step7 from './Step7.jsx'
import Step8 from './Step8.jsx'
import WarmUp1 from './WarmUp1.jsx'   // ← 追加6-4-26

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/"      element={<Home />} />
        <Route path="/step1" element={<Step1 />} />
        <Route path="/step2" element={<Step2 />} />
        <Route path="/step3" element={<Step3 />} />
        <Route path="/step4" element={<Step4 />} />
        <Route path="/step5" element={<Step5 />} />
        <Route path="/step6" element={<Step6 />} />
        <Route path="/step7" element={<Step7 />} />
        <Route path="/step8" element={<Step8 />} />
        <Route path="/warmup1" element={<WarmUp1 />} />  // ← 追加6-4-26
      </Routes>
    </HashRouter>
  </StrictMode>,
)
