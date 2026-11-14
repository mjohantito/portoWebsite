import { Navigate, Route, Routes } from 'react-router-dom'
import BusinessPage from './pages/BusinessPage'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import RouteTransitions from './transition/RouteTransitions'

/*
 * Routes. "/" is the one-page site; the others are placeholders for now.
 * `section` is the home section a placeholder's "Back to home" link returns
 * to when the visitor did not arrive from the home page.
 *
 * Links between routes use <TransitionLink>, and <RouteTransitions> watches
 * the route for the page transitions (src/transition/).
 *
 * Direct loads of these URLs rely on the host serving index.html for every
 * path (vercel.json does this for Vercel).
 */
export default function App() {
  return (
    <>
      <RouteTransitions />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/business/:slug" element={<BusinessPage />} />
        <Route path="/work" element={<Placeholder title="All work" section="work" />} />
        <Route path="/about" element={<Placeholder title="More about me" section="about" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
