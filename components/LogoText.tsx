'use client'

interface Props {
  className?: string
}

export default function LogoText({ className = '' }: Props) {
  const rainbowStyle = {
    background: 'linear-gradient(135deg, #ff4444, #ff8c00, #ffd700, #44dd77, #00e8ff, #4488ff, #aa44ff, #ff44bb, #ff4444)',
    backgroundSize: '300% auto',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    backgroundClip: 'text' as const,
    animation: 'rainbow-slide 8s linear infinite',
    display: 'inline-block' as const,
  }

  const reversedRStyle = {
    ...rainbowStyle,
    display: 'inline-block' as const,
    transform: 'scaleX(-1)',
    animationDelay: '-2s',
  }

  return (
    <span className={`font-black tracking-widest uppercase ${className}`}>
      <span style={rainbowStyle}>Art-</span>
      <span style={reversedRStyle}>R</span>
      <span style={{ ...rainbowStyle, animationDelay: '-4s' }}>-Ack</span>
    </span>
  )
}
