from flask import Flask, jsonify, request
import time
import random
import datetime

app = Flask(__name__)

@app.route("/api/v1/user-analytics/report", methods=["GET"])
def generate_user_analytics_report():
    user_id = request.args.get("user_id", "unknown")
    start_time = time.time()

    event_counts = {
        "click": 0,
        "view": 0,
        "purchase": 0
    }
    
    total_events = 20000
    scores_generated = 0
    event_types = ["click", "view", "purchase"]
    
    for _ in range(total_events):
        event_type = random.choice(event_types)
        event_counts[event_type] += 1
        
        value = random.random()
        score = value
        for _ in range(50):
            score = score * random.random()
        if score > 0.00001:
            scores_generated += 1

    processing_time = time.time() - start_time

    response = {
        "user_id": user_id,
        "report_generated_at": datetime.datetime.utcnow().isoformat(),
        "event_counts": event_counts,
        "total_events": total_events,
        "scores_generated": scores_generated,
        "processing_time_seconds": round(processing_time, 2),
        "status": "completed"
    }

    return jsonify(response), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
