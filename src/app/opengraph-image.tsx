import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'CheckMate - Create, share, and track checklist templates';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            backgroundColor: '#10B981',
            borderRadius: 20,
            marginBottom: 32,
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 12 10 16 18 8" />
          </svg>
        </div>

        {/* Brand Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
          }}
        >
          CheckMate
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#94A3B8',
          }}
        >
          Create, share, and track checklist templates
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 48,
            marginTop: 48,
          }}
        >
          {['Reusable templates', 'Progress tracking', 'Collaboration'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#64748B',
                  fontSize: 20,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    border: '2px solid #10B981',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 12 10 16 18 8" />
                  </svg>
                </div>
                {feature}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
