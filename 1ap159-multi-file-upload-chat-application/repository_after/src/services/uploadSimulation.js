import { SPEED_MIN_KB, SPEED_MAX_KB, UPLOAD_TICK_MS } from "../libs/constants";
import { actions } from "../state/chatContext";

function getRandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clearAllUploadIntervals(intervalsRef) {
  if (!intervalsRef?.current) return;
  intervalsRef.current.forEach((intervalId) => clearInterval(intervalId));
  intervalsRef.current.clear();
}

export function startUploadSimulation({
  dispatch,
  messageId,
  files,
  uploadIntervalsRef,
}) {
  if (!files.length) return;
  const totalFiles = files.length;
  let completed = 0;

  files.forEach((file) => {
    const durationMs = getRandomBetween(2000, 4000);
    const totalTicks = Math.max(1, Math.ceil(durationMs / UPLOAD_TICK_MS));
    const progressIncrement = 100 / totalTicks;
    const baseSpeed = file.size / 1024 / (durationMs / 1000);
    const jitter = getRandomBetween(-80, 80);
    const speed = Math.min(
      SPEED_MAX_KB,
      Math.max(SPEED_MIN_KB, baseSpeed + jitter),
    );
    let progress = 0;

    dispatch({
      type: actions.START_FILE_UPLOAD,
      payload: { messageId, fileId: file.id },
    });

    const intervalId = setInterval(() => {
      progress = Math.min(100, progress + progressIncrement);
      dispatch({
        type: actions.UPDATE_FILE_PROGRESS,
        payload: { messageId, fileId: file.id, progress, speed },
      });

      if (progress >= 100) {
        clearInterval(intervalId);
        uploadIntervalsRef.current.delete(`${messageId}:${file.id}`);
        dispatch({
          type: actions.COMPLETE_FILE_UPLOAD,
          payload: { messageId, fileId: file.id },
        });
        completed += 1;
        if (completed >= totalFiles) {
          dispatch({
            type: actions.COMPLETE_MESSAGE_UPLOAD,
            payload: { messageId },
          });
        }
      }
    }, UPLOAD_TICK_MS);

    uploadIntervalsRef.current.set(`${messageId}:${file.id}`, intervalId);
  });
}
