import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { abortTransition, onRouteChange } from './transition'

/**
 * Tells the transition system about every route change, in the same frame
 * the new page is put on screen (so a cover can be in place before it is
 * painted), and clears any transition if the app goes away. Renders nothing.
 */
export default function RouteTransitions() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previous = useRef(location.pathname)

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = location.pathname
    if (from !== location.pathname) {
      onRouteChange(from, location.pathname, navigationType === 'POP')
    }
  }, [location, navigationType])

  useEffect(() => abortTransition, [])

  return null
}
