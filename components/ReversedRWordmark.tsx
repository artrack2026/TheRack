'use client'

interface Props {
  /** Text before the reversed R — include your own trailing hyphen, e.g. "Custome-" */
  before: string
  /** Text after the reversed R — include your own leading hyphen, e.g. "-Curations" */
  after: string
  className?: string
}

/** Same rainbow-gradient-plus-mirrored-R treatment as the main "Art-R-Ack"
 *  wordmark (components/LogoText.tsx), generalized to wrap arbitrary text —
 *  used for sub-brand marks like "Custome-R-Curations". Keep the two in
 *  sync if the core rainbow-slide animation or gradient stops ever change. */
export default function ReversedRWordmark({ before, after, className = '' }: Props) {
  const rainbowStyle = (delay = '0s') => ({
    background: 'linear-gradient(135deg, #ff4444, #ff8c00, #ffd700, #44dd77, #00e8ff, #4488ff, #aa44ff, #ff44bb, #ff4444)',
    backgroundSize: '300% auto',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    backgroundClip: 'text' as const,
    animation: `rainbow-slide 8s linear infinite ${delay}`,
    display: 'inline-block' as const,
  })

  const reversedRStyle = {
    ...rainbowStyle('-2s'),
    transform: 'scaleX(-1)',
  }

  return (
    <span className={`font-black tracking-widest uppercase ${className}`}>
      <span style={rainbowStyle()}>{before}</span>
      <span style={reversedRStyle}>R</span>
      <span style={rainbowStyle('-4s')}>{after}</span>
    </span>
  )
}
