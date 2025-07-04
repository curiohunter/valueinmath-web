import { ImageResponse } from 'next/og'

// Apple icon
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '30px',
        }}
      >
        📚
      </div>
    ),
    {
      ...size,
    }
  )
}