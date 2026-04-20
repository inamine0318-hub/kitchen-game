import { useRef, useCallback, useEffect } from 'react';

// ─── 音名 → 周波数 (Hz) ────────────────────────────────────────────────
const NOTE: Record<string, number> = {
  B3:  246.94,
  C4:  261.63, D4:  293.66, Eb4: 311.13, E4:  329.63,
  F4:  349.23, Gb4: 369.99, G4:  392.00, Ab4: 415.30,
  A4:  440.00, Bb4: 466.16, B4:  493.88,
  C5:  523.25, D5:  587.33, Eb5: 622.25, E5:  659.25,
  F5:  698.46, Gb5: 739.99, G5:  783.99, Ab5: 830.61,
};

interface PhaseConfig {
  noteDuration: number;    // 1音の長さ（秒）
  melody: string[];        // 音名配列（ループ）
  waveform: OscillatorType;
  filterFreq: number;      // ローパスフィルタ遮断周波数
  peakGain: number;        // 音量ピーク (0〜1)
  attackTime: number;      // アタック（秒）
  releaseRatio: number;    // リリース = noteDuration × this
}

// ─── フェーズ別 BGM 定義 ───────────────────────────────────────────────
const PHASES: PhaseConfig[] = [
  {
    // Phase 0: 優雅なフレンチカフェ（90 BPM 8分音符）
    noteDuration: 60 / 90 / 2,   // ≈ 0.333s
    melody: [
      'C4','G4','E4','C5',
      'B4','G4','E4','B3',
      'F4','C5','A4','F4',
      'G4','D5','B4','G4',
    ],
    waveform:    'triangle',
    filterFreq:  1600,
    peakGain:    0.14,
    attackTime:  0.015,
    releaseRatio: 0.75,
  },
  {
    // Phase 1: 焦燥感のあるキッチン（130 BPM 8分音符）
    noteDuration: 60 / 130 / 2,  // ≈ 0.231s
    melody: [
      'A4','E5','C5','A4',
      'G4','D5','Bb4','G4',
      'F4','C5','A4','F4',
      'E4','B4','G4','E4',
    ],
    waveform:    'triangle',
    filterFreq:  2400,
    peakGain:    0.12,
    attackTime:  0.010,
    releaseRatio: 0.70,
  },
  {
    // Phase 2: 地獄の厨房（170 BPM、減7和音アルペジオ）
    noteDuration: 60 / 170 / 2,  // ≈ 0.176s
    melody: [
      'C5','Eb5','Gb5','A4',
      'Eb5','Gb5','A4','C5',
      'B4','D5','F5','Ab5',
      'D5','F5','Ab5','B4',
    ],
    waveform:    'sawtooth',
    filterFreq:  900,
    peakGain:    0.09,
    attackTime:  0.005,
    releaseRatio: 0.60,
  },
];

export function useBGM() {
  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef     = useRef(0);
  const noteIdxRef   = useRef(0);
  const nextTimeRef  = useRef(0);
  const runningRef   = useRef(false);

  // 1音をスケジュール
  const scheduleNote = useCallback((time: number, phaseIdx: number) => {
    const ctx    = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;

    const phase = PHASES[phaseIdx];
    const key   = phase.melody[noteIdxRef.current % phase.melody.length];
    const freq  = NOTE[key];
    if (!freq) return;

    const osc    = ctx.createOscillator();
    const env    = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = phase.waveform;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(phase.filterFreq, time);
    filter.Q.setValueAtTime(0.7, time);

    const dur = phase.noteDuration;
    const rel = time + dur * phase.releaseRatio;

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(phase.peakGain, time + phase.attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, rel);

    osc.connect(filter);
    filter.connect(env);
    env.connect(master);

    osc.start(time);
    osc.stop(rel + 0.05);
  }, []);

  // ルックアヘッドスケジューラ（25ms ポーリング）
  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const LOOKAHEAD = 0.12; // 120ms 先まで積む
    const phaseIdx  = phaseRef.current;
    const noteDur   = PHASES[phaseIdx].noteDuration;

    while (nextTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      scheduleNote(nextTimeRef.current, phaseIdx);
      noteIdxRef.current  = (noteIdxRef.current + 1) % PHASES[phaseIdx].melody.length;
      nextTimeRef.current += noteDur;
    }

    schedulerRef.current = setTimeout(tick, 25);
  }, [scheduleNote]);

  // 開始（ユーザー操作直後に呼ぶこと → autoplay 制限回避）
  const start = useCallback(() => {
    // 既存セッションを破棄
    runningRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    ctxRef.current?.close().catch(() => {});

    const ctx    = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(1.0, ctx.currentTime);
    master.connect(ctx.destination);

    ctxRef.current      = ctx;
    masterRef.current   = master;
    phaseRef.current    = 0;
    noteIdxRef.current  = 0;
    nextTimeRef.current = ctx.currentTime + 0.05;
    runningRef.current  = true;

    tick();
  }, [tick]);

  // フェーズ切替（シーケンスを先頭に巻き戻す）
  const setPhase = useCallback((phase: number) => {
    const clamped = Math.max(0, Math.min(2, phase));
    if (phaseRef.current === clamped) return;
    phaseRef.current   = clamped;
    noteIdxRef.current = 0;
  }, []);

  // 停止（フェードアウト付き）
  const stop = useCallback(() => {
    runningRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);

    const master = masterRef.current;
    const ctx    = ctxRef.current;
    if (master && ctx) {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => {
        ctx.close().catch(() => {});
        ctxRef.current    = null;
        masterRef.current = null;
      }, 500);
    }
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    ctxRef.current?.close().catch(() => {});
  }, []);

  return { start, stop, setPhase };
}
