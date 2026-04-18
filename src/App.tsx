/**
 * Pocket Kitchen - App.tsx
 * 機能: コンボシステム / トラブルシステム / 時間停止 追加版
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Chef } from './components/Chef';
import {
  DISHES, STATIONS, GAME_DURATION, STATION_ICONS, REGULAR_CUSTOMERS, STAGES,
} from './constants';
import { Order, StationType, GameState, Popup, OrderType } from './types';
import { CheckCircle2, AlertTriangle, ChefHat } from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────────────────
type TroubleType = 'OVEN_BROKEN' | 'OIL_SPILL' | 'STOVE_BROKEN';

interface ComboPopup {
  count: number;
  bonus: number;
  freeze: number; // 時間停止秒数（0なら停止なし）
}

// ─── コンボ報酬テーブル ────────────────────────────────────────────────
function getComboReward(count: number): { bonus: number; freeze: number } {
  if (count >= 8) return { bonus: 1000, freeze: 5 };
  if (count >= 5) return { bonus: 500,  freeze: 3 };
  if (count >= 3) return { bonus: 250,  freeze: 2 };
  if (count >= 2) return { bonus: 100,  freeze: 0 };
  return { bonus: 0, freeze: 0 };
}

// ─── ランク取得 ────────────────────────────────────────────────────────
function getScoreRank(score: number) {
  if (score > 3000) return { label: 'LÉGENDAIRE',    rank: 'S', ja: '伝説級', stars: '★★★★★', color: '#c8a000' };
  if (score > 1500) return { label: 'EXCELLENT',     rank: 'A', ja: '一流',   stars: '★★★★☆', color: '#d4af37' };
  if (score > 800)  return { label: 'ACCEPTABLE',    rank: 'B', ja: '普通',   stars: '★★★☆☆', color: '#888'    };
  if (score > 300)  return { label: 'MÉDIOCRE',      rank: 'C', ja: '凡庸',   stars: '★★☆☆☆', color: '#a06030' };
  return                   { label: 'CATASTROPHIQUE', rank: 'D', ja: '惨劇',  stars: '★☆☆☆☆', color: '#800000' };
}

// ─── 油エリア生成（意味ある位置・閉じ込め防止付き） ────────────────────
/**
 * 油こぼれタイルの座標を決定する純粋関数。
 * - ステーション・プレイヤー位置には出さない
 * - 中央通路を優先して配置
 * - プレイヤーが完全に閉じ込められないようチェック
 */
function generateOilTiles(
  chefPos: { x: number; y: number },
  stationPositions: { x: number; y: number }[],
): { x: number; y: number }[] {
  const inBounds  = (x: number, y: number) => x >= 0 && x <= 4 && y >= 0 && y <= 4;
  const onStation = (x: number, y: number) => stationPositions.some(p => p.x === x && p.y === y);
  const onChef    = (x: number, y: number) => x === chefPos.x && y === chefPos.y;
  const isValid   = (x: number, y: number) => inBounds(x, y) && !onStation(x, y) && !onChef(x, y);

  // 優先順位付き候補リスト
  // 1. TABLE周辺の主要通路（最優先）
  // 2. その他コーナー通路
  // 3. プレイヤー前方1〜2マス
  // 4. 端通路
  const priorityPool: { x: number; y: number }[] = [
    // TABLE周辺（最重要コリドー）
    { x: 2, y: 1 }, { x: 2, y: 3 }, { x: 1, y: 2 }, { x: 3, y: 2 },
    // コーナー通路
    { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 },
    // プレイヤー前方1マス（4方向）
    { x: chefPos.x,     y: chefPos.y + 1 },
    { x: chefPos.x,     y: chefPos.y - 1 },
    { x: chefPos.x + 1, y: chefPos.y     },
    { x: chefPos.x - 1, y: chefPos.y     },
    // プレイヤー前方2マス
    { x: chefPos.x,     y: chefPos.y + 2 },
    { x: chefPos.x,     y: chefPos.y - 2 },
    { x: chefPos.x + 2, y: chefPos.y     },
    { x: chefPos.x - 2, y: chefPos.y     },
    // 端の通路
    { x: 1, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: 1 }, { x: 4, y: 1 },
    { x: 0, y: 2 }, { x: 4, y: 2 },
    { x: 0, y: 3 }, { x: 4, y: 3 },
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
  ];

  // 有効なもの・重複除去
  const seen = new Set<string>();
  const candidates = priorityPool.filter(({ x, y }) => {
    const key = `${x},${y}`;
    if (seen.has(key) || !isValid(x, y)) return false;
    seen.add(key);
    return true;
  });

  if (candidates.length === 0) return [];

  // 上位8候補からランダムに1〜2マス選択（完全ランダムは避ける）
  const pool     = candidates.slice(0, Math.min(8, candidates.length));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count    = Math.floor(Math.random() * 2) + 1; // 1 or 2
  const selected = shuffled.slice(0, count);

  // 閉じ込めチェック: プレイヤー四方向のいずれかが通れるか確認
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]] as const;
  const hasEscape = dirs.some(([dx, dy]) => {
    const ax = chefPos.x + dx;
    const ay = chefPos.y + dy;
    return inBounds(ax, ay)
      && !onStation(ax, ay)
      && !selected.some(t => t.x === ax && t.y === ay);
  });

  // 閉じ込めになるなら1マスに減らす
  if (!hasEscape && selected.length > 1) return [selected[0]];
  return selected;
}

// ─── ゲーム終了コメント（スコア帯ランダム） ───────────────────────────
function getResultComment(score: number): string {
  const tiers: { min: number; comments: string[] }[] = [
    {
      min: 6000,
      comments: [
        '見事だ。だが一度完璧な仕事をしたからといって慢心するな。明日も同じレベルを見せてみろ。',
        'この厨房で今まで見た最高のパフォーマンスだ。しかし伝説とは一夜では作れない。明日も来い。',
        '認めよう。だが真の一流は賞賛を求めない。黙ってまた鍋を火にかけろ。',
      ],
    },
    {
      min: 3000,
      comments: [
        '悪くない。だが「悪くない」はミシュランの星とは程遠い。もっと貪欲になれ。',
        '技術は確かだ。しかし料理は技術だけでは届かない領域がある。そこに気づけているか？',
        '及第点だ。だが私の厨房では及第点は最低ラインに過ぎない。もう一段上を目指せ。',
      ],
    },
    {
      min: 1000,
      comments: [
        '平均的な仕事だ。この世界に「普通」で生き残れる場所はない。そろそろ本気を見せろ。',
        '食材への敬意が足りない。皿の前に、まず料理人としての覚悟を鍛え直せ。',
        '客を満足させることと感動させることは全く別物だ。お前はまだ前者にも届いていない。',
      ],
    },
    {
      min: 0,
      comments: [
        'これが仕事のつもりか。この皿を客に出す前に、まず料理の定義から学び直せ。',
        '恥を知れ。食材も時間も客への敬意も、全て無駄にした。料理人を名乗る資格はない。',
        '私の厨房から出て行け。戻ってくる前に一から修行し直すことだ。最低でも五年はかかる。',
      ],
    },
  ];
  const tier = tiers.find(t => score >= t.min)!;
  return tier.comments[Math.floor(Math.random() * tier.comments.length)];
}

// ══════════════════════════════════════════════════════════════════════
// ステーション描画（chefPos / ovenBroken が変わった時だけ再描画）
// ══════════════════════════════════════════════════════════════════════
interface KitchenStationsProps {
  chefPos: { x: number; y: number };
  ovenBroken: boolean;
  stoveBroken: boolean;
}

const KitchenStations = React.memo(function KitchenStations({ chefPos, ovenBroken, stoveBroken }: KitchenStationsProps) {
  const FRONT_H = 7;
  const PAD     = 3;

  type StationDef = {
    top: string; front: string; border: string; highlight: string;
    label: string; glow: string; zLayer?: number;
    content: React.ReactNode;
  };

  return (
    <>
      {Object.entries(STATIONS).map(([type, pos]) => {
        if (type === 'NONE') return null;
        const isActive =
          Math.round(chefPos.x) === Math.round(pos.x) &&
          Math.round(chefPos.y) === Math.round(pos.y);
        const isOvenError  = type === 'OVEN'  && ovenBroken;
        const isStoveError = type === 'STOVE' && stoveBroken;

        const stationDefs: Record<string, StationDef> = {
          PREP: {
            top: 'linear-gradient(170deg, #d4a060 0%, #a86828 100%)',
            front: '#6a3808', border: '#3a1800', highlight: 'rgba(255,200,100,0.5)',
            label: 'まな板', glow: 'rgba(255,200,80,0.45)', zLayer: 5,
            content: (
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(8deg, transparent, transparent 5px, rgba(60,20,0,0.22) 5px, rgba(60,20,0,0.22) 6px)' }} />
                <div className="absolute inset-[5px] rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(80,30,0,0.3)' }} />
                <span style={{ fontSize: 22, zIndex: 2, position: 'relative' }}>🔪</span>
              </>
            ),
          },
          STOVE: {
            top: isStoveError
              ? 'linear-gradient(170deg, #3a1010 0%, #1a0808 100%)'
              : 'linear-gradient(170deg, #686868 0%, #383838 100%)',
            front: '#181818', border: isStoveError ? '#ff3030' : '#080808',
            highlight: isStoveError ? 'rgba(255,80,80,0.5)' : 'rgba(150,150,150,0.4)',
            label: isStoveError ? '！STOVE ERROR' : 'コンロ',
            glow: isStoveError ? 'rgba(255,50,50,0.7)' : 'rgba(255,120,0,0.55)', zLayer: 5,
            content: (
              <>
                <div className="absolute top-[8px] left-0 right-0 h-px pointer-events-none" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="relative z-10 flex items-center justify-center" style={{ width: 34, height: 34 }}>
                  <div className="absolute rounded-full border-[2.5px]" style={{ width: 34, height: 34, borderColor: isStoveError ? '#ff4040' : '#aaa' }} />
                  <div className="absolute rounded-full border-2"      style={{ width: 22, height: 22, borderColor: isStoveError ? '#cc2020' : '#999' }} />
                  <div className="absolute rounded-full border"        style={{ width: 12, height: 12, borderColor: isStoveError ? '#aa1010' : '#888' }} />
                  <div className="absolute rounded-full"               style={{ width: 5,  height: 5,  background: isStoveError ? '#ff3030' : '#777' }} />
                </div>
                {isStoveError ? (
                  <motion.span style={{ fontSize: 18, position: 'absolute' }}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                  >⚠️</motion.span>
                ) : isActive ? (
                  <motion.div className="absolute pointer-events-none rounded-full"
                    style={{ width: 32, height: 32, background: 'radial-gradient(circle, rgba(255,200,0,1) 0%, rgba(255,80,0,0.8) 40%, transparent 70%)' }}
                    animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  />
                ) : null}
              </>
            ),
          },
          OVEN: {
            top: isOvenError
              ? 'linear-gradient(170deg, #3a1010 0%, #1a0808 100%)'
              : 'linear-gradient(170deg, #606060 0%, #343434 100%)',
            front: '#141414', border: isOvenError ? '#ff3030' : '#060606',
            highlight: isOvenError ? 'rgba(255,80,80,0.5)' : 'rgba(120,120,120,0.35)',
            label: isOvenError ? '！OVEN ERROR' : 'オーブン',
            glow: isOvenError ? 'rgba(255,50,50,0.7)' : 'rgba(255,140,0,0.5)',
            zLayer: 5,
            content: (
              <>
                <div className="relative z-10 flex items-center justify-center" style={{
                  width: '66%', height: '46%',
                  background: isOvenError ? 'rgba(120,0,0,0.8)' : isActive ? 'rgba(80,30,0,0.9)' : 'rgba(8,8,8,0.95)',
                  border: `2px solid ${isOvenError ? '#ff4040' : '#606060'}`,
                  borderRadius: 4,
                }}>
                  {isOvenError ? (
                    <motion.span style={{ fontSize: 18 }}
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.4 }}
                    >⚠️</motion.span>
                  ) : isActive ? (
                    <motion.div style={{ width: '70%', height: '70%', borderRadius: 3, background: 'radial-gradient(circle, rgba(255,220,0,1) 0%, rgba(255,100,0,0.8) 50%, rgba(180,20,0,0.4) 80%, transparent 100%)' }}
                      animate={{ opacity: [0.75, 1, 0.75] }} transition={{ repeat: Infinity, duration: 0.35 }}
                    />
                  ) : (
                    <div style={{ width: '65%', height: '65%', border: '1px solid #444', borderRadius: 2 }} />
                  )}
                </div>
                <div className="z-10 flex gap-[5px] mt-[3px]" style={{ position: 'relative' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #d0d0d0, #707070)', border: '1.5px solid #404040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 1.5, height: 3.5, background: '#404040', borderRadius: 1 }} />
                    </div>
                  ))}
                </div>
              </>
            ),
          },
          GARNISH: {
            top: 'linear-gradient(180deg, #504038 0%, #302820 100%)',
            front: '#181008', border: '#080400', highlight: 'rgba(130,100,50,0.4)',
            label: '揚場', glow: 'rgba(200,140,0,0.55)', zLayer: 5,
            content: (
              <>
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '40%', background: 'linear-gradient(180deg, rgba(180,110,0,0.6) 0%, rgba(140,70,0,0.9) 100%)' }} />
                <div className="absolute pointer-events-none" style={{ bottom: '39%', left: '10%', right: '10%', height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,200,80,0.6), transparent)' }} />
                <div className="relative z-10" style={{ width: 34, height: 26, border: '2.5px solid #909090', borderRadius: '3px 3px 9px 9px', background: ['repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(200,200,200,0.2) 4px, rgba(200,200,200,0.2) 5px)', 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(200,200,200,0.2) 4px, rgba(200,200,200,0.2) 5px)'].join(', '), display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)', marginBottom: 3 }}>
                  <span style={{ fontSize: 17, zIndex: 2, position: 'relative' }}>🍟</span>
                </div>
                <div className="absolute z-10" style={{ top: 4, left: '50%', marginLeft: -11, width: 22, height: 8, border: '2.5px solid #a0a0a0', borderBottom: 'none', borderRadius: '8px 8px 0 0' }} />
                {[0, 1, 2, 3].map(i => (
                  <motion.div key={i} className="absolute rounded-full pointer-events-none"
                    style={{ width: 3 + (i % 2) * 2, height: 3 + (i % 2) * 2, background: `rgba(220,160,0,${isActive ? 0.95 : 0.5})`, bottom: 5 + i * 3, left: `${18 + i * 18}%` }}
                    animate={{ y: [0, -(8 + i * 3), 0], opacity: [1, 0.1, 1] }}
                    transition={{ repeat: Infinity, duration: isActive ? 0.28 + i * 0.06 : 0.8 + i * 0.18, delay: i * 0.1 }}
                  />
                ))}
              </>
            ),
          },
          TABLE: {
            top: 'linear-gradient(170deg, #f8f4f0 0%, #e8e0d8 100%)',
            front: '#c0b0a0', border: '#907060', highlight: 'rgba(255,255,255,0.6)',
            label: '作業台', glow: 'rgba(255,230,100,0.45)', zLayer: 10,
            content: (
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: ['repeating-linear-gradient(115deg, transparent, transparent 9px, rgba(150,130,110,0.18) 9px, rgba(150,130,110,0.18) 10px)', 'repeating-linear-gradient(65deg, transparent, transparent 16px, rgba(160,140,120,0.12) 16px, rgba(160,140,120,0.12) 17px)'].join(', ') }} />
                <div className="absolute inset-[4px] border rounded-sm pointer-events-none" style={{ borderColor: 'rgba(160,140,120,0.5)' }} />
                <div className="absolute top-[28%] left-4 right-4 h-px pointer-events-none" style={{ background: 'rgba(150,130,110,0.4)' }} />
                <span style={{ fontSize: 22, zIndex: 2, position: 'relative' }}>🍽️</span>
              </>
            ),
          },
          SERVE: {
            top: 'linear-gradient(170deg, #fffff8 0%, #f0e8e0 100%)',
            front: '#c0a890', border: '#907060', highlight: 'rgba(255,255,240,0.6)',
            label: '盛り台', glow: 'rgba(255,240,160,0.5)', zLayer: 5,
            content: (
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(125deg, transparent, transparent 10px, rgba(200,180,160,0.15) 10px, rgba(200,180,160,0.15) 11px)' }} />
                <div className="absolute inset-[4px] rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(180,160,140,0.6)' }} />
                <div className="absolute top-[20%] left-3 right-3 h-[1.5px] pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.5), transparent)' }} />
                <span style={{ fontSize: 22, zIndex: 2, position: 'relative' }}>🛎️</span>
              </>
            ),
          },
        };

        const def = stationDefs[type];
        if (!def) return null;

        return (
          <div key={type} className="absolute pointer-events-none"
               style={{ left: `${pos.x * 20}%`, top: `${pos.y * 20}%`, width: '20%', height: '20%', padding: `${PAD}px ${PAD}px ${PAD + FRONT_H}px ${PAD}px`, zIndex: def.zLayer ?? 5 }}>
            <motion.div
              animate={isActive && !isOvenError && !isStoveError ? { scale: 1.07, y: -2 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                width: '100%', height: '100%',
                background: def.top,
                border: `2px solid ${def.border}`,
                borderTop: `2px solid ${def.highlight}`,
                borderRadius: '5px 5px 2px 2px',
                boxShadow: [
                  `0 ${FRONT_H}px 0 0 ${def.front}`,
                  `0 ${FRONT_H + 4}px 0 0 rgba(0,0,0,0.5)`,
                  (isOvenError || isStoveError)
                    ? `0 0 0 2px rgba(255,50,50,0.7), 0 0 20px rgba(255,50,50,0.5)`
                    : isActive ? `0 0 0 2px ${def.glow}, 0 0 18px ${def.glow}` : '0 3px 10px rgba(0,0,0,0.7)',
                ].join(', '),
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              {def.content}
              <div className="absolute bottom-[3px] px-[6px] py-[2px] rounded"
                   style={{ background: (isOvenError || isStoveError) ? 'rgba(150,0,0,0.9)' : 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 20 }}>
                <span style={{ fontSize: '0.38rem', color: (isOvenError || isStoveError) ? '#ff8080' : '#e8e0d0', fontWeight: 800, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{def.label}</span>
              </div>
              {isActive && !isOvenError && !isStoveError && (
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${def.glow} 0%, transparent 70%)` }}
                  animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.45 }}
                />
              )}
            </motion.div>
          </div>
        );
      })}
    </>
  );
});

// ══════════════════════════════════════════════════════════════════════
export default function App() {

  // ─── ゲーム基本 State ────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    orders: [],
    chefPos: { x: 2, y: 2 },
    isGameOver: false,
    timeLeft: GAME_DURATION,
  });
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [isChefMoving,  setIsChefMoving]  = useState(false);
  const [scoreKey,      setScoreKey]      = useState(0);
  const [popups,        setPopups]        = useState<Popup[]>([]);
  const [chefDirection, setChefDirection] = useState<'left' | 'right'>('right');
  const [review,        setReview]        = useState('');
  const [slipVisible,   setSlipVisible]   = useState(false);
  const [commentary,    setCommentary]    = useState('厨房へようこそ。せいぜい私の舌を満足させてくれたまえ。');
  const shakeControls = useAnimation();
  const [announcement,  setAnnouncement]  = useState<{ text: string; emoji: string; bg: string } | null>(null);

  // ─── ベストスコア（localStorage） ──────────────────────────────
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('bestScore') || '0'));
  const [bestRank,  setBestRank]  = useState(() => localStorage.getItem('bestRank') || '');

  // ─── コンボ State ────────────────────────────────────────────────
  const [comboPopup,          setComboPopup]          = useState<ComboPopup | null>(null);
  const [timeFreezeRemaining, setTimeFreezeRemaining] = useState(0);

  // ─── トラブル State ──────────────────────────────────────────────
  const [activeTrouble,   setActiveTrouble]   = useState<TroubleType | null>(null);
  const [troubleRemaining, setTroubleRemaining] = useState(0);
  const [oilTiles,        setOilTiles]        = useState<{ x: number; y: number }[]>([]);
  const [ovenBroken,      setOvenBroken]      = useState(false);
  const [stoveBroken,     setStoveBroken]     = useState(false);

  // ─── Refs（インターバル内で最新値を参照するため） ──────────────
  /** スワイプ開始座標 */
  const swipeStartRef         = useRef<{ x: number; y: number } | null>(null);
  /** スワイプ後の click を無視するフラグ */
  const didSwipeRef           = useRef(false);
  /** 移動アニメーション消灯タイマー */
  const movingTimerRef        = useRef<NodeJS.Timeout | null>(null);
  /** キッチン div の ref（実寸計測用） */
  const kitchenRef            = useRef<HTMLDivElement>(null);
  /** useCallback 内で oilTiles を stale closure なしに参照するための ref */
  const oilTilesRef           = useRef<{ x: number; y: number }[]>([]);
  /** isPlaying を stable callback から参照するための ref */
  const isPlayingRef          = useRef(false);
  /** isGameOver を stable callback から参照するための ref */
  const isGameOverRef         = useRef(false);

  const timerRef              = useRef<NodeJS.Timeout | null>(null);
  const orderTimerRef         = useRef<NodeJS.Timeout | null>(null);
  const regularTimerRef       = useRef<NodeJS.Timeout | null>(null);
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef       = useRef<NodeJS.Timeout | null>(null);
  const lastDishIdRef         = useRef('');
  /** タイマーを一時停止するためのフラグ（ref なので interval 内で常に最新値を参照） */
  const isTimeFrozenRef       = useRef(false);
  /** setInterval 内で activeTrouble を参照するための ref */
  const activeTroubleRef      = useRef<TroubleType | null>(null);
  /** setInterval 内で ovenBroken を参照するための ref */
  const ovenBrokenRef         = useRef(false);
  /** setInterval 内で stoveBroken を参照するための ref */
  const stoveBrokenRef        = useRef(false);
  /** 2連続クレームカウント（ref で管理してインターバル間を通じて保持） */
  const consecutiveComplaintsRef = useRef(0);
  /** triggerKitchenTrouble 内でシェフ位置を参照するための ref */
  const chefPosRef            = useRef({ x: 2, y: 2 });
  /** 土曜限定トラブルのスケジューラ ref */
  const saturdayTroubleTimerRef = useRef<NodeJS.Timeout | null>(null);
  /** addPopup の setTimeout を追跡してリークを防ぐ */
  const popupTimersRef = useRef<NodeJS.Timeout[]>([]);
  /** 現在ステージを useEffect / callback から stale closure なしに参照するための ref */
  const currentStageIdxRef    = useRef(0);
  /** ステージ遷移アナウンスの前ステージ追跡 ref */
  const prevStageIdxRef       = useRef(0);
  /** generateOrder 内でフェーズ判定に使う残り時間 ref */
  const timeLeftRef           = useRef(GAME_DURATION);

  // ─── ステージ導出（timeLeft から純粋計算） ──────────────────────
  const currentStageIdx = useMemo(() => {
    const t = gameState.timeLeft;
    if (!isPlaying || gameState.isGameOver) return 0;
    // 3フェーズ 30秒区切り: Phase1(t>60) / Phase2(t>30) / Phase3(地獄 t<=30)
    return t > 60 ? 0 : t > 30 ? 1 : 2;
  }, [gameState.timeLeft, isPlaying, gameState.isGameOver]);

  const currentStage = STAGES[currentStageIdx];

  // ─── State → Ref 同期 ────────────────────────────────────────────
  useEffect(() => { activeTroubleRef.current  = activeTrouble;          }, [activeTrouble]);
  useEffect(() => { ovenBrokenRef.current     = ovenBroken;             }, [ovenBroken]);
  useEffect(() => { stoveBrokenRef.current    = stoveBroken;            }, [stoveBroken]);
  useEffect(() => { chefPosRef.current        = gameState.chefPos;      }, [gameState.chefPos]);
  useEffect(() => { oilTilesRef.current       = oilTiles;               }, [oilTiles]);
  useEffect(() => { isPlayingRef.current      = isPlaying;              }, [isPlaying]);
  useEffect(() => { isGameOverRef.current     = gameState.isGameOver;   }, [gameState.isGameOver]);
  useEffect(() => { currentStageIdxRef.current = currentStageIdx;       }, [currentStageIdx]);
  useEffect(() => { timeLeftRef.current       = gameState.timeLeft;     }, [gameState.timeLeft]);

  // ─── ステージ遷移アナウンス ──────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) { prevStageIdxRef.current = 0; return; }
    if (currentStageIdx > 0 && currentStageIdx !== prevStageIdxRef.current) {
      showAnnouncement(currentStage.announcement, currentStage.emoji, currentStage.announceBg);
    }
    prevStageIdxRef.current = currentStageIdx;
  // showAnnouncement は stable ref なので exhaustive-deps から除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStageIdx, isPlaying, gameState.isGameOver]);

  // ══════════════════════════════════════════════════════════════════
  // アナウンスバナー表示
  // ══════════════════════════════════════════════════════════════════
  const showAnnouncement = useCallback((text: string, emoji: string, bg: string) => {
    if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
    setAnnouncement({ text, emoji, bg });
    announcementTimeoutRef.current = setTimeout(() => setAnnouncement(null), 2800);
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // フィールドポップアップ表示
  // ══════════════════════════════════════════════════════════════════
  const addPopup = useCallback((x: number, y: number, text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setPopups(prev => [...prev, { id, x, y, text }]);
    const tid = setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
      popupTimersRef.current = popupTimersRef.current.filter(t => t !== tid);
    }, 900);
    popupTimersRef.current.push(tid);
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // スリップエフェクト（油踏み -10秒）
  // ══════════════════════════════════════════════════════════════════
  const triggerSlipEffect = useCallback(async () => {
    setSlipVisible(true);
    setTimeout(() => setSlipVisible(false), 600);
    await shakeControls.start({
      x: [-10, 10, -7, 7, -4, 4, 0],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  }, [shakeControls]);

  // ══════════════════════════════════════════════════════════════════
  // ① コンボシステム
  // ══════════════════════════════════════════════════════════════════

  /** 時間停止を開始する */
  const startTimeFreeze = useCallback((seconds: number) => {
    isTimeFrozenRef.current = true;
    setTimeFreezeRemaining(seconds);
  }, []);

  /**
   * コンボ成立時の処理
   * @returns 加算するコンボボーナス点
   */
  const handleComboClear = useCallback((completedCount: number): number => {
    const { bonus, freeze } = getComboReward(completedCount);
    if (bonus === 0) return 0;

    // コンボポップアップ表示
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    setComboPopup({ count: completedCount, bonus, freeze });
    comboTimeoutRef.current = setTimeout(() => setComboPopup(null), 2500);

    // 時間停止
    if (freeze > 0) startTimeFreeze(freeze);

    return bonus;
  }, [startTimeFreeze]);

  /** 時間停止カウントダウン（useEffect チェーンで1秒ずつ減少） */
  useEffect(() => {
    if (timeFreezeRemaining <= 0) {
      isTimeFrozenRef.current = false; // 停止解除
      return;
    }
    isTimeFrozenRef.current = true;
    const id = setTimeout(() => setTimeFreezeRemaining(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timeFreezeRemaining]);

  // ══════════════════════════════════════════════════════════════════
  // ② トラブルシステム
  // ══════════════════════════════════════════════════════════════════

  /** 厨房トラブルを発動する */
  const triggerKitchenTrouble = useCallback(() => {
    // 既にトラブル中は発動しない
    if (activeTroubleRef.current) return;

    showAnnouncement('KITCHEN TROUBLE！厨房が大変だ！', '⚠️', '#6a0000');

    if (Math.random() < 0.5) {
      // --- A. オーブン故障 ---
      setOvenBroken(true);
      ovenBrokenRef.current = true;
      setActiveTrouble('OVEN_BROKEN');
      activeTroubleRef.current = 'OVEN_BROKEN';
      setTroubleRemaining(4);
      setTimeout(() => showAnnouncement('OVEN ERROR！ オーブンが4秒間使用不可！', '🔴', '#5a0000'), 300);
    } else {
      // --- B. 油こぼれ（通行不可障害物）---
      const stationPositions = Object.entries(STATIONS)
        .filter(([t]) => t !== 'NONE')
        .map(([, p]) => ({ x: p.x, y: p.y }));

      // 意味ある位置に油を配置（閉じ込め防止付き）
      const tiles = generateOilTiles(chefPosRef.current, stationPositions);

      setOilTiles(tiles);
      setActiveTrouble('OIL_SPILL');
      activeTroubleRef.current = 'OIL_SPILL';
      setTroubleRemaining(4);
      setTimeout(() => showAnnouncement('OIL SPILL！ 踏んだら -10秒！油に注意！', '🛢️', '#5a4000'), 300);
    }

    // トラブル後にクレームカウントをリセット
    consecutiveComplaintsRef.current = 0;
  }, [showAnnouncement]);

  /** トラブルカウントダウン（useEffect チェーン） */
  useEffect(() => {
    if (!activeTrouble) return;

    if (troubleRemaining <= 0) {
      setActiveTrouble(null);
      activeTroubleRef.current = null;
      setOvenBroken(false);
      ovenBrokenRef.current = false;
      setStoveBroken(false);
      stoveBrokenRef.current = false;
      setOilTiles([]);
      return;
    }

    const id = setTimeout(() => setTroubleRemaining(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [troubleRemaining, activeTrouble]);

  // ══════════════════════════════════════════════════════════════════
  // ③ 土曜限定：理不尽トラブル（Stage 3 Special）
  // ══════════════════════════════════════════════════════════════════

  /** 土曜日限定トラブルを強制発動（クレーム条件を無視） */
  const triggerSaturdayTrouble = useCallback(() => {
    if (Math.random() < 0.5) {
      // ① 機材故障: OVEN または STOVE が 10 秒間使用不可
      const breakOven = Math.random() < 0.5;
      if (breakOven) {
        setOvenBroken(true);
        ovenBrokenRef.current = true;
        setActiveTrouble('OVEN_BROKEN');
        activeTroubleRef.current = 'OVEN_BROKEN';
      } else {
        setStoveBroken(true);
        stoveBrokenRef.current = true;
        setActiveTrouble('STOVE_BROKEN');
        activeTroubleRef.current = 'STOVE_BROKEN';
      }
      setTroubleRemaining(10);
      showAnnouncement(
        breakOven ? '🔥 土曜緊急！オーブン故障！10秒使用不可！' : '🔥 土曜緊急！コンロ故障！10秒使用不可！',
        '🔥', '#5a0000',
      );
    } else {
      // ② いきなり激怒: 全オーダーの待ち時間を 50% 減少
      setGameState(prev => ({
        ...prev,
        orders: prev.orders.map(o => ({ ...o, limitTime: Math.max(1000, Math.floor(o.limitTime * 0.5)) })),
      }));
      showAnnouncement('😡 激怒！全ての客の待ち時間が半分に！', '😡', '#5a2000');
    }
  }, [showAnnouncement]);

  /** 土曜限定トラブルスケジューラ（Stage 3 中のみ動作） */
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver || currentStageIdx !== 2) {
      if (saturdayTroubleTimerRef.current) {
        clearTimeout(saturdayTroubleTimerRef.current);
        saturdayTroubleTimerRef.current = null;
      }
      return;
    }

    const schedule = () => {
      const delay = 7000 + Math.random() * 10000; // Phase3は30秒しかないので 7〜17 秒のランダム間隔
      saturdayTroubleTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current && !isGameOverRef.current && currentStageIdxRef.current === 2) {
          triggerSaturdayTrouble();
          schedule(); // 次のトラブルを予約
        }
      }, delay);
    };

    schedule();

    return () => {
      if (saturdayTroubleTimerRef.current) {
        clearTimeout(saturdayTroubleTimerRef.current);
        saturdayTroubleTimerRef.current = null;
      }
    };
  }, [isPlaying, gameState.isGameOver, currentStageIdx, triggerSaturdayTrouble]);

  // ══════════════════════════════════════════════════════════════════
  // シェフ移動
  // ══════════════════════════════════════════════════════════════════

  /** 移動後に歩行アニメーションを短時間オンにする */
  const flashMoving = useCallback(() => {
    setIsChefMoving(true);
    if (movingTimerRef.current) clearTimeout(movingTimerRef.current);
    movingTimerRef.current = setTimeout(() => setIsChefMoving(false), 350);
  }, []);

  /**
   * シェフを移動する。
   * 油エリアを踏むと移動は通るが残り時間 -10 秒のペナルティ。
   * oilTilesRef を使うことで stale closure を回避。
   */
  const moveChef = useCallback((nx: number, ny: number) => {
    const targetX = Math.max(0, Math.min(4, Math.round(nx)));
    const targetY = Math.max(0, Math.min(4, Math.round(ny)));

    const hitOil = oilTilesRef.current.some(t => t.x === targetX && t.y === targetY);
    if (hitOil) {
      setOilTiles(prev => prev.filter(t => !(t.x === targetX && t.y === targetY)));
      setGameState(prev => ({
        ...prev,
        chefPos: { x: targetX, y: targetY },
        timeLeft: Math.max(0, prev.timeLeft - 10),
      }));
      addPopup(targetX, targetY, 'SLIP! -10 SEC');
      triggerSlipEffect();
      flashMoving();
      return;
    }

    setGameState(prev => ({ ...prev, chefPos: { x: targetX, y: targetY } }));
    flashMoving();
  }, [addPopup, triggerSlipEffect, flashMoving]);

  /** 方向パッドからの移動（chefPosRef で stale closure 回避） */
  const handleDpad = useCallback((dx: number, dy: number) => {
    const nx = chefPosRef.current.x + dx;
    const ny = chefPosRef.current.y + dy;
    moveChef(nx, ny);
    if (dx > 0) setChefDirection('right');
    if (dx < 0) setChefDirection('left');
  }, [moveChef]);

  /** スワイプ開始 */
  const handleKitchenPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isPlayingRef.current || isGameOverRef.current) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  /** スワイプ終了 → 方向判定して1マス移動 */
  const handleKitchenPointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    swipeStartRef.current = null;

    if (dist < 28) return; // タップ → grid の onClick に委ねる

    // スワイプ判定：dominant axis で1マス移動
    didSwipeRef.current = true;
    if (Math.abs(dx) >= Math.abs(dy)) {
      handleDpad(dx > 0 ? 1 : -1, 0);
    } else {
      handleDpad(0, dy > 0 ? 1 : -1);
    }
  }, [handleDpad]);

  // ══════════════════════════════════════════════════════════════════
  // ステーション到達判定（料理完成 / コンボ / トラブルリセット）
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) return;

    const x = Math.round(gameState.chefPos.x);
    const y = Math.round(gameState.chefPos.y);

    const stationEntry = Object.entries(STATIONS).find(
      ([, pos]) => Math.round(pos.x) === x && Math.round(pos.y) === y
    );
    const rawStation = stationEntry ? (stationEntry[0] as StationType) : 'NONE';
    const currentStation: StationType =
      (rawStation === 'OVEN'   && ovenBrokenRef.current)  ? 'NONE' :
      (rawStation === 'STOVE'  && stoveBrokenRef.current) ? 'NONE' :
      rawStation;

    if (currentStation === 'NONE') return;

    setGameState(prev => {
      let totalEarned   = 0;
      let anyProgress   = false;
      let completedCount = 0;

      const nextOrders = prev.orders.map(order => {
        const requiredStep = order.dish.steps[order.currentStepIndex];
        if (requiredStep !== currentStation) return order;

        anyProgress = true;
        const nextIdx = order.currentStepIndex + 1;

        // 全工程完了
        if (nextIdx >= order.dish.steps.length) {
          const base         = Math.floor(order.dish.points * 0.7);
          const regularBonus = order.orderType === 'regular' ? 80 : 0;
          const earned       = base + regularBonus;
          totalEarned += earned;
          completedCount++;

          // ポップアップ
          if (order.orderType === 'regular') {
            addPopup(x, y, `常連ボーナス！ +${earned}`);
            setCommentary(`${order.regularName ?? '常連'}が満足した。悪くない。`);
          } else if (order.orderType === 'rush') {
            addPopup(x, y, `ラッシュ完成！ +${earned}`);
          } else if (order.orderType === 'course') {
            addPopup(x, y, `コース完成！！ +${earned}`);
          } else {
            addPopup(x, y, `完成！ +${earned}`);
          }
          return null; // オーダー削除
        }

        addPopup(x, y, 'OK!');
        return { ...order, currentStepIndex: nextIdx };
      }).filter((o): o is Order => o !== null);

      if (!anyProgress) return prev;

      if (completedCount > 0) {
        // 連続クレームをリセット（料理完成で救済）
        consecutiveComplaintsRef.current = 0;

        // コンボ処理（React の setState 内で呼ぶが、内部は state setter のみ）
        const comboBonus = handleComboClear(completedCount);

        if (completedCount === 1) {
          setCommentary(['Parfait!', '悪くない動きだ。', 'ほう、やるな。', '少しはマシになったようだな。'][Math.floor(Math.random() * 4)]);
        }

        setScoreKey(k => k + 1);

        return {
          ...prev,
          orders: nextOrders,
          score: prev.score + totalEarned + comboBonus,
        };
      }

      return { ...prev, orders: nextOrders };
    });
  // oilTiles / ovenBroken は ref 経由で参照するため依存から除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.chefPos, isPlaying, gameState.isGameOver, addPopup, handleComboClear]);

  // ══════════════════════════════════════════════════════════════════
  // オーダー生成
  // ══════════════════════════════════════════════════════════════════
  const generateOrder = useCallback(() => {
    const stage    = STAGES[currentStageIdxRef.current];
    const timeLeft = timeLeftRef.current;

    // フェーズ別皿プール
    const beginner     = DISHES.filter(d => d.steps.length === 3);
    const intermediate = DISHES.filter(d => d.steps.length === 4);
    const advanced     = DISHES.filter(d => d.steps.length >= 5);

    let dishPool: typeof DISHES;
    if (timeLeft > 60) {
      dishPool = beginner;                                          // Phase 1: 初級のみ
    } else if (timeLeft > 30) {
      dishPool = [...beginner, ...intermediate];                    // Phase 2: 初級＋中級
    } else {
      dishPool = [...beginner, ...intermediate, ...advanced, ...advanced, ...advanced]; // Phase 3: 上級3倍重み
    }
    if (dishPool.length === 0) return;

    const baseDish = dishPool[Math.floor(Math.random() * dishPool.length)];
    const isCourse = baseDish.steps.length >= 6;
    const isVIP    = !isCourse && Math.random() < 0.1;
    const isRush   = !isCourse && !isVIP
      && baseDish.id === lastDishIdRef.current
      && Math.random() < 0.4;

    lastDishIdRef.current = baseDish.id;

    const dish = { ...baseDish };
    if (isVIP)  dish.points *= 3;
    if (isRush) dish.points  = Math.floor(dish.points * 1.5);

    if (isCourse)    showAnnouncement('コースメニューのご注文！全ステーションを制覇せよ！', '👑', '#6a5000');
    else if (isRush) showAnnouncement(`ラッシュ！「${dish.name}」が連続注文！1.5倍ボーナス！`, '🔥', '#8a2800');
    else if (isVIP)  showAnnouncement('VIPのお客様がご来店！', '⭐', '#6a4000');

    const orderType: OrderType = isCourse ? 'course' : isRush ? 'rush' : isVIP ? 'vip' : 'normal';

    // VIP/コースは patience の倍率で余裕を持たせる
    const limitTime = isCourse
      ? Math.round(stage.patience * 2.5)
      : isVIP
      ? Math.round(stage.patience * 1.5)
      : stage.patience;

    setGameState(prev => {
      if (prev.orders.length >= stage.maxOrders) return prev;
      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        dish,
        currentStepIndex: 0,
        startTime: Date.now(),
        limitTime,
        initialLimitTime: limitTime,
        isVIP,
        orderType,
      };
      return { ...prev, orders: [...prev.orders, newOrder] };
    });
  }, [showAnnouncement]);

  // ══════════════════════════════════════════════════════════════════
  // オーダーカウントダウン / クレーム / トラブル発動
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        let penalty     = 0;
        let expiredCount = 0;

        const nextOrders = prev.orders.map(order => {
          const newTime = order.limitTime - 1000;
          if (newTime <= 0) {
            penalty += 100;
            expiredCount++;
            return null;
          }
          return { ...order, limitTime: newTime };
        }).filter((o): o is Order => o !== null);

        if (expiredCount > 0) {
          addPopup(2, 2, `クレーム！ -${penalty}`);

          // 連続クレームカウント → Stage 3 以外で 2 回以上でトラブル発動
          consecutiveComplaintsRef.current += expiredCount;
          if (
            consecutiveComplaintsRef.current >= 2 &&
            !activeTroubleRef.current &&
            currentStageIdxRef.current !== 2  // Stage 3 は土曜専用トラブルのみ
          ) {
            consecutiveComplaintsRef.current = 0;
            setTimeout(() => triggerKitchenTrouble(), 0);
          }

          return { ...prev, orders: nextOrders, score: Math.max(0, prev.score - penalty) };
        }
        return { ...prev, orders: nextOrders };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, gameState.isGameOver, addPopup, triggerKitchenTrouble]);

  // ── オーダー不足時の自動補充（ステージ maxOrders 準拠） ──────────
  useEffect(() => {
    if (isPlaying && !gameState.isGameOver && gameState.orders.length < currentStage.maxOrders) {
      generateOrder();
    }
  }, [gameState.orders.length, isPlaying, gameState.isGameOver, generateOrder, currentStage.maxOrders]);

  // ── ステージ spawnRate に応じてオーダー間隔を動的に再設定 ─────────
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) {
      if (orderTimerRef.current) { clearInterval(orderTimerRef.current); orderTimerRef.current = null; }
      return;
    }
    if (orderTimerRef.current) clearInterval(orderTimerRef.current);
    orderTimerRef.current = setInterval(generateOrder, currentStage.spawnRate);
    return () => {
      if (orderTimerRef.current) { clearInterval(orderTimerRef.current); orderTimerRef.current = null; }
    };
  }, [isPlaying, gameState.isGameOver, currentStage.spawnRate, generateOrder]);

  // ── 常連客定期来店（28秒ごと） ───────────────────────────────────
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) return;

    const id = setInterval(() => {
      const customer = REGULAR_CUSTOMERS[Math.floor(Math.random() * REGULAR_CUSTOMERS.length)];
      const dish     = DISHES.find(d => d.id === customer.dishId);
      if (!dish) return;

      showAnnouncement(`${customer.name}がご来店！「${customer.message}」`, customer.emoji, '#1a4a1a');

      setGameState(prev => {
        if (prev.orders.length >= 8) return prev;
        const regLimitTime = Math.round(STAGES[currentStageIdxRef.current].patience * 2);
        const newOrder: Order = {
          id: `reg-${Math.random().toString(36).substr(2, 9)}`,
          dish: { ...dish },
          currentStepIndex: 0,
          startTime: Date.now(),
          limitTime: regLimitTime,
          initialLimitTime: regLimitTime,
          isVIP: false,
          orderType: 'regular',
          regularName: customer.name,
          regularEmoji: customer.emoji,
        };
        return { ...prev, orders: [...prev.orders, newOrder] };
      });
    }, 28000);

    regularTimerRef.current = id;
    return () => clearInterval(id);
  }, [isPlaying, gameState.isGameOver, showAnnouncement]);

  // ══════════════════════════════════════════════════════════════════
  // ゲーム開始 / 再スタート
  // ══════════════════════════════════════════════════════════════════
  const handleRestart = () => {
    // 全 state リセット
    setGameState({ score: 0, orders: [], chefPos: { x: 2, y: 2 }, isGameOver: false, timeLeft: GAME_DURATION });
    setReview('');
    setAnnouncement(null);
    setCommentary('厨房へ戻ったか。次は期待しているぞ。');
    // コンボ・トラブルリセット
    setComboPopup(null);
    setTimeFreezeRemaining(0);
    setActiveTrouble(null);
    setTroubleRemaining(0);
    setOilTiles([]);
    setOvenBroken(false);
    setStoveBroken(false);
    // Ref リセット
    lastDishIdRef.current              = '';
    isTimeFrozenRef.current            = false;
    activeTroubleRef.current           = null;
    ovenBrokenRef.current              = false;
    consecutiveComplaintsRef.current   = 0;

    // 新規追加 Ref のリセット
    stoveBrokenRef.current            = false;
    prevStageIdxRef.current           = 0;
    currentStageIdxRef.current        = 0;
    timeLeftRef.current               = GAME_DURATION;
    if (saturdayTroubleTimerRef.current) { clearTimeout(saturdayTroubleTimerRef.current); saturdayTroubleTimerRef.current = null; }

    setIsPlaying(true);

    // 初回オーダー（Phase 1: 初級皿のみ）
    const beginnerDishes = DISHES.filter(d => d.steps.length === 3);
    const firstDish = beginnerDishes[Math.floor(Math.random() * beginnerDishes.length)];
    const firstLimit = STAGES[0].patience;
    setGameState(prev => ({
      ...prev,
      orders: [{
        id: 'initial-order',
        dish: firstDish,
        currentStepIndex: 0,
        startTime: Date.now(),
        limitTime: firstLimit,
        initialLimitTime: firstLimit,
      }],
    }));

    // ゲームタイマー（isTimeFrozenRef が true のときはスキップ）
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isTimeFrozenRef.current) return;
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          if (timerRef.current)      clearInterval(timerRef.current);
          if (orderTimerRef.current) clearInterval(orderTimerRef.current);
          return { ...prev, timeLeft: 0, isGameOver: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    // orderTimer は currentStage.spawnRate を監視する useEffect が管理するため、ここでは設定しない
  };

  const startGame = handleRestart;

  // ── ゲームオーバー時レビュー生成 + ベストスコア保存 ──────────────
  useEffect(() => {
    if (gameState.isGameOver) {
      setReview(getResultComment(gameState.score));
      const savedBest = parseInt(localStorage.getItem('bestScore') || '0');
      if (gameState.score > savedBest) {
        const rank = getScoreRank(gameState.score);
        localStorage.setItem('bestScore', gameState.score.toString());
        localStorage.setItem('bestRank', rank.rank);
        setBestScore(gameState.score);
        setBestRank(rank.rank);
      }
    }
  }, [gameState.isGameOver, gameState.score]);

  // ── アンマウント時クリーンアップ ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current)              clearInterval(timerRef.current);
      if (orderTimerRef.current)         clearInterval(orderTimerRef.current);
      if (regularTimerRef.current)       clearInterval(regularTimerRef.current);
      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
      if (comboTimeoutRef.current)       clearTimeout(comboTimeoutRef.current);
      if (movingTimerRef.current)        clearTimeout(movingTimerRef.current);
      if (saturdayTroubleTimerRef.current) clearTimeout(saturdayTroubleTimerRef.current);
      popupTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // レンダリング
  // ══════════════════════════════════════════════════════════════════

  /** キッチン実寸からセルサイズを動的計算 */
  const [kitchenPx, setKitchenPx] = useState(340);
  useEffect(() => {
    const measure = () => {
      if (kitchenRef.current) setKitchenPx(kitchenRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const cellSize = useMemo(() => kitchenPx / 5, [kitchenPx]);

  const isFrozen = timeFreezeRemaining > 0;

  return (
    <div className="relative w-full flex flex-col overflow-hidden font-sans"
         style={{ height: '100dvh', background: '#0d0d0d' }}>

      {/* ── リネンテクスチャ（全画面 / 超低コントラスト） ── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: [
          'repeating-linear-gradient(45deg,  rgba(255,255,255,0.013) 0px, rgba(255,255,255,0.013) 1px, transparent 1px, transparent 10px)',
          'repeating-linear-gradient(-45deg, rgba(255,255,255,0.013) 0px, rgba(255,255,255,0.013) 1px, transparent 1px, transparent 10px)',
        ].join(', '),
        backgroundSize: '10px 10px',
        zIndex: 0,
      }}/>

      {/* ── 四隅ゴールドブラケット（プレイエリア境界） ── */}
      <div className="fixed top-2 left-2 w-7 h-7 pointer-events-none" style={{ borderTop: '1px solid rgba(212,175,55,0.55)', borderLeft: '1px solid rgba(212,175,55,0.55)', zIndex: 48 }}/>
      <div className="fixed top-2 right-2 w-7 h-7 pointer-events-none" style={{ borderTop: '1px solid rgba(212,175,55,0.55)', borderRight: '1px solid rgba(212,175,55,0.55)', zIndex: 48 }}/>
      <div className="fixed bottom-2 left-2 w-7 h-7 pointer-events-none" style={{ borderBottom: '1px solid rgba(212,175,55,0.55)', borderLeft: '1px solid rgba(212,175,55,0.55)', zIndex: 48 }}/>
      <div className="fixed bottom-2 right-2 w-7 h-7 pointer-events-none" style={{ borderBottom: '1px solid rgba(212,175,55,0.55)', borderRight: '1px solid rgba(212,175,55,0.55)', zIndex: 48 }}/>

      {/* ── TIME FREEZE オーバーレイ ── */}
      <AnimatePresence>
        {isFrozen && (
          <motion.div
            key="freeze-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] pointer-events-none"
            style={{ background: 'rgba(80, 160, 255, 0.10)' }}
          >
            {/* 青白い枠 */}
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px rgba(100,180,255,0.35)' }} />
            {/* TIME FREEZE バッジ */}
            <div className="absolute top-16 left-0 right-0 flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-sm text-white shadow-2xl"
                style={{ background: 'rgba(30,100,220,0.88)', border: '2px solid rgba(150,200,255,0.6)' }}
              >
                <span>⏸</span>
                <span>TIME FREEZE！ {timeFreezeRemaining}s</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SLIP フラッシュオーバーレイ ── */}
      <AnimatePresence>
        {slipVisible && (
          <motion.div
            key="slip-overlay"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="fixed inset-0 z-[83] pointer-events-none"
            style={{ background: 'rgba(255, 20, 20, 0.5)' }}
          />
        )}
      </AnimatePresence>

      {/* ── アナウンスバナー ── */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            key="announcement"
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-10 inset-x-0 z-[90] flex justify-center pointer-events-none"
          >
            <div
              className="flex items-center gap-3 px-6 py-2 rounded-2xl shadow-2xl border-2 border-white/25"
              style={{ background: announcement.bg }}
            >
              <span className="text-xl">{announcement.emoji}</span>
              <span className="text-white font-black text-xs tracking-wide">{announcement.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 毒舌コメント帯 ── */}
      <div className="z-50 text-center py-1 px-3"
           style={{ background: 'linear-gradient(90deg, #5a0000 0%, #900000 50%, #5a0000 100%)', borderBottom: '2px solid #c8820040' }}>
        <p className="text-[9px] italic text-white/90 leading-tight font-serif truncate">「{commentary}」</p>
      </div>

      {/* ── ゲーム HUD ヘッダー ── */}
      <header className="z-40 px-3 py-2 flex justify-between items-center"
              style={{ background: 'linear-gradient(180deg, #1e1610 0%, #150f0a 100%)', borderBottom: '2px solid #c89030' }}>
        <div className="flex flex-col leading-none">
          <span className="font-black uppercase tracking-tight text-base md:text-lg"
                style={{ color: '#e8c060', textShadow: '0 0 10px #c0800060, 1px 1px 0 #000' }}>
            Pocket Kitchen
          </span>
          <span className="text-[7px] font-bold tracking-widest" style={{ color: '#a07840' }}>
            ポケットキッチン
          </span>
          {isPlaying && !gameState.isGameOver && (
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ fontSize: '0.6rem' }}>{currentStage.emoji}</span>
              <span className="text-[8px] font-black tracking-wider"
                    style={{ color: currentStageIdx === 2 ? '#ff4040' : currentStageIdx === 1 ? '#ffc060' : '#80c080' }}>
                STAGE {currentStage.stage} {currentStage.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* トラブル表示 */}
          {activeTrouble && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black text-white"
              style={{ background: (activeTrouble === 'OVEN_BROKEN' || activeTrouble === 'STOVE_BROKEN') ? '#8a0000' : '#6a4000' }}
            >
              {activeTrouble === 'OVEN_BROKEN' ? '⚠️ OVEN' : activeTrouble === 'STOVE_BROKEN' ? '⚠️ STOVE' : '🛢️ OIL'} {troubleRemaining}s
            </motion.div>
          )}
          {/* TIME FREEZE バッジ（ヘッダー内） */}
          {isFrozen && (
            <div className="px-2 py-1 rounded text-[9px] font-black text-white"
                 style={{ background: 'rgba(30,100,220,0.9)' }}>
              ⏸ {timeFreezeRemaining}s
            </div>
          )}
          {/* スコア */}
          <div className="flex flex-col items-center px-3 py-1 rounded"
               style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #806030' }}>
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#a07840' }}>SCORE</span>
            <motion.span
              key={scoreKey}
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ duration: 0.18 }}
              className="text-lg font-black leading-none"
              style={{ color: '#ffe080', textShadow: '0 0 8px #ffb04080' }}
            >
              {gameState.score.toLocaleString()}
            </motion.span>
          </div>
          {/* タイマー */}
          <div className="flex flex-col items-center px-3 py-1 rounded"
               style={{
                 background: 'rgba(0,0,0,0.5)',
                 border: `1px solid ${isFrozen ? '#4080ff' : gameState.timeLeft < 10 ? '#cc3030' : '#806030'}`,
               }}>
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#a07840' }}>TIME</span>
            <span
              className={`text-lg font-black leading-none ${!isFrozen && gameState.timeLeft < 10 ? 'animate-pulse' : ''}`}
              style={{
                color: isFrozen ? '#80c0ff' : gameState.timeLeft < 10 ? '#ff5040' : '#ffe080',
                textShadow: isFrozen ? '0 0 8px #4080ff80' : gameState.timeLeft < 10 ? '0 0 8px #ff303080' : '0 0 8px #ffb04080',
              }}
            >
              {gameState.timeLeft}
            </span>
          </div>
        </div>
      </header>

      {/* ── キッチンフィールド ── */}
      <main
        className="relative flex-1 flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, #1c1510 0%, #080604 100%)',
          borderTop:    '1px solid rgba(212,175,55,0.28)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          touchAction: 'none',
        }}
        onPointerDown={handleKitchenPointerDown}
        onPointerUp={handleKitchenPointerUp}
      >

        {/* スポットライト */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,200,80,0.08) 0%, transparent 60%)' }} />

        {/* ── 左サイド：調理器具シルエット ── */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-[1]" style={{ opacity: 0.13 }}>
          <svg viewBox="0 0 80 280" width="72" height="252" xmlns="http://www.w3.org/2000/svg" fill="white">
            {/* 上段吊りレール */}
            <rect x="2" y="18" width="76" height="3.5" rx="1.5"/>
            {/* フック1 → 大鍋 */}
            <path d="M20 21.5 Q20 30 19 35" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <ellipse cx="19" cy="51" rx="17" ry="5"/>
            <path d="M2 51 L2 85 Q2 90 19 90 Q36 90 36 85 L36 51" fill="white"/>
            <ellipse cx="19" cy="87" rx="17" ry="4"/>
            <rect x="-5" y="48" width="9" height="4" rx="2"/>
            <rect x="31" y="48" width="9" height="4" rx="2"/>
            {/* フック2 → お玉 */}
            <path d="M50 21.5 Q50 30 49 35" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <circle cx="49" cy="50" r="12"/>
            <rect x="47" y="61" width="4.5" height="55" rx="2.25"/>
            {/* フック3 → フライパン */}
            <path d="M70 21.5 Q70 30 69 35" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <ellipse cx="69" cy="50" rx="13" ry="11"/>
            <rect x="74" y="47" width="18" height="5" rx="2.5"/>
            {/* 下段吊りレール */}
            <rect x="2" y="155" width="76" height="3" rx="1.5"/>
            {/* フック4 → 鍋蓋 */}
            <path d="M25 158 Q25 165 24 170" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <ellipse cx="24" cy="178" rx="20" ry="6"/>
            <rect x="19" y="172" width="10" height="8" rx="4"/>
            {/* フック5 → 泡立て器 */}
            <path d="M60 158 Q60 165 59 170" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <ellipse cx="59" cy="177" rx="10" ry="9"/>
            <rect x="57" y="185" width="4" height="50" rx="2"/>
            <path d="M52 179 Q59 191 66 179" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M52 185 Q59 197 66 185" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M52 191 Q59 203 66 191" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>

        {/* ── 右サイド：ディナープレートシルエット ── */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-[1]" style={{ opacity: 0.13 }}>
          <svg viewBox="0 0 80 280" width="72" height="252" xmlns="http://www.w3.org/2000/svg" fill="white">
            {/* 5枚積みプレート（下から上へ） */}
            {/* Plate 5 - bottom */}
            <ellipse cx="40" cy="248" rx="38" ry="9"/>
            <path d="M2 248 Q2 258 40 261 Q78 258 78 248 Z" fill="white"/>
            {/* Plate 4 */}
            <ellipse cx="40" cy="216" rx="38" ry="9"/>
            <path d="M2 216 Q2 226 40 229 Q78 226 78 216 Z" fill="white"/>
            {/* Plate 3 */}
            <ellipse cx="40" cy="184" rx="38" ry="9"/>
            <path d="M2 184 Q2 194 40 197 Q78 194 78 184 Z" fill="white"/>
            {/* Plate 2 */}
            <ellipse cx="40" cy="152" rx="38" ry="9"/>
            <path d="M2 152 Q2 162 40 165 Q78 162 78 152 Z" fill="white"/>
            {/* Plate 1 - top */}
            <ellipse cx="40" cy="120" rx="38" ry="9"/>
            <path d="M2 120 Q2 130 40 133 Q78 130 78 120 Z" fill="white"/>
            {/* 台（table surface） */}
            <rect x="0" y="259" width="80" height="4.5" rx="2"/>
            <rect x="6" y="263" width="68" height="3" rx="1.5"/>
          </svg>
        </div>

        {/* ──────── キッチン本体 ──────── */}
        <motion.div
          ref={kitchenRef}
          animate={shakeControls}
          className="relative rounded"
          style={{
            width: 'min(88vw, 340px)',
            height: 'min(88vw, 340px)',
            overflow: 'visible',
            border: '3px solid #909898',
            outline: '3px solid #505858',
            boxShadow: '0 0 20px rgba(160,200,220,0.15), 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.35), 0 0 32px rgba(212,175,55,0.07)',
            transform: 'translateZ(0)',
          }}
        >
          {/* 床タイル */}
          <div className="absolute inset-0 rounded overflow-hidden pointer-events-none z-0"
               style={{
                 backgroundColor: '#f0f0ee',
                 backgroundImage: [
                   'repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(160,160,160,0.55) 35px, rgba(160,160,160,0.55) 36px)',
                   'repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(160,160,160,0.55) 35px, rgba(160,160,160,0.55) 36px)',
                 ].join(', '),
               }} />

          {/* 奥の壁（ステンレス） */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none z-[1] overflow-hidden"
               style={{
                 height: '22%',
                 background: 'linear-gradient(180deg, #8898a8 0%, #b0c0cc 25%, #d8e4ec 55%, #c0ccd4 80%, #a0b0bc 100%)',
                 backgroundImage: [
                   'repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)',
                   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0) 85%, transparent 100%)',
                 ].join(', '),
                 borderBottom: '3px solid #607080',
               }}>
            <div style={{
              position: 'absolute', top: 4, left: '8%', right: '8%', height: 3,
              background: 'linear-gradient(90deg, transparent, rgba(255,240,180,0.7) 20%, rgba(255,240,180,0.9) 50%, rgba(255,240,180,0.7) 80%, transparent)',
              borderRadius: 2, boxShadow: '0 0 8px rgba(255,220,100,0.5)',
            }} />
          </div>

          <div className="absolute top-[22%] left-0 right-0 h-3 pointer-events-none z-[1]"
               style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none z-[1]"
               style={{ top: '50%', background: 'linear-gradient(180deg, transparent 0%, rgba(220,230,240,0.08) 100%)' }} />

          {/* 床グリッド（タップ可能） */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 z-[2]">
            {[...Array(25)].map((_, i) => {
              const gx = i % 5;
              const gy = Math.floor(i / 5);
              return (
                <div
                  key={i}
                  onClick={() => {
                    // スワイプ直後の誤タップを無視
                    if (didSwipeRef.current) { didSwipeRef.current = false; return; }
                    moveChef(gx, gy);
                  }}
                  className="cursor-pointer active:bg-white/20 transition-colors"
                  style={{ border: '0.5px solid rgba(80,40,0,0.25)' }}
                />
              );
            })}
          </div>

          {/* ── 油こぼれエリア（通行不可障害物） ── */}
          <AnimatePresence>
            {oilTiles.map((tile, i) => (
              <motion.div
                key={`oil-${i}-${tile.x}-${tile.y}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.5 } }}
                className="absolute pointer-events-none z-[6]"
                style={{
                  left: `${tile.x * 20}%`,
                  top:  `${tile.y * 20}%`,
                  width: '20%',
                  height: '20%',
                }}
              >
                {/* 油だまり（茶色系・テカり） */}
                <motion.div
                  className="absolute inset-1 rounded-lg"
                  style={{
                    background: [
                      'radial-gradient(ellipse at 40% 30%, rgba(200,160,40,0.9) 0%, rgba(140,90,10,0.75) 45%, rgba(80,50,0,0.5) 80%, transparent 100%)',
                    ].join(', '),
                    boxShadow: 'inset 0 2px 6px rgba(255,220,80,0.4), 0 0 8px rgba(160,110,0,0.5)',
                    border: '1.5px solid rgba(180,130,20,0.6)',
                  }}
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ repeat: Infinity, duration: 1.0 }}
                />
                {/* 光沢ハイライト */}
                <motion.div
                  className="absolute"
                  style={{ top: '18%', left: '22%', width: '35%', height: '20%', borderRadius: '50%', background: 'rgba(255,240,120,0.5)', filter: 'blur(3px)' }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                />
                {/* ペナルティアイコン + ラベル */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <motion.span
                    style={{ fontSize: 14, lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                    animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  >⚠️</motion.span>
                  <span style={{ fontSize: '0.34rem', fontWeight: 900, color: '#ffe060', textShadow: '0 1px 3px rgba(0,0,0,0.9)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    -10s
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ═══════ 調理ステーション（memo化コンポーネント） ═══════ */}
          <KitchenStations chefPos={gameState.chefPos} ovenBroken={ovenBroken} stoveBroken={stoveBroken} />

          {/* ── フィールドポップアップ ── */}
          <AnimatePresence>
            {popups.map(popup => (
              <motion.div key={popup.id}
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -40, opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ left: `${popup.x * 20 + 10}%`, top: `${popup.y * 20}%` }}
                className="absolute z-[70] pointer-events-none -translate-x-1/2"
              >
                <div className="bg-white text-[#800000] px-3 py-1 rounded-full font-black text-xs shadow-lg border-2 border-[#800000] whitespace-nowrap">
                  {popup.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── コンボポップアップ ── */}
          <AnimatePresence>
            {comboPopup && (
              <motion.div
                key="combo-popup"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0, y: -30 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute inset-0 flex items-center justify-center z-[65] pointer-events-none"
              >
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                    className="px-6 py-2 rounded-full font-black text-3xl shadow-2xl border-4"
                    style={{
                      background: comboPopup.freeze > 0
                        ? 'linear-gradient(135deg, #1040c0, #4080ff)'
                        : 'linear-gradient(135deg, #d4af37, #ff8c00)',
                      borderColor: comboPopup.freeze > 0 ? '#80c0ff' : '#800000',
                      color: '#fff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}
                  >
                    {comboPopup.count} COMBO!
                  </motion.div>
                  <div className="px-4 py-1 rounded-full font-black text-sm text-white shadow-lg"
                       style={{ background: 'rgba(0,0,0,0.7)' }}>
                    +{comboPopup.bonus} pts
                    {comboPopup.freeze > 0 && (
                      <span className="ml-2" style={{ color: '#80c0ff' }}>
                        ⏸ TIME FREEZE {comboPopup.freeze}s!
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 2Dシェフ ── */}
          <motion.div
            animate={{
              x: gameState.chefPos.x * cellSize,
              y: gameState.chefPos.y * cellSize,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="absolute z-50 pointer-events-none w-[20%] h-[20%] flex items-center justify-center"
            style={{ willChange: 'transform' }}
          >
            <div className="relative scale-125">
              <Chef direction={chefDirection} isMoving={isChefMoving} x={0} y={0} />
            </div>
          </motion.div>
        </motion.div>

      </main>

      {/* ── オーダーエリア ── */}
      <footer className="flex-shrink-0 h-32 p-2 flex gap-2 overflow-x-auto border-t-2 border-zinc-700 shadow-inner scrollbar-hide overflow-y-hidden"
              style={{ background: 'linear-gradient(180deg, #282018 0%, #1a1510 100%)', touchAction: 'pan-x' }}>
        <AnimatePresence mode="popLayout">
          {gameState.orders.map(order => {
            const isPhase3 = gameState.timeLeft <= 30 && isPlaying && !gameState.isGameOver;
            const initialTime = order.initialLimitTime ?? order.limitTime;
            const isDanger = isPhase3 || order.limitTime < initialTime * 0.5;
            const blinkDuration = isPhase3 ? 0.18 : 0.38;
            return (
              <motion.div
                key={order.id}
                initial={{ x: 100, opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ type: 'tween', duration: 0.2 }}
                className={`relative overflow-hidden h-full p-2 rounded-sm border-l-4 shadow-xl flex flex-col justify-between items-start
                  ${order.orderType === 'course' ? 'min-w-[170px]' : 'min-w-[140px]'}
                  ${isDanger          ? 'border-red-600 bg-red-50'     :
                    order.orderType === 'course'  ? 'border-yellow-400 bg-yellow-50' :
                    order.orderType === 'regular' ? 'border-green-500 bg-green-50'  :
                    order.orderType === 'rush'    ? 'border-orange-500 bg-orange-50' :
                    order.isVIP                   ? 'border-yellow-500 bg-yellow-50' :
                    'border-[#800000] bg-white'}
                `}
              >
                {/* 赤点滅オーバーレイ（GPU compositor CSS animation） */}
                {isDanger && (
                  <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                      background: 'rgba(200, 0, 0, 0.22)',
                      animation: `danger-blink ${blinkDuration}s ease-in-out infinite`,
                      willChange: 'opacity',
                    }}
                  />
                )}
                <div className="relative z-[1] w-full">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center gap-1">
                      <p className={`text-[7px] font-bold tracking-widest uppercase
                        ${order.orderType === 'course'  ? 'text-yellow-700' :
                          order.orderType === 'regular' ? 'text-green-700'  :
                          order.orderType === 'rush'    ? 'text-orange-700' :
                          order.isVIP                   ? 'text-yellow-700' : 'text-[#800000]'}`}>
                        {order.orderType === 'course'  ? '👑 COURSE' :
                         order.orderType === 'regular' ? `${order.regularEmoji} 常連` :
                         order.orderType === 'rush'    ? '🔥 RUSH'   :
                         order.isVIP                   ? '⭐ VIP'    : 'MENU'}
                      </p>
                      {isDanger && <AlertTriangle size={8} className="text-red-600" />}
                    </div>
                    <span className={`text-[8px] font-bold
                      ${order.orderType === 'rush' ? 'text-orange-600' :
                        order.isVIP ? 'text-yellow-600' : 'text-gray-400'}`}>
                      +{order.dish.points}
                    </span>
                  </div>
                  {order.orderType === 'regular' && order.regularName && (
                    <p className="text-[7px] text-green-700 font-bold mb-0.5 truncate">{order.regularName}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{order.dish.icon}</span>
                    <p className="text-[10px] font-black tracking-tighter leading-none">{order.dish.name}</p>
                  </div>
                </div>

                <div className="relative z-[1] mt-1 w-full">
                  <div className="flex justify-between text-[6px] font-bold text-gray-400 uppercase mb-1">
                    <span>工程進捗</span>
                    <span className={isDanger ? 'text-red-600 font-black' : ''}>
                      {Math.ceil(order.limitTime / 1000)}s
                    </span>
                  </div>
                  <div className="flex gap-0.5 flex-nowrap overflow-hidden">
                    {order.dish.steps.map((step, idx) => {
                      const isCompleted = idx < order.currentStepIndex;
                      const isCurrent   = idx === order.currentStepIndex;
                      return (
                        <div key={idx}
                             className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border transition-colors
                               ${isCompleted ? 'bg-green-50 border-green-500 text-green-600' :
                                 isCurrent   ? 'bg-yellow-50 border-yellow-500 text-yellow-600 animate-pulse' :
                                 'bg-gray-50 border-gray-100 text-gray-300 opacity-40'}`}>
                          {isCompleted ? <CheckCircle2 size={8} /> : STATION_ICONS[step]}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-[1] mt-1 w-full flex items-center justify-between border-t border-gray-100 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-bold text-[#800000] uppercase">次:</span>
                    <div className={`px-1.5 py-0.5 rounded border ${isDanger ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <span className={`text-[10px] font-bold ${isDanger ? 'text-red-600' : ''}`}>
                        {STATION_ICONS[order.dish.steps[order.currentStepIndex]] || '完了'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </footer>

      {/* ── オーバーレイ（スタート / ゲームオーバー） ── */}
      <AnimatePresence>
        {!isPlaying && !gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/95 p-4 overflow-y-auto"
          >
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full rounded-lg bg-white p-6 text-center shadow-2xl border-4 border-[#d4af37] my-auto">
              <div className="text-5xl mb-4">👨‍🍳</div>
              <h2 className="text-3xl font-black text-[#800000] uppercase tracking-widest mb-1">Pocket Kitchen</h2>
              <p className="text-xs text-[#d4af37] font-bold tracking-widest mb-3">ポケットキッチン</p>
              {bestScore > 0 && (
                <div className="flex justify-center gap-4 mb-3 px-4 py-2 rounded-lg border border-[#d4af37]/40"
                     style={{ background: 'rgba(212,175,55,0.08)' }}>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#a07840]">BEST SCORE</p>
                    <p className="text-lg font-black text-[#d4af37]">{bestScore.toLocaleString()}</p>
                  </div>
                  <div className="w-px bg-[#d4af37]/30" />
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#a07840]">BEST RANK</p>
                    <p className="text-2xl font-black" style={{ color: bestRank === 'S' ? '#c8a000' : bestRank === 'A' ? '#d4af37' : bestRank === 'B' ? '#888' : '#a06030' }}>
                      {bestRank}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-2 leading-relaxed italic">
                シェフを操ってステーションを巡ろう！
              </p>
              <div className="text-[11px] text-gray-500 mb-3 leading-relaxed space-y-0.5">
                <p>🔪まな板 → ♨️オーブン → 🍳コンロ</p>
                <p>🍟揚場 → 🍽️作業台 → 🛎️盛り台</p>
              </div>
              <p className="text-[10px] text-gray-400 mb-6 leading-relaxed">
                ◀▲▼▶ボタンまたはグリッドタップで移動<br />
                同時完成でコンボ！ 2連続クレームでトラブル！
              </p>
              <button onClick={startGame}
                className="w-full py-4 bg-[#800000] text-[#d4af37] font-bold uppercase tracking-[0.3em] rounded-sm shadow-xl hover:bg-[#600000] transition-colors text-base">
                開店する
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-[#1a1a1a]/98 p-4 overflow-y-auto"
          >
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-2xl border-4 border-[#d4af37] my-4">
              <div className="flex justify-center mb-3">
                <ChefHat size={48} className="text-[#800000]" />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-[0.4em] text-[#800000] mb-3">サービス終了</h2>

              {/* スコア + ランク */}
              {(() => {
                const rank = getScoreRank(gameState.score);
                return (
                  <div className="mb-4">
                    <div className="text-5xl font-black tracking-tighter" style={{ color: '#1a1a1a' }}>
                      {gameState.score.toLocaleString()}
                    </div>
                    <div className="mt-2 flex flex-col items-center gap-0.5">
                      <span className="text-lg tracking-widest" style={{ color: rank.color }}>{rank.stars}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: rank.color }}>{rank.label}</span>
                      <span className="text-xs font-bold" style={{ color: rank.color }}>― {rank.ja} ―</span>
                    </div>
                  </div>
                );
              })()}

              <div className="relative rounded-lg bg-[#f5f5f5] p-5 pt-8 border-2 border-[#d4af37] mb-5">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#d4af37] px-4 py-1 rounded-full text-[9px] font-bold text-[#1a1a1a] uppercase tracking-widest whitespace-nowrap">
                  批評家の評
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                  className="text-sm font-serif italic text-[#1a1a1a] leading-relaxed"
                >
                  {review}
                </motion.p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleRestart}
                className="w-full py-4 bg-[#800000] text-[#d4af37] font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl border-2 border-[#d4af37] hover:bg-[#600000] transition-colors text-sm"
              >
                厨房に戻る（再挑戦）
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
