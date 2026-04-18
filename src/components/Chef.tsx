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
  outline:   '#5A3010',
  furBase:   'linear-gradient(155deg,#C89060 0%,#9A6535 55%,#7A4820 100%)',
  furHL:     'radial-gradient(ellipse 60% 50% at 32% 28%,rgba(255,210,140,.38) 0%,transparent 100%)',
  furShadow: 'radial-gradient(ellipse 55% 45% at 72% 78%,rgba(80,35,5,.22) 0%,transparent 100%)',
  furDark:   '#5C3010',
  muzzle:    'linear-gradient(165deg,#E0B888 0%,#C9A070 55%,#B08858 100%)',
  muzzleHL:  'radial-gradient(ellipse 65% 45% at 35% 28%,rgba(255,235,180,.4) 0%,transparent 100%)',
  nose:      'linear-gradient(170deg,#2A0E06 0%,#180804 100%)',
  coatFront: 'linear-gradient(180deg,#F5F0EA 0%,#EAE3D8 100%)',
  coatHL:    'radial-gradient(ellipse 80% 60% at 40% 15%,rgba(255,250,240,.55) 0%,transparent 100%)',
  cuff:      'linear-gradient(180deg,#E8E0D4 0%,#C8B8A8 100%)',
  lapels:    'linear-gradient(170deg,#EDE8E0 0%,#DDD5C8 100%)',
  scarf:     'linear-gradient(170deg,#D63010 0%,#8C1800 100%)',
  pantsA:    '#3A3020',
  pantsB:    '#60584A',
  shoe:      'linear-gradient(180deg,#2E2010 0%,#120A04 100%)',
  button:    'radial-gradient(circle at 35% 30%,#F0D060,#9A6800)',
  cheek:     'rgba(210,80,55,0.30)',
};

const furLayers = (extra = '') =>
  [C.furHL, C.furShadow, C.furBase, extra].filter(Boolean).join(', ');

export const Chef: React.FC<ChefProps> = React.memo(function Chef({ isMoving = false, direction = 'right' }) {
  const OL  = `1.5px solid ${C.outline}`;
  const OLS = `1.2px solid ${C.outline}`;

  // ─── 腕（coat より高い zIndex で独立レイヤーとして描画）─────────
  // 外側 motion.div（position:relative）を基準に絶対配置する。
  // coat top は head(22) + face(30) + neck(9) - marginTop(1) = 60px
  // 腕は coat の top:1 位置 → outer motion.div から 61px
  const ARM_TOP = 61;

  const armLeft = (
    <motion.div
      style={{
        position: 'absolute',
        left: -8,        // coat 左端に合わせる（coat は outer div 内で中央 2px オフセット）
        top: ARM_TOP,
        width: 12,
        height: 28,
        transformOrigin: 'top right',
        overflow: 'visible',
        zIndex: 30,      // pants・coat・全要素より前面
      }}
      animate={{ rotate: isMoving ? [-30, 30] : [-6, 6] }}
      transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      {/* 袖（コート白） */}
      <div style={{
        position: 'absolute', top: 0, left: 1, right: 1, height: 14,
        background: C.coatFront,
        border: OL,
        borderRadius: '45% 45% 0 0',
        boxShadow: 'inset -2px -1px 0 rgba(0,0,0,.07), inset 1px 2px 0 rgba(255,255,255,.4)',
      }} />
      {/* カフスバンド（袖口・やや濃い色で境界を強調） */}
      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, height: 5,
        background: C.cuff,
        border: OL,
        borderRadius: '0 0 2px 2px',
        boxShadow: '0 2px 3px rgba(0,0,0,.18)',
      }} />
      {/* 前足（クマの手・袖口からはっきり出ている） */}
      <div style={{
        position: 'absolute', top: 16, left: -2, right: -2, bottom: 0,
        background: furLayers(),
        border: OL,
        borderTop: 'none',
        borderRadius: '0 0 60% 60%',
        boxShadow: 'inset -2px -3px 4px rgba(0,0,0,.18), inset 1px 2px 3px rgba(255,210,130,.20)',
      }} />
      {/* 握りしわ（手らしさを演出） */}
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0, height: 1,
        background: `rgba(90,48,16,.22)`,
        borderRadius: 1,
      }} />

      {/* ── レードル（おたま）── */}
      {/* グリップ：前足の中央から自然に伸びる */}
      <div style={{
        position: 'absolute', bottom: -14, left: '50%', marginLeft: -2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* グリップ本体 */}
        <div style={{
          width: 4, height: 16,
          background: 'linear-gradient(180deg,#D8D8D0 0%,#909088 60%,#686860 100%)',
          border: `1px solid ${C.outline}`,
          borderRadius: '2px 2px 1px 1px',
          boxShadow: '1px 0 3px rgba(0,0,0,.28), -1px 0 1px rgba(255,255,255,.15)',
        }} />
        {/* おたまヘッド */}
        <div style={{
          width: 18, height: 15, borderRadius: '50%',
          background: 'radial-gradient(circle at 28% 22%,#F8F8F0 0%,#C8C8C0 40%,#888880 100%)',
          border: `1.5px solid ${C.outline}`,
          marginTop: -3,
          boxShadow: [
            'inset 0 4px 6px rgba(255,255,255,.70)',
            'inset 0 -3px 5px rgba(0,0,0,.28)',
            '0 3px 5px rgba(0,0,0,.40)',
          ].join(', '),
        }} />
      </div>
    </motion.div>
  );

  const armRight = (
    <motion.div
      style={{
        position: 'absolute',
        right: -8,       // coat 右端に合わせる
        top: ARM_TOP,
        width: 12,
        height: 28,
        transformOrigin: 'top left',
        overflow: 'visible',
        zIndex: 30,
      }}
      animate={{ rotate: isMoving ? [30, -30] : [6, -6] }}
      transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      {/* 袖 */}
      <div style={{
        position: 'absolute', top: 0, left: 1, right: 1, height: 14,
        background: C.coatFront,
        border: OL,
        borderRadius: '45% 45% 0 0',
        boxShadow: 'inset 2px -1px 0 rgba(0,0,0,.07), inset -1px 2px 0 rgba(255,255,255,.4)',
      }} />
      {/* カフスバンド */}
      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, height: 5,
        background: C.cuff,
        border: OL,
        borderRadius: '0 0 2px 2px',
        boxShadow: '0 2px 3px rgba(0,0,0,.18)',
      }} />
      {/* 前足（クマの手） */}
      <div style={{
        position: 'absolute', top: 16, left: -2, right: -2, bottom: 0,
        background: furLayers(),
        border: OL,
        borderTop: 'none',
        borderRadius: '0 0 60% 60%',
        boxShadow: 'inset 2px -3px 4px rgba(0,0,0,.18), inset -1px 2px 3px rgba(255,210,130,.20)',
      }} />
      {/* 握りしわ */}
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0, height: 1,
        background: `rgba(90,48,16,.22)`,
        borderRadius: 1,
      }} />

      {/* ── フライパン ── */}
      <div style={{
        position: 'absolute', bottom: -13, left: '50%', marginLeft: -2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* ハンドル */}
        <div style={{
          width: 4, height: 14,
          background: 'linear-gradient(180deg,#7A4020 0%,#3C1808 60%,#200C04 100%)',
          border: '1px solid #200800',
          borderRadius: '2px 2px 1px 1px',
          boxShadow: '-1px 0 3px rgba(0,0,0,.35), 1px 0 1px rgba(255,200,120,.10)',
        }} />
        {/* フライパン本体 */}
        <div style={{
          position: 'relative', width: 20, height: 16, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 28%,#605850 0%,#282018 60%,#100C08 100%)',
          border: '2px solid #0A0806',
          marginTop: -3,
          boxShadow: [
            'inset 0 4px 6px rgba(255,255,255,.13)',
            'inset 0 -3px 5px rgba(0,0,0,.45)',
            '0 3px 6px rgba(0,0,0,.55)',
          ].join(', '),
        }}>
          {/* 鉄鍋ハイライト */}
          <div style={{
            position: 'absolute', top: 3, left: 4, width: 8, height: 5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.18)',
          }} />
          {/* 調理中の炎スパーク */}
          {isMoving && (
            <motion.div
              style={{
                position: 'absolute', top: 2, right: 2, width: 6, height: 6,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 40%,rgba(255,240,80,1) 0%,rgba(255,140,0,.9) 50%,rgba(255,60,0,.5) 100%)',
              }}
              animate={{ opacity: [1, 0.2, 1], scale: [1, 1.6, 1] }}
              transition={{ repeat: Infinity, duration: 0.18 }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );

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
        {/* ── 腕（全レイヤー最前面 zIndex:30）── */}
        {armLeft}
        {armRight}

        {/* ══════════ 頭部（帽子なし・丸耳＋頭頂ドーム） ══════════ */}
        <div style={{ position: 'relative', width: 44, height: 22, flexShrink: 0 }}>

          {/* クマ耳（2つ、頭頂部の両脇） */}
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', top: 0,
              ...(i === 0 ? { left: 1 } : { right: 1 }),
              width: 14, height: 14,
              borderRadius: '50%',
              background: furLayers(),
              border: OL,
              zIndex: 0,
              boxShadow: 'inset -2px -2px 3px rgba(0,0,0,.20), inset 1px 1px 2px rgba(255,200,120,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 内耳 */}
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%,#E8A878 0%,#C07848 100%)',
                border: `0.8px solid ${C.furDark}`,
              }} />
            </div>
          ))}

          {/* 頭頂部ドーム（丸く可愛い頭・耳より前面） */}
          <div style={{
            position: 'absolute', bottom: 0, left: 5, width: 34, height: 16,
            background: furLayers(),
            borderTop: OL, borderLeft: OL, borderRight: OL, borderBottom: 'none',
            borderRadius: '52% 52% 0 0',
            zIndex: 1,
            boxShadow: [
              'inset -3px -1px 3px rgba(0,0,0,.10)',
              'inset 2px 3px 4px rgba(255,210,120,.18)',
            ].join(', '),
            overflow: 'hidden',
          }}>
            {/* 頭頂ハイライト */}
            <div style={{
              position: 'absolute', top: 2, left: 5, width: 14, height: 9,
              background: 'radial-gradient(ellipse,rgba(255,225,160,.42) 0%,transparent 100%)',
              borderRadius: '50%', filter: 'blur(2px)',
            }} />
          </div>
        </div>

        {/* ══════════ クマの顔（頭頂ドームにシームレス接続） ══════════ */}
        <div style={{
          position: 'relative',
          width: 34, height: 30,
          background: furLayers(),
          borderLeft: OL, borderRight: OL, borderBottom: OL, borderTop: 'none',
          borderRadius: '0 0 48% 48%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5,
          boxShadow: 'inset -3px -3px 4px rgba(0,0,0,.13), inset 2px 2px 4px rgba(255,200,120,.12)',
          overflow: 'hidden',
        }}>
          {/* 顔ハイライト */}
          <div style={{
            position: 'absolute', top: 2, left: 3, width: 12, height: 10,
            background: 'radial-gradient(ellipse,rgba(255,225,160,.30) 0%,transparent 100%)',
            borderRadius: '50%',
          }} />

          {/* 眉毛 */}
          <div style={{ position: 'absolute', top: 4, left: '11%', width: '27%', height: 2.5, background: `linear-gradient(90deg,transparent,${C.furDark} 30%,${C.furDark} 70%,transparent)`, borderRadius: 2, transform: 'rotate(-6deg)' }} />
          <div style={{ position: 'absolute', top: 4, right: '11%', width: '27%', height: 2.5, background: `linear-gradient(90deg,transparent,${C.furDark} 30%,${C.furDark} 70%,transparent)`, borderRadius: 2, transform: 'rotate(6deg)' }} />

          {/* 目（まばたきアニメーション） */}
          <div style={{ display: 'flex', gap: 9 }}>
            {[0, 1].map(i => (
              <motion.div key={i}
                style={{ position: 'relative', width: 5, height: 6, background: '#1A0A04', borderRadius: '50%', boxShadow: '0 0 0 1px rgba(90,48,16,.5)' }}
                animate={{ scaleY: [1, 0.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.04, 0.14], delay: i * 0.04 }}
              >
                <div style={{ position: 'absolute', top: 1, right: 1, width: 2, height: 2, background: 'rgba(255,255,255,0.85)', borderRadius: '50%' }} />
              </motion.div>
            ))}
          </div>

          {/* マズル */}
          <div style={{
            position: 'relative',
            width: 20, height: 14, borderRadius: '50%',
            background: [C.muzzleHL, C.muzzle].join(', '),
            border: OLS,
            marginTop: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2,
            boxShadow: 'inset -1px -1px 3px rgba(0,0,0,.10), inset 1px 1px 2px rgba(255,240,200,.30)',
          }}>
            <div style={{
              width: 11, height: 7, borderRadius: '38% 38% 52% 52%',
              background: C.nose,
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.35)',
            }} />
            <svg width="14" height="7" viewBox="0 0 14 7" style={{ marginTop: 1 }}>
              <path d="M2,1.5 Q7,6.5 12,1.5" fill="none" stroke={C.outline} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M7,3 L7,5.2"           fill="none" stroke={C.outline} strokeWidth="1"   strokeLinecap="round" />
            </svg>
          </div>

          {/* ほっぺ */}
          <div style={{ position: 'absolute', width: 7, height: 5, background: C.cheek, borderRadius: '50%', bottom: 4, left: 0, filter: 'blur(1.5px)' }} />
          <div style={{ position: 'absolute', width: 7, height: 5, background: C.cheek, borderRadius: '50%', bottom: 4, right: 0, filter: 'blur(1.5px)' }} />
        </div>

        {/* ══════════ 首・スカーフ ══════════ */}
        <div style={{ position: 'relative', width: 32, height: 9 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '54%', height: '100%', background: C.lapels, border: OLS, borderRadius: '0 0 0 3px', transformOrigin: 'top right', transform: 'rotate(4deg)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: '54%', height: '100%', background: C.lapels, border: OLS, borderRadius: '0 0 3px 0', transformOrigin: 'top left', transform: 'rotate(-4deg)' }} />
          <div style={{
            position: 'absolute', left: '50%', marginLeft: -7, top: 0,
            width: 14, height: 11,
            background: C.scarf, border: OL,
            clipPath: 'polygon(15% 0%,85% 0%,100% 100%,50% 72%,0% 100%)',
            zIndex: 5,
            boxShadow: 'inset 0 2px 3px rgba(255,100,80,.30)',
          }} />
        </div>

        {/* ══════════ コック服（腕は外部レイヤー化したためここには含めない） ══════════ */}
        <div style={{
          position: 'relative', width: 40, height: 28,
          background: [C.coatHL, C.coatFront].join(', '),
          border: OL,
          borderRadius: '0 0 5px 5px', marginTop: -1,
          boxShadow: 'inset -3px -2px 0 rgba(0,0,0,.07), inset 2px 2px 4px rgba(255,250,240,.45)',
          zIndex: 2,
        }}>
          {/* リネン縦糸テクスチャ */}
          {[6, 14, 22, 30].map(x => (
            <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 0.8, background: 'rgba(180,165,148,.13)' }} />
          ))}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', width: 1, background: 'rgba(0,0,0,.10)' }} />
          {/* ボタン */}
          {[4, 11, 19].map((t, i) => (
            <div key={i} style={{
              position: 'absolute', top: t, left: `${27 + (i % 2 === 0 ? 0 : 1)}%`,
              width: 5, height: 5, background: C.button,
              border: '1px solid #7A5000', borderRadius: '50%',
              boxShadow: '0 1px 2px rgba(0,0,0,.30)',
            }} />
          ))}
        </div>

        {/* ══════════ チェック柄パンツ ══════════ */}
        <div style={{ display: 'flex', gap: 2, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div key={i} style={{
              width: 18, height: 16,
              backgroundImage: `repeating-conic-gradient(${C.pantsA} 0% 25%,${C.pantsB} 0% 50%)`,
              backgroundSize: '4px 4px',
              border: OL,
              borderRadius: '0 0 4px 4px', transformOrigin: 'top center',
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,.18)',
            }}
              animate={{ rotate: isMoving ? (i === 0 ? [-14, 0] : [0, -14]) : 0 }}
              transition={{ duration: 0.22, repeat: Infinity, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* ══════════ 靴 ══════════ */}
        <div style={{ display: 'flex', gap: 3, marginTop: -1 }}>
          {[0, 1].map(i => (
            <motion.div key={i} style={{
              width: 20, height: 7,
              background: C.shoe, border: OL,
              borderRadius: i === 0 ? '40% 55% 50% 38%' : '55% 40% 38% 50%',
              boxShadow: '0 2px 4px rgba(0,0,0,.45), inset 0 1px 2px rgba(255,200,140,.08)',
            }}
              animate={isMoving ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 0.22, repeat: Infinity, delay: i * 0.11, repeatType: 'reverse' }}
            />
          ))}
        </div>

        {/* 足元シャドウ */}
        <motion.div style={{
          width: 44, height: 6,
          background: 'radial-gradient(ellipse,rgba(0,0,0,.38) 0%,transparent 70%)',
          marginTop: 1,
        }}
          animate={isMoving ? { scaleX: [1, 0.75, 1], opacity: [0.6, 0.3, 0.6] } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
});
