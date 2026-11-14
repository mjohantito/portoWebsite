import type { MouseEvent } from 'react'
import { Link, useNavigate, type LinkProps } from 'react-router-dom'
import { startTransition } from './transition'

/**
 * A router <Link> that changes page with a transition. Use it for every link
 * to another route; which transition plays is decided by the route (routes.ts).
 *
 * It is still a real link: Cmd/Ctrl/Shift/Alt clicks and middle clicks open
 * tabs and windows the normal way, with no transition.
 */
export default function TransitionLink({ to, state, onClick, ...rest }: LinkProps) {
  const navigate = useNavigate()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      typeof to !== 'string' ||
      (rest.target && rest.target !== '_self')
    ) {
      return
    }
    event.preventDefault()
    startTransition(navigate, to, state, event.currentTarget)
  }

  return <Link {...rest} to={to} state={state} onClick={handleClick} />
}
