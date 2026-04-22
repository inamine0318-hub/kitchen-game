import { useRef, useCallback } from 'react';

export function useSE() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const prime = useCallback(() => { getCtx(); }, [getCtx]);

  const tone = useCallback((
    startFreq: number,
    endFreq: number,
    duration: number,
    waveform: OscillatorType,
    peakGain: number,
    delaySeconds = 0,
  ) => {
    const ac = getCtx();
    if (!ac) return;
    try {
      const t0  = ac.currentTime + delaySeconds;
      const osc = ac.createOscillator();
      const env = ac.createGain();

      osc.type = waveform;
      osc.frequency.setValueAtTime(startFreq, t0);
      if (endFreq !== startFreq) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(endFreq, 20),
          t0 + duration * 0.85,
        );
      }

      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.012, duration * 0.15));
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(env);
      env.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch { /* noop */ }
  }, [getCtx]);

  // ─── 工程進捗音（明るい2音アルペジオ）─────────────────────────────
  const playStep = useCallback(() => {
    tone(880,  1047, 0.07, 'sine', 0.22);
    tone(1047, 1047, 0.10, 'sine', 0.16, 0.065);
  }, [tone]);

  // ─── 料理完成音（C-E-G-C' 4音ファンファーレ）────────────────────────
  const playPerfect = useCallback(() => {
    tone(523,  523,  0.07, 'sine',     0.30);          // C5
    tone(659,  659,  0.07, 'sine',     0.28, 0.07);    // E5
    tone(784,  784,  0.07, 'sine',     0.28, 0.14);    // G5
    tone(1047, 1047, 0.24, 'sine',     0.36, 0.21);    // C6（長め）
    tone(2093, 2093, 0.18, 'triangle', 0.07, 0.21);    // C7 shimmer
  }, [tone]);

  // ─── コンボ達成音（レベル別・爽快な上昇アルペジオ）──────────────────
  const playCombo = useCallback((level: number) => {
    if (level >= 8) {
      // Epic: 5音フルコード
      tone(523,  523,  0.06, 'triangle', 0.20);
      tone(659,  659,  0.06, 'triangle', 0.18, 0.06);
      tone(784,  784,  0.06, 'triangle', 0.18, 0.12);
      tone(1047, 1047, 0.28, 'sine',     0.34, 0.18);
      tone(1319, 1319, 0.24, 'sine',     0.26, 0.23);
    } else if (level >= 5) {
      // Strong: 4音
      tone(659,  659,  0.07, 'triangle', 0.22);
      tone(784,  784,  0.07, 'triangle', 0.20, 0.07);
      tone(1047, 1047, 0.22, 'sine',     0.28, 0.14);
      tone(1319, 1319, 0.18, 'sine',     0.22, 0.20);
    } else if (level >= 3) {
      // Medium: 3音
      tone(784,  784,  0.07, 'triangle', 0.22);
      tone(1047, 1047, 0.18, 'sine',     0.26, 0.07);
      tone(1319, 1319, 0.16, 'sine',     0.20, 0.14);
    } else {
      // Small: 2音ペア
      tone(880,  1047, 0.12, 'sine', 0.22);
      tone(1047, 1047, 0.15, 'sine', 0.18, 0.11);
    }
  }, [tone]);

  // ─── ミス・タイムアウト音（衝撃＋下降バズ）──────────────────────────
  const playMiss = useCallback(() => {
    tone(160, 60,  0.18, 'sine',     0.30);        // 低音インパクト
    tone(220, 55,  0.32, 'sawtooth', 0.16, 0.03);  // 下降バズ
  }, [tone]);

  // ─── トラブル警告音（サイレン 4 パルス）────────────────────────────
  const playWarning = useCallback(() => {
    [0, 0.18, 0.36, 0.54].forEach((delay, i) => {
      tone(i % 2 === 0 ? 880 : 660, i % 2 === 0 ? 880 : 660, 0.16, 'square', 0.13, delay);
    });
  }, [tone]);

  // ─── リザルト音（ランク別・1秒以内）────────────────────────────────
  const playResult = useCallback((rank: string) => {
    if (rank === 'S') {
      // 華やかな6音ファンファーレ
      tone(523,  523,  0.07, 'sine',     0.20);
      tone(659,  659,  0.07, 'sine',     0.18, 0.08);
      tone(784,  784,  0.07, 'sine',     0.18, 0.16);
      tone(1047, 1047, 0.26, 'sine',     0.24, 0.24);
      tone(1319, 1319, 0.22, 'sine',     0.20, 0.34);
      tone(2093, 2093, 0.18, 'triangle', 0.07, 0.40);
    } else if (rank === 'A') {
      // 明るい3音上昇
      tone(659,  659,  0.08, 'sine', 0.20);
      tone(784,  784,  0.08, 'sine', 0.18, 0.09);
      tone(1047, 1047, 0.26, 'sine', 0.24, 0.18);
    } else if (rank === 'B') {
      // 標準2音
      tone(523, 523, 0.08, 'sine', 0.18);
      tone(784, 784, 0.22, 'sine', 0.20, 0.10);
    } else if (rank === 'C') {
      // 弱め1音フェード
      tone(440, 392, 0.30, 'triangle', 0.14);
    } else {
      // Dランク: 下降2音
      tone(330, 196, 0.32, 'sawtooth', 0.12);
      tone(196, 110, 0.22, 'sine',     0.08, 0.22);
    }
  }, [tone]);

  return { prime, playStep, playPerfect, playCombo, playMiss, playWarning, playResult };
}
