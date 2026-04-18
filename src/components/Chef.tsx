import React from 'react';
import { motion } from 'framer-motion';

interface ChefProps {
  x: number;
  y: number;
  isMoving?: boolean;
  direction?: 'left' | 'right';
}

export const Chef: React.FC<ChefProps> = React.memo(function Chef({ isMoving = false, direction = 'right' }) {
  const OUTLINE = '1.5px solid #000';
  const FUR    = 'linear-gradient(160deg, #A07040 0%, #7A4A20 100%)';
  const FUR_DARK = '#5C3010';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
        animate={{
          scaleX: direction === 'left' ? -1 : 1,
          y: isMoving ? [0, -11, 0, -6, 0] : [0, -3, 0],
        }}
        transition={{
          scaleX: { duration: 0.08 },
          y: {
            duration: isMoving ? 0.3 : 2.4,
            repeat: Infinity,
            ease: isMoving ? 'easeOut' : 'easeInOut',
          },
        }}
      >

        {/* ══════════ トック・ブランシュ ＋ クマ耳 ══════════ */}
        <div style={{ position: 'relative', width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* クマ耳（帽子の後ろから覗く） */}
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute',
              top: 3,
              ...(i === 0 ? { left: 0 } : { right: 0 }),
              width: 14, height: 14,
              borderRadius: '50%',
              background: FUR_DARK,
              border: OUTLINE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8906A' }} />
            </div>
          ))}

          {/* 帽子本体（耳より前面に来る） */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 30, height: 22,
            background: 'linear-gradient(170deg, #fff 30%, #ddd 100%)',
            border: OUTLINE,
            borderRadius: '50% 50% 0 0',
            boxShadow: 'inset -4px -3px 0 rgba(0,0,0,0.12)',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 36, height: 8,
            background: 'linear-gradient(180deg, #1a2e6a 0%, #2a48a0 100%)',
            border: OUTLINE,
            marginTop: -1,
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            width: 38, height: 5,
            background: 'linear-gradient(180deg, #e8e8e8 0%, #b8b8b8 100%)',
            border: OUTLINE,
            marginTop: -1,
            borderRadius: '0 0 2px 2px',
          }} />
        </div>

        {/* ══════════ クマの顔 ══════════ */}
        <div style={{
          position: 'relative',
          width: 34, height: 32,
          background: FUR,
          border: OUTLINE,
          borderRadius: '38% 38% 46% 46%',
          marginTop: -1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 6,
          boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.14)',
        }}>
          {/* 眉毛 */}
          <div style={{ position: 'absolute', top: 5, left: '12%', width: '26%', height: 2, background: '#2A1008', borderRadius: 1, transform: 'rotate(-7deg)' }} />
          <div style={{ position: 'absolute', top: 5, right: '12%', width: '26%', height: 2, background: '#2A1008', borderRadius: 1, transform: 'rotate(7deg)' }} />

          {/* 目（まばたきアニメ維持） */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1].map(i => (
              <motion.div
                key={i}
                style={{ position: 'relative', width: 5, height: 6, background: '#0a0a1a', borderRadius: '50%' }}
                animate={{ scaleY: [1, 0.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.04, 0.14], delay: i * 0.04 }}
              >
                <div style={{ position: 'absolute', top: 1, right: 1, width: 2, height: 2, background: 'white', borderRadius: '50%' }} />
              </motion.div>
            ))}
          </div>

          {/* マズル（口周り） */}
          <div style={{
            position: 'relative',
            width: 20, height: 14,
            background: 'linear-gradient(180deg, #D4A87A 0%, #BA9060 100%)',
            borderRadius: '50%',
            marginTop: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 2,
          }}>
            {/* クマの鼻 */}
            <div style={{
              width: 11, height: 6,
              background: 'linear-gradient(180deg, #1A0A04 0%, #0D0502 100%)',
              borderRadius: '40% 40% 50% 50%',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.18)',
            }} />
            {/* 口 */}
            <svg width="14" height="7" viewBox="0 0 14 7" style={{ marginTop: 1 }}>
              <path d="M2,1 Q7,6 12,1" fill="none" stroke="#2A1008" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7,2 L7,5" fill="none" stroke="#2A1008" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>

          {/* ほっぺ */}
          <div style={{ position: 'absolute', width: 7, height: 5, background: 'rgba(220,80,60,0.32)', borderRadius: '50%', bottom: 4, left: 1 }} />
          <div style={{ position: 'absolute', width: 7, height: 5, background: 'rgba(220,80,60,0.32)', borderRadius: '50%', bottom: 4, right: 1 }} />
        </div>

        {/* ══════════ 首・スカーフ ══════════ */}
        <div style={{ position: 'relative', width: 32, height: 9, marginTop: -1 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '54%', height: '100%', background: '#f0ede8', border: OUTLINE, borderRadius: '0 0 0 3px', transformOrigin: 'top right', transform: 'rotate(4deg)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: '54%', height: '100%', background: '#f0ede8', border: OUTLINE, borderRadius: '0 0 3px 0', transformOrigin: 'top left', transform: 'rotate(-4deg)' }} />
          <div style={{
            position: 'absolute', left: '50%', marginLeft: -7, top: 0,
            width: 14, height: 11,
            background: 'linear-gradient(170deg, #e81010 0%, #a00000 100%)',
            border: OUTLINE,
            clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 50% 72%, 0% 100%)',
            zIndex: 5,
          }} />
        </div>

        {/* ══════════ コック服（腕・道具付き） ══════════ */}
        <div style={{
          position: 'relative',
          width: 40, height: 28,
          background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%)',
          border: OUTLINE,
          borderRadius: '0 0 5px 5px',
          marginTop: -1,
          boxShadow: 'inset -4px -3px 0 rgba(0,0,0,0.09)',
        }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', width: 1, background: 'rgba(0,0,0,0.12)' }} />
          {[4, 11, 19].map((t, i) => (
            <div key={i} style={{
              position: 'absolute', top: t, left: '27%',
              width: 5, height: 5,
              background: 'radial-gradient(circle at 35% 30%, #ffe060, #b87800)',
              border: '1px solid #806000',
              borderRadius: '50%',
            }} />
          ))}

          {/* 左腕 + レードル */}
          <motion.div
            style={{
              position: 'absolute', left: -8, top: 2,
              width: 8, height: 16,
              background: FUR,
              border: OUTLINE,
              borderRadius: '50%',
              transformOrigin: 'top right',
              overflow: 'visible',
            }}
            animate={{ rotate: isMoving ? [-28, 28] : [-5, 5] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          >
            <div style={{ position: 'absolute', bottom: -18, left: -3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 3, height: 9, background: 'linear-gradient(180deg, #c0c0c0 0%, #909090 100%)', border: '1px solid #606060', borderRadius: 2 }} />
              <div style={{
                width: 13, height: 11, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #e8e8e8 0%, #b0b0b0 100%)',
                border: '1.5px solid #505050',
                marginTop: -1,
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
          </motion.div>

          {/* 右腕 + フライパン */}
          <motion.div
            style={{
              position: 'absolute', right: -8, top: 2,
              width: 8, height: 16,
              background: FUR,
              border: OUTLINE,
              borderRadius: '50%',
              transformOrigin: 'top left',
              overflow: 'visible',
            }}
            animate={{ rotate: isMoving ? [28, -28] : [5, -5] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          >
            <div style={{ position: 'absolute', bottom: -20, right: -10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 3, height: 8, background: 'linear-gradient(180deg, #5a3010 0%, #3a1808 100%)', border: '1px solid #200c00', borderRadius: 2 }} />
              <div style={{
                position: 'relative',
                width: 16, height: 12, borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 35%, #404040 0%, #181818 70%)',
                border: '2px solid #080808',
                marginTop: -1,
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.12)',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: 3,
                  width: 6, height: 4, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                }} />
                {isMoving && (
                  <motion.div
                    style={{
                      position: 'absolute', top: 1, right: 1,
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'rgba(255,200,0,0.9)',
                    }}
                    animate={{ opacity: [1, 0, 1], scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════ チェック柄パンツ ══════════ */}
        <div style={{ display: 'flex', gap: 2, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div
              key={i}
              style={{
                width: 18, height: 16,
                backgroundImage: 'repeating-conic-gradient(#3a3a3a 0% 25%, #686868 0% 50%)',
                backgroundSize: '4px 4px',
                border: OUTLINE,
                borderRadius: '0 0 4px 4px',
                transformOrigin: 'top center',
              }}
              animate={{ rotate: isMoving ? (i === 0 ? [-14, 0] : [0, -14]) : 0 }}
              transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* ══════════ 靴 ══════════ */}
        <div style={{ display: 'flex', gap: 3, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div
              key={i}
              style={{
                width: 20, height: 7,
                background: 'linear-gradient(180deg, #252525 0%, #080808 100%)',
                border: OUTLINE,
                borderRadius: i === 0 ? '40% 55% 50% 38%' : '55% 40% 38% 50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
              }}
              animate={isMoving ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 0.22, repeat: Infinity, delay: i * 0.11, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* 足元のシャドウ */}
        <motion.div
          style={{
            width: 44, height: 6,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 70%)',
            marginTop: 1,
          }}
          animate={isMoving ? { scaleX: [1, 0.75, 1], opacity: [0.6, 0.3, 0.6] } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
});
