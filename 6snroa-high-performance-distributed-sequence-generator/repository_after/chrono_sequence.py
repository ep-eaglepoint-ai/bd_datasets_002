import time


CUSTOM_EPOCH = 1704067200  # Jan 1, 2024 00:00:00 UTC


class ChronoSequence:
    def __init__(self, worker_id):
        self.worker_id = worker_id
        self.last_timestamp = -1
        self.sequence = 0

    def next_id(self) -> int:
        # compute milliseconds since custom epoch
        timestamp = int((time.time() - CUSTOM_EPOCH) * 1000)
        if timestamp < 0:
            timestamp = 0

        prev = self.last_timestamp
        if timestamp == prev:
            self.sequence += 1
        elif timestamp > prev:
            self.sequence = 0

        # update state for tests and future logic
        self.last_timestamp = timestamp
        # assemble 64-bit ID: [1 bit 0][41 bits timestamp][10 bits worker_id][12 bits sequence]
        id64 = (timestamp << (10 + 12)) | (self.worker_id << 12) | self.sequence
        return id64
