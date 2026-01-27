# 63SUBP - Real-Time Auction Engine with Soft Close and Atomic Locking

**Category:** sft

## Overview
- Task ID: 63SUBP
- Title: Real-Time Auction Engine with Soft Close and Atomic Locking
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 63subp-real-time-auction-engine-with-soft-close-and-atomic-locking

## Requirements
- The backend must ensure that if two concurrent requests try to bid the same amount, only one succeeds. Using a standard if (bid > current) update() without locking or DB constraints is a Fail.
- If a bid arrives when remaining_time < 60s, the end_time must be updated to now + 60s.  Timer Synchronization: When the timer extends, the backend must emit a WebSocket event (e.g., TIMER_UPDATE) with the new absolute timestamp. The frontend must update its countdown immediately upon receipt
- The backend must explicitly check if (now > end_time) before accepting a bid. Relying solely on the frontend to disable the button is a security failure.
- When the timer extends, the backend must emit a WebSocket event (e.g., TIMER_UPDATE) with the new absolute timestamp. The frontend must update its countdown immediately upon receipt.
- A new bid must be strictly greater than the current highest bid plus a minimum increment (or just greater).
- All connected clients must receive the new bid and price within milliseconds via socket.io. Polling (using setInterval to fetch price) is a failure
- The logic must handle the case where a bid is rejected (Outbid). The API should return a 409 Conflict or 400 Bad Request, and the frontend must display "You were outbid" without refreshing the page.
- If using SQL, the bids table must have a foreign key to the items table. Ideally, the current_price update and the bid_history insert happen in the same transaction.
- Determining the winner or the validity of the bid must happen on the server. Client-side validation is purely cosmetic

## Metadata
- Programming Languages: Node js, React
- Frameworks: Express , React
- Libraries: socket.io
- Databases: SQLITE
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
