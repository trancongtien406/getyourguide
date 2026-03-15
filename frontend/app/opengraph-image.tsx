import { ImageResponse } from 'next/og';

export const alt = 'GetYourGuide - Book Tours & Activities';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 50%, #0c4a6e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            maxWidth: '90%',
          }}
        >
          GetYourGuide
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 28,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Book Tours & Activities Worldwide
        </div>
      </div>
    ),
    { ...size }
  );
}
