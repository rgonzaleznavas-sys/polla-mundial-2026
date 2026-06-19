import { flagUrl } from '../lib/matches'

export default function Flag({ team, size = 20 }) {
  const url = flagUrl(team, 40)
  if (!url) return null
  return (
    <img
      src={url}
      alt={team}
      style={{
        width: size,
        height: size * 0.7,
        objectFit: 'cover',
        borderRadius: 3,
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
      }}
      loading="lazy"
    />
  )
}
