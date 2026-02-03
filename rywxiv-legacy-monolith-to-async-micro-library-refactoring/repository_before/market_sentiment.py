import requests
import time
from datetime import datetime

# Global cache - horrible practice
sentiment_cache = {}
API_KEY = "legacy_key_123"

def get_sentiment(ticker, data_points=[]):
    # Bug: Mutable default argument retains state between calls!
    url = f"https://api.legacy-news-provider.com/v1/{ticker}?key={API_KEY}"
    try:
        # Blocking I/O
        resp = requests.get(url) 
        if resp.status_code == 200:
            json_data = resp.json()
            for article in json_data['articles']:
                # Arbitrary logic mixing parsing and calculation
                score = article['polarity'] * article['confidence']
                data_points.append(score)
            
            # Silent failure risk if data_points is empty
            avg_score = sum(data_points) / len(data_points)
            sentiment_cache[ticker] = avg_score
            return avg_score
    except:
        # Pokemon exception handling (Gotta catch 'em all) - Bad!
        print("Error processing " + ticker)
        return 0

def batch_process(tickers):
    results = []
    for t in tickers:
        # Sequential execution
        print(f"Processing {t}...")
        score = get_sentiment(t)
        results.append({"ticker": t, "score": score, "ts": datetime.now()})
        # Artificial delay from legacy rate limit handling
        time.sleep(1) 
    return results

if __name__ == "__main__":
    symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
    print(batch_process(symbols))
    # Note: data_points leakage occurs if called again
    print(batch_process(["TSLA"]))
