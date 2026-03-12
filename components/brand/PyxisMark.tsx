type PyxisMarkProps = {
  size?: number
  className?: string
  glow?: boolean
}

export default function PyxisMark({
  size = 40,
  className = '',
  glow = true,
}: PyxisMarkProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(12, Math.round(size * 0.28)),
        background: 'linear-gradient(135deg, rgba(96,211,255,0.95), rgba(110,102,255,0.9) 55%, rgba(45,212,191,0.95))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: glow ? '0 16px 40px rgba(34, 211, 238, 0.24)' : 'none',
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.96" />
        <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
