import { SPEED_MIN_KB, SPEED_MAX_KB, UPLOAD_TICK_MS } from '../libs/constants';
import { progressUpdate, messageUploadComplete } from '../store/reducer';

// --- Upload simulation: parallel, smooth 0-100, speed in [800,1500] KB/s (deterministic per file index) ---
export function startUploadSimulation(dispatch, messageId, files) {
  if (!files.length) return;
  const speeds = files.map((_, i) => SPEED_MIN_KB + (i * 233) % (SPEED_MAX_KB - SPEED_MIN_KB + 1)); // KB/s
  const uploaded = files.map(() => 0);

  function tick() {
    let allDone = true;
    const updates = [];
    files.forEach((f, i) => {
      if (uploaded[i] >= f.size) {
        updates.push({ fileId: f.id, progress: 100, speed: speeds[i], done: true });
        return;
      }
      allDone = false;
      const chunk = Math.min(f.size - uploaded[i], (speeds[i] * 1024 * UPLOAD_TICK_MS) / 1000);
      uploaded[i] += chunk;
      const progress = Math.min(100, (uploaded[i] / f.size) * 100);
      updates.push({ fileId: f.id, progress, speed: speeds[i], done: uploaded[i] >= f.size });
    });
    dispatch(progressUpdate({ messageId, updates }));
    if (allDone) {
      dispatch(messageUploadComplete(messageId));
      return;
    }
    setTimeout(tick, UPLOAD_TICK_MS);
  }
  tick();
}
