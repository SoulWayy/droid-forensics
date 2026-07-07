import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Sequence,
  Series,
  Img,
  staticFile,
} from 'remotion';

const DARK = '#050505';
const RED = '#f43f5e';
const AMBER = '#fbbf24';
const EMERALD = '#10b981';
const VIOLET = '#a78bfa';
const WHITE = '#e5e5e5';

const STEPS = [
  { label: 'External trigger', sub: 'LLM API response arrives', color: AMBER, metric: '31,994×' },
  { label: 'Notification', sub: 'JSON-RPC to TUI', color: AMBER, metric: '15 types' },
  { label: 'Re-render', sub: 'Header.tsx useMemo', color: AMBER, metric: '209×' },
  { label: 'statSync', sub: 'Sync I/O in render path', color: RED, metric: '477×' },
  { label: 'CPU 56%', sub: 'Event loop blocked', color: RED, metric: '168ms render' },
  { label: 'Dup keys', sub: 'React can\'t reconcile', color: '#f97316', metric: '70×' },
  { label: 'Max depth', sub: 'Render loop detected', color: '#f97316', metric: '8×' },
  { label: 'Degraded', sub: '6fps instead of 60fps', color: RED, metric: '💥' },
];

const StepCard: React.FC<{ step: typeof STEPS[0]; index: number; startFrame: number; duration: number }> = ({
  step,
  index,
  startFrame,
  duration,
}) => {
  const frame = useCurrentFrame();

  const localFrame = frame - startFrame;
  const opacity = interpolate(localFrame, [0, 8, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(localFrame, [0, 12], [0.8, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const translateY = interpolate(localFrame, [0, 12], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          background: 'rgba(255,255,255,0.03)',
          border: `2px solid ${step.color}44`,
          borderRadius: 24,
          padding: 60,
          textAlign: 'center',
          boxShadow: `0 0 60px ${step.color}22`,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontFamily: 'monospace',
            color: step.color,
            letterSpacing: 3,
            marginBottom: 16,
            textTransform: 'uppercase',
          }}
        >
          Step {String(index + 1).padStart(2, '0')}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: WHITE,
            marginBottom: 16,
            fontFamily: 'sans-serif',
          }}
        >
          {step.label}
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 32,
            fontFamily: 'sans-serif',
          }}
        >
          {step.sub}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: step.color,
            fontFamily: 'monospace',
          }}
        >
          {step.metric}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DeathSpiral: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const stepDuration = 28; // frames per step

  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* Ambient gradient orbs */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,58,237,0.08) 0%, transparent 60%),
                       radial-gradient(ellipse 50% 40% at 80% 30%, rgba(16,185,129,0.04) 0%, transparent 50%),
                       radial-gradient(ellipse 40% 30% at 50% 80%, rgba(244,63,94,0.06) 0%, transparent 40%)`,
        }}
      />

      {/* Title sequence (first 20 frames) */}
      <Sequence from={0} durationInFrames={20}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              opacity: interpolate(frame, [0, 10, 15, 20], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
              Case File 0164
            </div>
            <div style={{ fontSize: 80, fontWeight: 700, color: WHITE, fontFamily: 'sans-serif' }}>
              Render Death Spiral
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 8 steps */}
      {STEPS.map((step, i) => (
        <Series.Sequence key={i} durationInFrames={stepDuration}>
          <StepCard step={step} index={i} startFrame={0} duration={stepDuration} />
        </Series.Sequence>
      ))}

      {/* Final verdict */}
      <Sequence from={20 + 8 * stepDuration} durationInFrames={30}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              opacity: interpolate(frame - (20 + 8 * stepDuration), [0, 10, 25, 30], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, color: EMERALD, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>
              Verdict
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, color: WHITE, fontFamily: 'sans-serif', marginBottom: 24, lineHeight: 1.3 }}>
              Sync I/O in render path
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
              Fix: useEffect + async instead of useMemo + statSync
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Progress bar at bottom */}
      <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
        <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.05)' }}>
          <div
            style={{
              height: '100%',
              width: `${(frame / durationInFrames) * 100}%`,
              background: `linear-gradient(90deg, ${EMERALD}, ${AMBER}, ${RED})`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
