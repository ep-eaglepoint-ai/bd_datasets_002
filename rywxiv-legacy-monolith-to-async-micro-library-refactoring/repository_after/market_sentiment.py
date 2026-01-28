"""
Async Market Sentiment Library

A modern, high-concurrency library for fetching and calculating
sentiment scores from news APIs.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

import aiohttp
from pydantic import BaseModel, Field


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SentimentArticle(BaseModel):
    """Pydantic model for article data."""
    polarity: float = Field(..., description="Sentiment polarity score (-1.0 to 1.0)")
    confidence: float = Field(..., description="Confidence level (0.0 to 1.0)")


class SentimentResponse(BaseModel):
    """Pydantic model for API response."""
    articles: list[SentimentArticle] = Field(default_factory=list, description="List of articles")


class SentimentResult(BaseModel):
    """Result model for sentiment calculation."""
    ticker: str = Field(..., description="Stock ticker symbol")
    score: float = Field(..., description="Calculated sentiment score")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of calculation")


class SentimentError(BaseModel):
    """Error model for failed sentiment requests."""
    ticker: str
    error_type: str
    error_message: str
    timestamp: datetime = Field(default_factory=datetime.now)


class MarketSentimentClient:
    """
    Async client for fetching market sentiment data.
    
    Encapsulates all state within the class instance, eliminating
    global state issues from the legacy implementation.
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.legacy-news-provider.com/v1"):
        """
        Initialize the sentiment client.
        
        Args:
            api_key: API key for authentication
            base_url: Base URL for the sentiment API
        """
        self.api_key = api_key
        self.base_url = base_url
        self._cache: dict[str, float] = {}
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self) -> None:
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    async def __aenter__(self) -> "MarketSentimentClient":
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    def _calculate_score(self, articles: list[SentimentArticle]) -> float:
        """
        Calculate the average sentiment score from articles.
        
        Preserves the business logic: score = polarity * confidence for each article,
        then average across all articles.
        
        Args:
            articles: List of article data
            
        Returns:
            Average sentiment score
            
        Raises:
            ValueError: If articles list is empty
        """
        if not articles:
            raise ValueError("Cannot calculate score from empty articles list")
        
        scores = [article.polarity * article.confidence for article in articles]
        return sum(scores) / len(scores)
    
    async def get_sentiment(self, ticker: str) -> float:
        """
        Fetch and calculate sentiment score for a single ticker.
        
        Uses aiohttp for non-blocking HTTP requests.
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Sentiment score, or 0.0 if request fails
            
        Raises:
            aiohttp.ClientError: For network-related errors
            ValueError: If response data is invalid
        """
        url = f"{self.base_url}/{ticker}"
        params = {"key": self.api_key}
        
        session = await self._get_session()
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    sentiment_response = SentimentResponse(**data)
                    score = self._calculate_score(sentiment_response.articles)
                    self._cache[ticker] = score
                    logger.info(f"Successfully processed {ticker}: score={score:.4f}")
                    return score
                else:
                    logger.warning(f"API returned status {response.status} for {ticker}")
                    return 0.0
                    
        except aiohttp.ClientError as e:
            logger.error(f"Network error for {ticker}: {e}")
            raise
        except ValueError as e:
            logger.error(f"Invalid data format for {ticker}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing {ticker}: {e}")
            raise
    
    async def batch_process(
        self, 
        tickers: list[str], 
        concurrency: int = 10
    ) -> list[SentimentResult]:
        """
        Process multiple tickers concurrently.
        
        Uses asyncio.gather for parallel execution, dramatically reducing
        processing time compared to sequential requests.
        
        Args:
            tickers: List of stock ticker symbols
            concurrency: Maximum number of concurrent requests
            
        Returns:
            List of SentimentResult objects with ticker, score, and timestamp
        """
        semaphore = asyncio.Semaphore(concurrency)
        
        async def fetch_with_limit(ticker: str) -> SentimentResult:
            async with semaphore:
                score = await self.get_sentiment(ticker)
                return SentimentResult(ticker=ticker, score=score)
        
        results = await asyncio.gather(
            *(fetch_with_limit(t) for t in tickers),
            return_exceptions=True
        )
        
        # Handle exceptions by creating error results
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error processing {tickers[i]}: {result}")
                final_results.append(SentimentResult(
                    ticker=tickers[i],
                    score=0.0,
                    timestamp=datetime.now()
                ))
            else:
                final_results.append(result)
        
        return final_results
    
    def get_cached_score(self, ticker: str) -> Optional[float]:
        """Get cached score for a ticker."""
        return self._cache.get(ticker)
    
    def clear_cache(self) -> None:
        """Clear the cache."""
        self._cache.clear()


# Module-level functions for API compatibility with legacy code

async def get_sentiment(ticker: str, api_key: str = "legacy_key_123") -> float:
    """
    Fetch and calculate sentiment score for a single ticker.
    
    This is a module-level async function for API compatibility.
    
    Args:
        ticker: Stock ticker symbol
        api_key: API key for authentication
        
    Returns:
        Sentiment score, or 0.0 if request fails
    """
    client = MarketSentimentClient(api_key=api_key)
    try:
        return await client.get_sentiment(ticker)
    finally:
        await client.close()


async def batch_process(
    tickers: list[str], 
    api_key: str = "legacy_key_123",
    concurrency: int = 10
) -> list[SentimentResult]:
    """
    Process multiple tickers concurrently.
    
    Args:
        tickers: List of stock ticker symbols
        api_key: API key for authentication
        concurrency: Maximum number of concurrent requests
        
    Returns:
        List of SentimentResult objects
    """
    client = MarketSentimentClient(api_key=api_key)
    try:
        return await client.batch_process(tickers, concurrency=concurrency)
    finally:
        await client.close()
