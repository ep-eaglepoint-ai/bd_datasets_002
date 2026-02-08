import time


CUSTOM_EPOCH = 1704067200  # Jan 1, 2024 00:00:00 UTC
MAX_SEQUENCE = (1 << 12) - 1


class ChronoSequence:
    def __init__(self, worker_id):
        if not isinstance(worker_id, int) or not (0 <= worker_id <= 1023):
            raise ValueError("worker_id must be in 0..1023")
        self.worker_id = worker_id
        self.last_timestamp = -1
        self.sequence = 0

    def next_id(self) -> int:
        # compute milliseconds since custom epoch
        timestamp = int((time.time() - CUSTOM_EPOCH) * 1000)
        prev = self.last_timestamp
        # detect clock rollback
        if prev != -1 and timestamp < prev:
            raise SystemError("Clock moved backwards")
        if timestamp == prev:
            if self.sequence == MAX_SEQUENCE:
                # busy-wait until next millisecond
                while True:
                    timestamp = int((time.time() - CUSTOM_EPOCH) * 1000)
                    if timestamp < prev:
                        raise SystemError("Clock moved backwards")
                    if timestamp > prev:
                        # reset sequence for new millisecond
                        self.sequence = 0
                        break
            else:
                self.sequence += 1
        elif timestamp > prev:
            self.sequence = 0

        # update state for tests and future logic
        self.last_timestamp = timestamp
        # assemble 64-bit ID: [1 bit 0][41 bits timestamp][10 bits worker_id][12 bits sequence]
        id64 = (timestamp << (10 + 12)) | (self.worker_id << 12) | self.sequence
        return id64
