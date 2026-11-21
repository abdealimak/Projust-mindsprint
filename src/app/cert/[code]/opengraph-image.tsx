import { ImageResponse } from 'next/og';
import { getCertificateByCode } from '@/lib/data';

/** Social preview card for a shared /cert/[code] link (LinkedIn, X, Slack, WhatsApp). */
export const runtime = 'nodejs';
export const alt = 'Projust certificate of understanding';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const C = { paper: '#F3F1EC', ink: '#111110', muted: '#6B675F', line: '#DEDAD1', lime: '#CDEB5A', olive: '#6B7F1F' };

export default async function Image({ params }: { params: { code: string } }) {
  const cert = await getCertificateByCode(params.code).catch(() => null);
  const name = cert?.recipient_name || 'Certificate not found';
  const repo = cert?.repo_full_name || '';
  const score = cert ? Math.round(cert.overall) : null;
  const level = cert?.level || '';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.paper, padding: 48, fontFamily: 'sans-serif' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            border: `2px solid ${C.line}`,
            borderRadius: 28,
            padding: '48px 56px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: C.ink }}>Projust°</div>
            <div style={{ fontSize: 22, color: C.muted, letterSpacing: 3 }}>CERTIFICATE OF UNDERSTANDING</div>
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 720 }}>
              <div style={{ fontSize: 24, color: C.muted }}>Awarded to</div>
              <div style={{ fontSize: name.length > 24 ? 64 : 84, color: C.ink, lineHeight: 1.05, marginTop: 8 }}>{name}</div>
              {repo && (
                <div style={{ display: 'flex', fontSize: 28, color: C.muted, marginTop: 24 }}>
                  for the code in&nbsp;<span style={{ color: C.ink, fontWeight: 600 }}>{repo}</span>
                </div>
              )}
            </div>
            {score !== null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 220,
                  height: 220,
                  borderRadius: 28,
                  background: C.lime,
                  color: C.ink,
                }}
              >
                <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: 22, marginTop: 6 }}>average of six skills</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: C.muted }}>
            <span style={{ color: C.olive, fontWeight: 600 }}>{level ? `${level} · ` : ''}Verified by Projust</span>
            <span>{params.code}</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
