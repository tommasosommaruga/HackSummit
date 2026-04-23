import { NODE_TYPE_SVG_D } from '../lib/nodeTypeIcons.js'

/**
 * Small inline SVG icon for facility type (matches map atlas semantics).
 */
export default function NodeTypeIcon({ type, className = '', style = {} }) {
  const d = NODE_TYPE_SVG_D[type]
  if (type === 'deposit') {
    return (
      <svg
        className={className}
        style={{ ...style, verticalAlign: '-0.1em' }}
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="12" r="2.8" fill="currentColor" />
      </svg>
    )
  }
  if (!d) {
    return (
      <span className={className} style={{ ...style, display: 'inline-block', width: '1em', height: '1em' }} aria-hidden>
        ·
      </span>
    )
  }
  const parts = Array.isArray(d) ? d : [d]
  return (
    <svg
      className={className}
      style={{ ...style, verticalAlign: '-0.15em' }}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={type === 'mine' ? '2.3' : '1.7'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {parts.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  )
}
