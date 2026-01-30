# Trajectory: Making Chat Work Across Multiple Servers

## The Problem: "Islands" of Data
Right now, the chat app works like a single room in a house. If everyone is in that room (connected to one server), they can hear each other.

But in production, we use **multiple servers** to handle the load. This creates "islands." If User A connects to Server 1 and User B connects to Server 2, they are in different rooms. Server 1 has no idea that User B exists on Server 2. We need a way to connect these islands.

## The Solution: Redis Pub/Sub
We use Redis as a central "Megaphone."
1.  **Publish:** When a user sends a message, the server doesn't show it immediately. Instead, it sends the message to Redis.
2.  **Subscribe:** All servers are constantly listening to Redis.
3.  **Broadcast:** When Redis receives a message, it shouts it out to all servers. The servers then pass that message to the users connected to them.

## Implementation Steps
1.  **Two Connections:** We use two Redis links. One for *talking* (Publishing) and one specifically for *listening* (Subscribing).
2.  **Room Tracking:** Since we can't simply check a variable to see if a room is active globally, we use a Redis key with a **TTL (Time To Live)**. Think of it like a timer: every time someone joins or speaks, we reset the timer to 5 minutes. If the timer runs out, the room is considered empty.
3.  **Safety:** We add a unique ID to every server instance. This helps us track where messages came from in logs.

## Why I did it this way (Refinement)
I initially thought about showing the message to the sender immediately to make it feel faster.
*   **Correction:** I decided against this. It's cleaner to treat *every* message the same way: Send to Redis -> Wait for Redis -> Show to User. This ensures everyone sees the messages in the exact same order.

## Testing
Since we can't easily spin up a real Redis database in our testing code, we "mock" it. We create a fake Redis inside the test that acts just like the real one—if you put data in, it spits data out. This proves our code works without needing the real database running.

---

### 📚 Recommended Resources

**1. Watch: Redis Pub/Sub in 5 Minutes**
A quick visual guide on how the Publish/Subscribe pattern works.
*   [YouTube: Redis Pub/Sub Explained](https://www.youtube.com/watch?v=Hbt56gFj998)

**2. Watch: Scaling Socket.io**
A specific guide on why Socket.io needs Redis when you have more than one server.
*   [YouTube: Scaling Socket.io with Redis](https://www.youtube.com/watch?v=UV7k1a3EaLY)

**3. Read: Horizontal vs. Vertical Scaling**
Understanding *why* we are adding more servers instead of just making one server bigger.
*   [Article: DigitalOcean - Horizontal vs Vertical Scaling](https://www.digitalocean.com/community/tutorials/horizontal-vs-vertical-scaling-what-is-the-difference)