'use client'

interface Props {
  className?: string
}

export default function LogoText({ className = '' }: Props) {
  // Delay is baked into the `animation` shorthand itself (rather than set via a
  // separate `animationDelay` key) — mixing the shorthand with a longhand override
  // for the same property is what triggers React's style-conflict warning.
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
      <span style={rainbowStyle()}>Art-</span>
      <span style={reversedRStyle}>R</span>
      <span style={rainbowStyle('-4s')}>-Ack</span>
    </span>
  )
}
