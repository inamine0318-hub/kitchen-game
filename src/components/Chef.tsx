import React from 'react';
import { motion } from 'framer-motion';

interface ChefProps {
  x: number;
  y: number;
  isMoving?: boolean;
  direction?: 'left' | 'right';
}

// ─── パレット（絵本風・暖色・低コントラスト）──────────────────────────
const C = {
  outline:     '#5A3010',                           // 焦げ茶輪郭（黒→茶）
  outlineSoft: '1.2px solid #6A4018',               // 二次輪郭
  furBase:     'linear-gradient(155deg,#C89060 0%,#9A6535 55%,#7A4820 100%)',
  furHL:       'radial-gradient(ellipse 60% 50% at 32% 28%,rgba(255,210,140,.38) 0%,transparent 100%)',
  furShadow:   'radial-gradient(ellipse 55% 45% at 72% 78%,rgba(80,35,5,.22) 0%,transparent 100%)',
  furDark:     '#5C3010',
  muzzle:      'linear-gradient(165deg,#E0B888 0%,#C9A070 55%,#B08858 100%)',
  muzzleHL:    'radial-gradient(ellipse 65% 45% at 35% 28%,rgba(255,235,180,.4) 0%,transparent 100%)',
  nose:        'linear-gradient(170deg,#2A0E06 0%,#180804 100%)',
  hatTop:      'linear-gradient(168deg,#F5F0E8 20%,#E8E0D0 80%,#D8D0C0 100%)',
  hatBand:     'linear-gradient(180deg,#1E3872 0%,#2A52A0 100%)',
  hatBrim:     'linear-gradient(180deg,#DDD5C5 0%,#C8C0B0 100%)',
  coatFront:   'linear-gradient(180deg,#F5F0EA 0%,#EAE3D8 100%)',
  coatHL:      'radial-gradient(ellipse 80% 60% at 40% 15%,rgba(255,250,240,.55) 0%,transparent 100%)',
  lapels:      'linear-gradient(170deg,#EDE8E0 0%,#DDD5C8 100%)',
  scarf:       'linear-gradient(170deg,#D63010 0%,#8C1800 100%)',
  pantsA:      '#3A3020',
  pantsB:      '#60584A',
  shoe:        'linear-gradient(180deg,#2E2010 0%,#120A04 100%)',
  button:      'radial-gradient(circle at 35% 30%,#F0D060,#9A6800)',
  eyeWhite:    'rgba(255,255,255,0.85)',
  cheek:       'rgba(210,80,55,0.30)',
};

// ─── 毛並みグラデーション合成ヘルパー ─────────────────────────────────
const furLayers = (extra = '') =>
  [C.furHL, C.furShadow, C.furBase, extra].filter(Boolean).join(', ');

export const Chef: React.FC<ChefProps> = React.memo(function Chef({ isMoving = false, direction = 'right' }) {
  const OL = `1.5px solid ${C.outline}`;    // メイン輪郭
  const OLS = C.outlineSoft;                 // やわらか輪郭

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

          {/* クマ耳（焦げ茶グラデーション＋内耳ハイライト） */}
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', top: 3,
              ...(i === 0 ? { left: 0 } : { right: 0 }),
              width: 14, height: 14, borderRadius: '50%',
              background: furLayers(),
              border: OL,
              boxShadow: `inset -2px -2px 3px rgba(0,0,0,0.18), inset 1px 1px 2px rgba(255,200,120,0.18)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 内耳（温かいピンク） */}
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%,#E8A878 0%,#C07848 100%)',
                border: `0.8px solid ${C.furDark}`,
              }} />
            </div>
          ))}

          {/* ── 帽子ドーム（プリーツ線入り） ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 30, height: 22,
            background: C.hatTop,
            border: OL,
            borderRadius: '52% 52% 0 0',
            boxShadow: `inset -3px -2px 0 rgba(0,0,0,0.08), inset 2px 2px 3px rgba(255,250,240,0.6)`,
            overflow: 'hidden',
          }}>
            {/* プリーツライン（非対称に3本） */}
            {[18, 37, 62, 80].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${10 + i * 3}%`, bottom: 0,
                left: `${pct}%`, width: i % 2 === 0 ? 1 : 1,
                background: `rgba(180,165,145,${i % 2 === 0 ? 0.38 : 0.28})`,
                borderRadius: 1,
                transform: `rotate(${i % 2 === 0 ? 1 : -0.5}deg)`,
              }} />
            ))}
            {/* ドームハイライト */}
            <div style={{
              position: 'absolute', top: 3, left: 4, width: 10, height: 6,
              background: 'rgba(255,252,245,0.55)', borderRadius: '50%',
              filter: 'blur(2px)',
            }} />
          </div>

          {/* 帽子バンド */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 36, height: 8,
            background: C.hatBand,
            border: OL, marginTop: -1,
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.18)',
          }}>
            {/* バンドの縦ライン（手描き風） */}
            {[8, 20, 78].map((x, i) => (
              <div key={i} style={{
                position: 'absolute', top: 1, bottom: 1, left: `${x}%`,
                width: 1, background: 'rgba(255,255,255,0.12)',
              }} />
            ))}
          </div>

          {/* 帽子ブリム（温かみのあるグレー） */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 38, height: 5,
            background: C.hatBrim,
            border: OL, marginTop: -1,
            borderRadius: '0 0 3px 3px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          }} />
        </div>

        {/* ══════════ クマの顔（多層グラデーション） ══════════ */}
        <div style={{
          position: 'relative',
          width: 34, height: 32,
          background: furLayers(),
          border: OL,
          borderRadius: '40% 40% 48% 48%',
          marginTop: -1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6,
          boxShadow: `inset -3px -3px 4px rgba(0,0,0,0.13), inset 2px 2px 4px rgba(255,200,120,0.12)`,
          overflow: 'hidden',
        }}>
          {/* 顔ハイライト（右斜め） */}
          <div style={{
            position: 'absolute', top: 2, left: 3, width: 12, height: 10,
            background: 'radial-gradient(ellipse,rgba(255,225,160,0.32) 0%,transparent 100%)',
            borderRadius: '50%',
          }} />

          {/* 眉毛（少し太めのブラウン） */}
          <div style={{ position: 'absolute', top: 5, left: '11%', width: '27%', height: 2.5, background: `linear-gradient(90deg,transparent,${C.furDark} 30%,${C.furDark} 70%,transparent)`, borderRadius: 2, transform: 'rotate(-6deg)' }} />
          <div style={{ position: 'absolute', top: 5, right: '11%', width: '27%', height: 2.5, background: `linear-gradient(90deg,transparent,${C.furDark} 30%,${C.furDark} 70%,transparent)`, borderRadius: 2, transform: 'rotate(6deg)' }} />

          {/* 目（まばたきアニメーション維持） */}
          <div style={{ display: 'flex', gap: 9 }}>
            {[0, 1].map(i => (
              <motion.div key={i}
                style={{ position: 'relative', width: 5, height: 6, background: '#1A0A04', borderRadius: '50%', boxShadow: `0 0 0 1px rgba(90,48,16,0.5)` }}
                animate={{ scaleY: [1, 0.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.04, 0.14], delay: i * 0.04 }}
              >
                <div style={{ position: 'absolute', top: 1, right: 1, width: 2, height: 2, background: C.eyeWhite, borderRadius: '50%' }} />
              </motion.div>
            ))}
          </div>

          {/* マズル（口周り・水彩風） */}
          <div style={{
            position: 'relative',
            width: 20, height: 14, borderRadius: '50%',
            background: [C.muzzleHL, C.muzzle].join(', '),
            border: OLS,
            marginTop: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2,
            boxShadow: 'inset -1px -1px 3px rgba(0,0,0,0.1), inset 1px 1px 2px rgba(255,240,200,0.3)',
          }}>
            {/* クマ鼻（丸みのある逆三角） */}
            <div style={{
              width: 11, height: 7, borderRadius: '38% 38% 52% 52%',
              background: C.nose,
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.35)',
            }} />
            {/* 口（柔らかなカーブ） */}
            <svg width="14" height="7" viewBox="0 0 14 7" style={{ marginTop: 1 }}>
              <path d="M2,1.5 Q7,6.5 12,1.5" fill="none" stroke={C.outline} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M7,3 L7,5.2" fill="none" stroke={C.outline} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>

          {/* ほっぺ */}
          <div style={{ position: 'absolute', width: 7, height: 5, background: C.cheek, borderRadius: '50%', bottom: 4, left: 0, filter: 'blur(1.5px)' }} />
          <div style={{ position: 'absolute', width: 7, height: 5, background: C.cheek, borderRadius: '50%', bottom: 4, right: 0, filter: 'blur(1.5px)' }} />
        </div>

        {/* ══════════ 首・スカーフ ══════════ */}
        <div style={{ position: 'relative', width: 32, height: 9, marginTop: -1 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '54%', height: '100%', background: C.lapels, border: OLS, borderRadius: '0 0 0 3px', transformOrigin: 'top right', transform: 'rotate(4deg)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: '54%', height: '100%', background: C.lapels, border: OLS, borderRadius: '0 0 3px 0', transformOrigin: 'top left', transform: 'rotate(-4deg)' }} />
          <div style={{
            position: 'absolute', left: '50%', marginLeft: -7, top: 0,
            width: 14, height: 11,
            background: C.scarf,
            border: OL,
            clipPath: 'polygon(15% 0%,85% 0%,100% 100%,50% 72%,0% 100%)',
            zIndex: 5,
            boxShadow: 'inset 0 2px 3px rgba(255,100,80,0.3)',
          }} />
        </div>

        {/* ══════════ コック服（リネン質感）══════════ */}
        <div style={{
          position: 'relative', width: 40, height: 28,
          background: [C.coatHL, C.coatFront].join(', '),
          border: OL,
          borderRadius: '0 0 5px 5px', marginTop: -1,
          boxShadow: `inset -3px -2px 0 rgba(0,0,0,0.07), inset 2px 2px 4px rgba(255,250,240,0.45)`,
          overflow: 'hidden',
        }}>
          {/* リネン縦糸（微細テクスチャ） */}
          {[6, 14, 22, 30].map(x => (
            <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 0.8, background: 'rgba(180,165,148,0.13)' }} />
          ))}
          {/* 前立て線（少し非対称） */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', width: 1, background: 'rgba(0,0,0,0.10)' }} />
          {/* ボタン（ゴールド調） */}
          {[4, 11, 19].map((t, i) => (
            <div key={i} style={{
              position: 'absolute', top: t, left: `${27 + (i % 2 === 0 ? 0 : 1)}%`,
              width: 5, height: 5,
              background: C.button,
              border: `1px solid #7A5000`,
              borderRadius: '50%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }} />
          ))}

          {/* 左腕（クマ毛並み） */}
          <motion.div style={{
            position: 'absolute', left: -8, top: 2,
            width: 8, height: 16,
            background: furLayers(),
            border: OL, borderRadius: '50%',
            transformOrigin: 'top right', overflow: 'visible',
            boxShadow: `inset -2px -2px 3px rgba(0,0,0,0.15)`,
          }}
            animate={{ rotate: isMoving ? [-28, 28] : [-5, 5] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          >
            {/* レードル */}
            <div style={{ position: 'absolute', bottom: -18, left: -3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 3, height: 9, background: 'linear-gradient(180deg,#B0B0A8 0%,#808078 100%)', border: `1px solid #505048`, borderRadius: 2 }} />
              <div style={{
                width: 13, height: 11, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%,#E0E0D8 0%,#A0A098 100%)',
                border: '1.5px solid #484840',
                marginTop: -1,
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.25)',
              }} />
            </div>
          </motion.div>

          {/* 右腕（クマ毛並み） */}
          <motion.div style={{
            position: 'absolute', right: -8, top: 2,
            width: 8, height: 16,
            background: furLayers(),
            border: OL, borderRadius: '50%',
            transformOrigin: 'top left', overflow: 'visible',
            boxShadow: `inset 2px -2px 3px rgba(0,0,0,0.15)`,
          }}
            animate={{ rotate: isMoving ? [28, -28] : [5, -5] }}
            transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          >
            {/* フライパン */}
            <div style={{ position: 'absolute', bottom: -20, right: -10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 3, height: 8, background: 'linear-gradient(180deg,#5A3010 0%,#2A1008 100%)', border: `1px solid #1A0800`, borderRadius: 2 }} />
              <div style={{
                position: 'relative', width: 16, height: 12, borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 35%,#484038 0%,#181410 70%)',
                border: `2px solid #0A0806`, marginTop: -1,
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.10)',
              }}>
                <div style={{ position: 'absolute', top: 2, left: 3, width: 6, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                {isMoving && (
                  <motion.div style={{ position: 'absolute', top: 1, right: 1, width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,195,0,0.88)' }}
                    animate={{ opacity: [1, 0, 1], scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════ チェック柄パンツ（暖色系） ══════════ */}
        <div style={{ display: 'flex', gap: 2, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div key={i} style={{
              width: 18, height: 16,
              backgroundImage: `repeating-conic-gradient(${C.pantsA} 0% 25%,${C.pantsB} 0% 50%)`,
              backgroundSize: '4px 4px',
              border: OL,
              borderRadius: '0 0 4px 4px', transformOrigin: 'top center',
              boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.18)`,
            }}
              animate={{ rotate: isMoving ? (i === 0 ? [-14, 0] : [0, -14]) : 0 }}
              transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* ══════════ 靴（濃いブラウン） ══════════ */}
        <div style={{ display: 'flex', gap: 3, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div key={i} style={{
              width: 20, height: 7,
              background: C.shoe,
              border: OL,
              borderRadius: i === 0 ? '40% 55% 50% 38%' : '55% 40% 38% 50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,200,140,0.08)',
            }}
              animate={isMoving ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 0.22, repeat: Infinity, delay: i * 0.11, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* 足元のシャドウ */}
        <motion.div style={{
          width: 44, height: 6,
          background: 'radial-gradient(ellipse,rgba(0,0,0,0.38) 0%,transparent 70%)',
          marginTop: 1,
        }}
          animate={isMoving ? { scaleX: [1, 0.75, 1], opacity: [0.6, 0.3, 0.6] } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
});
