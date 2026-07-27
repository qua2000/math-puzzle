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
import Step9 from './Step9.jsx'  // ← 追加6-26-26
import Step10 from './Step10.jsx'  // ← 追加7-1-26
import Step11 from './Step11.jsx'  // ← 追加7-8-26
import Step12 from './Step12.jsx'  // ← 追加7-9-26
import Step13 from './Step13.jsx'  // ← 追加7-27-26
import WarmUp1 from './WarmUp1.jsx'   // ← 追加6-4-26
import WarmUp2 from './WarmUp2.jsx'   // ← 追加6-7-26
import WarmUp3 from './WarmUp3.jsx'   // ← 追加6-12-26
import Prep1 from './Prep1'   // ← 追加6-14-26
import Prep2 from './Prep2'   // ← 追加6-16-26
import Prep3 from './Prep3'  // ← 追加6-17-26

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
        <Route path="/step9" element={<Step9 />} />  // ← 追加6-26-26
        <Route path="/step10" element={<Step10 />} />  // ← 追加7-1-26
        <Route path="/step11" element={<Step11 />} />  // ← 追加7-8-26
        <Route path="/step12" element={<Step12 />} />  // ← 追加7-9-26
        <Route path="/step13" element={<Step13 />} />  // ← 追加7-27-26
        <Route path="/warmup1" element={<WarmUp1 />} />  // ← 追加6-4-26
        <Route path="/warmup2" element={<WarmUp2 />} />  // ← 追加6-7-26
        <Route path="/warmup3" element={<WarmUp3 />} />  // ← 追加6-12-26
        <Route path="/prep1" element={<Prep1 />} />  // ← 追加6-14-26
        <Route path="/prep2" element={<Prep2 />} />  // ← 追加6-16-26
        <Route path="/prep3" element={<Prep3 />} />  // ← 追加6-17-26
      </Routes>
    </HashRouter>
  </StrictMode>,
)
