"""
Async Market Sentiment Library

A modern, high-concurrency library for fetching and calculating
sentiment scores from news APIs.
"""

from repository_after.market_sentiment import (
    SentimentArticle,
    SentimentResponse,
    SentimentResult,
    SentimentError,
    MarketSentimentClient,
    batch_process,
)

__all__ = [
    "SentimentArticle",
    "SentimentResponse",
    "SentimentResult",
    "SentimentError",
    "MarketSentimentClient",
    "batch_process",
]

__version__ = "1.0.0"
