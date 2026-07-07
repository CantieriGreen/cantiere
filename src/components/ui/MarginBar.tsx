type Props = {
  value: number
  max: number
}

export function MarginBar({ value, max }: Props) {
  const positive = value >= 0
  const pctW = Math.min(100, (Math.abs(value) / Math.max(max, 1)) * 100)
  return (
    <div className="flex items-center w-full">
      <div className="flex-1 h-7 bg-line-soft/60 rounded-md relative overflow-hidden flex">
        <div className="w-1/2 relative flex justify-end">
          {!positive && (
            <div className="h-full bg-bad/80" style={{ width: `${pctW}%` }} />
          )}
        </div>
        <div className="w-px bg-line-strong" />
        <div className="w-1/2 relative">
          {positive && (
            <div className="h-full bg-good/85" style={{ width: `${pctW}%` }} />
          )}
        </div>
      </div>
    </div>
  )
}
