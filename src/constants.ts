import { Dish, StationType, Position } from './types';

// ─── ステージ設定 ─────────────────────────────────────────────────────────
export interface StageConfig {
  stage: number;
  name: string;
  emoji: string;
  spawnRate: number;    // 注文スポーン間隔 (ms)
  patience: number;     // 客の待ち時間上限 (ms)
  maxOrders: number;    // 同時注文数上限
  announceBg: string;
  announcement: string;
}

export const STAGES: StageConfig[] = [
  {
    stage: 1, name: '平日', emoji: '📅',
    spawnRate: 4000, patience: 10000, maxOrders: 2,
    announceBg: '#1a3a1a', announcement: '平日営業スタート！落ち着いてこなせ',
  },
  {
    stage: 2, name: '金曜', emoji: '🌙',
    spawnRate: 2500, patience: 8500, maxOrders: 3,
    announceBg: '#3a2800', announcement: '金曜！注文が殺到してきた！',
  },
  {
    stage: 3, name: '土曜', emoji: '🔥',
    spawnRate: 1500, patience: 7000, maxOrders: 4,
    announceBg: '#5a0000', announcement: '土曜地獄！休む暇はない！',
  },
  {
    stage: 4, name: '地獄', emoji: '💀',
    spawnRate: 1200, patience: 7000, maxOrders: 4,
    announceBg: '#3a003a', announcement: '地獄の最終章！もう後がない！',
  },
];

export const DISHES: Dish[] = [
  // ══════════════════════════════════════════════════════
  // 初級（3工程）: 0-30s に出現
  //   ルール: 必ず SERVE で終了
  // ══════════════════════════════════════════════════════
  {
    id: 'escargot',
    name: 'エスカルゴ',
    icon: '🐌',
    steps: ['PREP', 'OVEN', 'SERVE'],
    points: 90,
    color: '#CAFFBF',
  },
  {
    id: 'onion_soup',
    name: 'オニオングラタンスープ',
    icon: '🥣',
    steps: ['PREP', 'STOVE', 'SERVE'],
    points: 80,
    color: '#FFD6A5',
  },
  {
    id: 'nicoise_salad',
    name: 'ニース風サラダ',
    icon: '🥗',
    steps: ['PREP', 'TABLE', 'SERVE'],
    points: 70,
    color: '#B5EAD7',
  },

  // ══════════════════════════════════════════════════════
  // 中級（4工程）: 31-60s から追加出現
  //   ルール: 必ず SERVE で終了
  // ══════════════════════════════════════════════════════
  {
    id: 'duck_confit',
    name: '鴨のコンフィ',
    icon: '🍖',
    // コンフィ→盛り付け
    steps: ['PREP', 'OVEN', 'TABLE', 'SERVE'],
    points: 130,
    color: '#C7CEEA',
  },
  {
    id: 'tai_poele',
    name: '真鯛のポワレ',
    icon: '🐟',
    // ポワレ（フライパン焼き）→盛り付け
    steps: ['PREP', 'STOVE', 'TABLE', 'SERVE'],
    points: 120,
    color: '#9BF6FF',
  },
  {
    id: 'foie_gras',
    name: 'フォアグラのソテー',
    icon: '🦆',
    // 揚場でソテー→盛り付け
    steps: ['PREP', 'GARNISH', 'TABLE', 'SERVE'],
    points: 150,
    color: '#FFE4B5',
  },
  {
    id: 'quiche',
    name: 'キッシュ・ロレーヌ',
    icon: '🥧',
    // 仕込み→コンロで下火→オーブン→提供
    steps: ['PREP', 'STOVE', 'OVEN', 'SERVE'],
    points: 110,
    color: '#FDFFB6',
  },

  // ══════════════════════════════════════════════════════
  // 上級（5工程）: 61-90s から追加出現・高確率
  //   ルール: 必ず SERVE で終了
  // ══════════════════════════════════════════════════════
  {
    id: 'rossini',
    name: '牛フィレ肉のロッシーニ',
    icon: '🥩',
    // ソテー→オーブン仕上げ→盛り付け→提供
    steps: ['PREP', 'STOVE', 'OVEN', 'TABLE', 'SERVE'],
    points: 220,
    color: '#FFADAD',
  },
  {
    id: 'thermidor',
    name: 'オマール海老のテルミドール',
    icon: '🦞',
    // ソテー→揚場でソース→盛り付け→提供
    steps: ['PREP', 'STOVE', 'GARNISH', 'TABLE', 'SERVE'],
    points: 260,
    color: '#FFA07A',
  },
  {
    id: 'crepe_suzette',
    name: 'クレープ・シュゼット',
    icon: '🥞',
    // コンロで焼く→作業台でソース→揚場でフランベ→提供
    steps: ['PREP', 'STOVE', 'TABLE', 'GARNISH', 'SERVE'],
    points: 180,
    color: '#DDA0DD',
  },

  // ══════════════════════════════════════════════════════
  // 上級（6工程）: 61-90s に出現・最高難度コース扱い
  //   ルール: 必ず SERVE で終了
  // ══════════════════════════════════════════════════════
  {
    id: 'bouillabaisse',
    name: 'ブイヤベース',
    icon: '🥘',
    // 仕込み→コンロで煮込み→揚場で魚を揚げ→盛り付け→オーブン保温→提供
    steps: ['PREP', 'STOVE', 'GARNISH', 'TABLE', 'OVEN', 'SERVE'],
    points: 380,
    color: '#FFD6A5',
  },
  {
    id: 'venison',
    name: '鹿肉のグランヴヌール',
    icon: '🦌',
    // 仕込み→コンロ→オーブン→揚場でソース→盛り付け→提供
    steps: ['PREP', 'STOVE', 'OVEN', 'GARNISH', 'TABLE', 'SERVE'],
    points: 450,
    color: '#B5EAD7',
  },
];

export const STATION_ICONS: Record<StationType, string> = {
  PREP:    '🔪',
  STOVE:   '🍳',
  OVEN:    '♨️',
  GARNISH: '🍟',
  TABLE:   '🍽️',
  SERVE:   '🛎️',
  NONE:    '',
};

export const KITCHEN_SIZE = 5; // 5×5 グリッド

// ステーション配置：角4台＋中央1台＋上中央1台
export const STATIONS: Record<StationType, Position> = {
  PREP:    { x: 0, y: 0 }, // 左上：まな板
  STOVE:   { x: 4, y: 0 }, // 右上：コンロ
  OVEN:    { x: 2, y: 0 }, // 上中央：オーブン
  GARNISH: { x: 0, y: 4 }, // 左下：揚場
  SERVE:   { x: 4, y: 4 }, // 右下：盛りつけ台
  TABLE:   { x: 2, y: 2 }, // 中央：作業台
  NONE:    { x: -1, y: -1 },
};

export const GAME_DURATION = 90;
export const ORDER_INTERVAL = 2500;

export const REGULAR_CUSTOMERS = [
  { id: 'tanaka',   name: '田中さん',   emoji: '👴',  dishId: 'escargot',    message: 'いつものエスカルゴを頼む'   },
  { id: 'yamada',   name: '山田マダム', emoji: '👩‍🦳', dishId: 'quiche',      message: 'キッシュを今日も一つ'       },
  { id: 'sato',     name: '佐藤部長',   emoji: '👨‍💼', dishId: 'duck_confit', message: '鴨のコンフィを頼む'         },
  { id: 'suzuki',   name: '鈴木さん',   emoji: '🧑',  dishId: 'nicoise_salad', message: 'ニース風サラダをお願いします' },
  { id: 'miyamoto', name: '宮本シェフ', emoji: '🧑‍🍳', dishId: 'tai_poele',   message: 'ポワレ、いつも通りに'       },
];
