import { useRef, useCallback } from 'react';

export function useSE() {
  const ctxRef = useRef<AudioContext | null>(null);

  // AudioContext を取得（なければ生成）
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

  // ユーザー操作時に AudioContext を生成しておく（iOS autoplay 対策）
  const prime = useCallback(() => { getCtx(); }, [getCtx]);

  // 基本音生成（fire & forget）
  const tone = useCallback((
    startFreq: number,
    endFreq: number,
    duration: number,
    waveform: OscillatorType,
    peakGain: number,
    delaySeconds: number = 0,
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

  // ─── 料理完成音（C-E-G ファンファーレ）──────────────────────────────
  const playComplete = useCallback(() => {
    tone(523, 523, 0.08, 'sine', 0.28);
    tone(659, 659, 0.08, 'sine', 0.28, 0.09);
    tone(784, 784, 0.20, 'sine', 0.34, 0.18);
  }, [tone]);

  // ─── ミス・タイムアウト音（下降するノイズ混じりバズ）─────────────
  const playMiss = useCallback(() => {
    tone(220, 60, 0.35, 'sawtooth', 0.18);
  }, [tone]);

  // ─── トラブル警告音（サイレン 4 パルス）────────────────────────────
  const playWarning = useCallback(() => {
    [0, 0.18, 0.36, 0.54].forEach((delay, i) => {
      tone(i % 2 === 0 ? 880 : 660, i % 2 === 0 ? 880 : 660, 0.16, 'square', 0.13, delay);
    });
  }, [tone]);

  return { prime, playStep, playComplete, playMiss, playWarning };
}
