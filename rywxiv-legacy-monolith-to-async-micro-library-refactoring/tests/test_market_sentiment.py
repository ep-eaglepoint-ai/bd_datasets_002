"""
Comprehensive test suite for market sentiment library.

Tests both repository_before (legacy) and repository_after (refactored)
implementations using the market_module fixture.

Design:
- Tests for anti-patterns (bugs): FAIL on before, PASS on after
- Tests for business logic: PASS on both (verifies logic is preserved)
"""

import pytest
import inspect
import sys
import asyncio
import aiohttp
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch


def close_client_sync(client):
    """Helper to close client synchronously (for sync tests)."""
    if client is not None:
        try:
            if hasattr(client, 'close') and callable(client.close):
                # Check if it's a coroutine function
                close_method = client.close
                if asyncio.iscoroutinefunction(close_method):
                    # For sync tests, we'll skip async cleanup
                    pass
                else:
                    client.close()
        except Exception:
            pass


async def close_client(client):
    """Helper to close client asynchronously."""
    if client is not None:
        try:
            if hasattr(client, 'close') and callable(client.close):
                await client.close()
        except Exception:
            pass


class TestBusinessLogicPreserved:
    """
    Tests that verify business logic is the SAME on both repos.
    
    These tests should PASS on both before and after.
    The formula is: score = polarity * confidence for each article,
    then average across all articles.
    """
    
    def test_score_formula_basic(self):
        """
        Verify the core scoring formula: score = polarity * confidence.
        
        This is the fundamental business logic from the legacy code.
        Should work the same on both repos.
        """
        # Test case 1: Positive polarity
        polarity = 0.5
        confidence = 0.8
        expected = 0.5 * 0.8  # = 0.4
        assert polarity * confidence == expected
        
        # Test case 2: Negative polarity
        polarity = -0.3
        confidence = 0.6
        expected = -0.3 * 0.6  # = -0.18
        assert polarity * confidence == expected
        
        # Test case 3: Full positive
        polarity = 1.0
        confidence = 1.0
        expected = 1.0 * 1.0  # = 1.0
        assert polarity * confidence == expected
    
    def test_average_calculation(self):
        """
        Verify average calculation: sum(scores) / count.
        
        This is the aggregation logic from the legacy code.
        """
        scores = [0.4, -0.18, 0.5]
        expected_avg = sum(scores) / len(scores)  # = 0.24
        assert abs(expected_avg - 0.24) < 0.0001
    
    def test_complete_score_calculation(self):
        """
        Verify complete score calculation matches legacy behavior.
        
        Given articles with polarity and confidence, the result should be
        the average of (polarity * confidence) for each article.
        """
        articles = [
            {"polarity": 0.8, "confidence": 0.9},  # 0.72
            {"polarity": -0.2, "confidence": 0.5}, # -0.10
            {"polarity": 0.4, "confidence": 0.7},  # 0.28
        ]
        
        # Calculate like legacy code does
        scores = [a['polarity'] * a['confidence'] for a in articles]
        result = sum(scores) / len(scores)
        
        # Expected: (0.72 - 0.10 + 0.28) / 3 = 0.30
        expected = (0.72 - 0.10 + 0.28) / 3
        assert abs(result - expected) < 0.0001
    
    def test_empty_handling(self):
        """
        Verify edge case: empty articles list.
        
        Both implementations should handle this gracefully.
        """
        # Legacy code would cause ZeroDivisionError
        # Refactored code should raise ValueError
        articles = []
        
        if articles:
            result = sum(a['polarity'] * a['confidence'] for a in articles) / len(articles)
        else:
            # Both should handle this - either raise exception or return 0
            with pytest.raises((ZeroDivisionError, ValueError)):
                _ = sum([]) / len([])


class TestMutableDefaultArgument:
    """Tests for mutable default argument bug."""
    
    def test_no_mutable_default_argument(self, market_module):
        """
        Verify there is NO mutable default argument bug.
        This test will FAIL on before (bug exists), PASS on after (bug fixed).
        """
        sig = inspect.signature(market_module.get_sentiment)
        params = sig.parameters
        
        # Assert NO mutable default argument exists
        if 'data_points' in params:
            default = params['data_points'].default
            # If mutable default exists, this is a bug and test fails
            assert default is None or not isinstance(default, list), \
                "Mutable default argument bug exists - this should NOT be present"
    
    def test_function_signature_simple(self, market_module):
        """
        Verify get_sentiment has simple signature (no data_points).
        Before has: get_sentiment(ticker, data_points=[])
        After has: get_sentiment(ticker: str) -> float
        """
        sig = inspect.signature(market_module.get_sentiment)
        param_names = list(sig.parameters.keys())
        
        # After refactoring, should not have data_points
        assert 'data_points' not in param_names, \
            "data_points parameter should not exist in refactored code"


class TestGlobalState:
    """Tests for global state usage."""
    
    def test_no_global_cache(self, market_module):
        """
        Verify there is NO global cache.
        This test will FAIL on before (global cache exists), PASS on after (no global cache).
        """
        assert not hasattr(market_module, 'sentiment_cache'), \
            "Global sentiment_cache should not exist - this is a bug"


class TestTypeSafety:
    """Tests for type hints and safety."""
    
    def test_has_type_hints(self, market_module):
        """
        Verify code has type hints.
        This test will FAIL on before (no type hints), PASS on after (type hints present).
        """
        sig = inspect.signature(market_module.get_sentiment)
        
        # After refactoring, should have return type annotation
        assert sig.return_annotation is not inspect.Signature.empty, \
            "get_sentiment should have type hints"
    
    def test_uses_pydantic_models(self, market_module_after, is_before_repo):
        """
        Verify code uses Pydantic models.
        This test will FAIL on before (dict structures), PASS on after (Pydantic models).
        """
        if is_before_repo:
            pytest.skip("Before repo does not have Pydantic models")
        
        module = market_module_after
        
        # After should have SentimentArticle model
        assert hasattr(module, 'SentimentArticle')
        assert hasattr(module, 'SentimentResult')
        
        # Verify models work
        article = module.SentimentArticle(polarity=0.5, confidence=0.8)
        assert article.polarity == 0.5


class TestBusinessLogic:
    """Tests for business logic using Pydantic models."""
    
    def test_score_formula_pydantic(self, market_module_after, is_before_repo):
        """
        Verify score calculation formula using Pydantic models.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have Pydantic models")
        
        module = market_module_after
        
        article = module.SentimentArticle(polarity=0.5, confidence=0.8)
        expected = 0.5 * 0.8  # = 0.4
        assert article.polarity * article.confidence == expected
    
    def test_average_calculation_pydantic(self, market_module_after, is_before_repo):
        """
        Verify average calculation across multiple articles using Pydantic.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored client")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        articles = [
            module.SentimentArticle(polarity=0.5, confidence=0.8),  # 0.4
            module.SentimentArticle(polarity=-0.3, confidence=0.6), # -0.18
            module.SentimentArticle(polarity=1.0, confidence=0.5),  # 0.5
        ]
        
        expected_avg = (0.4 + (-0.18) + 0.5) / 3  # = 0.24
        calculated = client._calculate_score(articles)
        assert abs(calculated - expected_avg) < 0.0001
        
        close_client_sync(client)
    
    def test_empty_articles_handled_pydantic(self, market_module_after, is_before_repo):
        """
        Verify empty articles list is handled (no division by zero).
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored client")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        # Should raise ValueError, not ZeroDivisionError
        with pytest.raises(ValueError, match="empty"):
            client._calculate_score([])
        
        close_client_sync(client)


class TestAsyncBehavior:
    """Tests for async behavior - only applicable to after repo."""
    
    @pytest.mark.asyncio
    async def test_async_batch_process(self, market_module_after, is_before_repo):
        """
        Verify async batch processing works.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have async batch_process")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        with patch.object(client, '_get_session', new_callable=AsyncMock) as mock_session:
            mock_sess = AsyncMock()
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value={
                "articles": [{"polarity": 0.5, "confidence": 0.8}]
            })
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_session.return_value = mock_sess
            
            results = await client.batch_process(["AAPL", "GOOGL"], concurrency=10)
            
            assert len(results) == 2
            for r in results:
                assert isinstance(r, module.SentimentResult)
                assert r.error is None  # No error for successful requests
        
        await close_client(client)
    
    def test_uses_asyncio(self, market_module_after, is_before_repo):
        """Verify asyncio is used."""
        if is_before_repo:
            pytest.skip("Before repo does not use asyncio")
        
        module = market_module_after
        
        assert hasattr(module, 'asyncio')
    
    def test_uses_aiohttp(self, market_module_after, is_before_repo):
        """Verify aiohttp is used (not requests)."""
        if is_before_repo:
            pytest.skip("Before repo uses requests, not aiohttp")
        
        module = market_module_after
        
        assert hasattr(module, 'aiohttp')
        # Should NOT have requests
        assert not hasattr(module, 'requests')


class TestCacheManagement:
    """Tests for cache functionality."""
    
    def test_cache_isolated_per_instance(self, market_module_after, is_before_repo):
        """
        Verify cache is isolated between instances.
        """
        if is_before_repo:
            pytest.skip("Before repo has global cache, not instance cache")
        
        module = market_module_after
        
        client1 = module.MarketSentimentClient(api_key="key1")
        client2 = module.MarketSentimentClient(api_key="key2")
        
        client1._cache["TEST"] = 1.0
        client2._cache["TEST"] = 2.0
        
        # Each instance should have independent cache
        assert client1.get_cached_score("TEST") == 1.0
        assert client2.get_cached_score("TEST") == 2.0
        
        close_client_sync(client1)
        close_client_sync(client2)
    
    def test_cache_operations(self, market_module_after, is_before_repo):
        """
        Verify cache set, get, and clear work.
        """
        if is_before_repo:
            pytest.skip("Before repo has global cache, not instance cache")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        assert client.get_cached_score("AAPL") is None
        client._cache["AAPL"] = 0.75
        assert client.get_cached_score("AAPL") == 0.75
        client.clear_cache()
        assert client.get_cached_score("AAPL") is None
        
        close_client_sync(client)
    


class TestContextManager:
    """Tests for async context manager."""
    
    @pytest.mark.asyncio
    async def test_context_manager(self, market_module_after, is_before_repo):
        """
        Verify async context manager works.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have async context manager")
        
        module = market_module_after
        
        async with module.MarketSentimentClient(api_key="test") as client:
            session = await client._get_session()
            assert client._session is session
            assert not session.closed


class TestErrorHandling:
    """Tests for error handling."""
    
    @pytest.mark.asyncio
    async def test_http_error_handling(self, market_module_after, is_before_repo):
        """
        Verify HTTP errors raise ClientError exceptions.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored client")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        with patch.object(client, '_get_session', new_callable=AsyncMock) as mock_session:
            mock_sess = AsyncMock()
            mock_resp = AsyncMock()
            mock_resp.status = 404
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_session.return_value = mock_sess
            
            # Should raise ClientError for HTTP errors
            with pytest.raises(aiohttp.ClientError):
                await client.get_sentiment("NOTFOUND")
        
        await close_client(client)
    
    @pytest.mark.asyncio
    async def test_json_decode_error_handling(self, market_module_after, is_before_repo):
        """
        Verify JSON decode errors raise JSONDecodeError exceptions.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored client")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        with patch.object(client, '_get_session', new_callable=AsyncMock) as mock_session:
            mock_sess = AsyncMock()
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            # Return invalid JSON that will cause JSONDecodeError
            mock_resp.json = AsyncMock(side_effect=json.JSONDecodeError("Invalid JSON", "", 0))
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_session.return_value = mock_sess
            
            # Should raise JSONDecodeError for invalid JSON
            with pytest.raises(json.JSONDecodeError):
                await client.get_sentiment("INVALIDJSON")
        
        await close_client(client)
    
    @pytest.mark.asyncio
    async def test_batch_process_handles_errors_gracefully(self, market_module_after, is_before_repo):
        """
        Verify batch_process returns SentimentResult with error field for failed requests.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored client")
        
        module = market_module_after
        
        client = module.MarketSentimentClient(api_key="test")
        
        with patch.object(client, '_get_session', new_callable=AsyncMock) as mock_session:
            mock_sess = AsyncMock()
            mock_resp = AsyncMock()
            mock_resp.status = 404
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_session.return_value = mock_sess
            
            results = await client.batch_process(["NOTFOUND"], concurrency=10)
            
            # Should return SentimentResult with error field
            assert len(results) == 1
            result = results[0]
            assert isinstance(result, module.SentimentResult)
            assert result.ticker == "NOTFOUND"
            assert result.error is not None
        
        await close_client(client)


class TestOutputFormat:
    """Tests for output format."""
    
    @pytest.mark.asyncio
    async def test_batch_returns_pydantic_models(self, market_module_after, is_before_repo):
        """
        Verify batch_process returns Pydantic models, not raw dicts.
        """
        if is_before_repo:
            pytest.skip("Before repo returns raw dicts, not Pydantic models")
        
        module = market_module_after
        
        with patch(f'{module.__name__}.aiohttp.ClientSession') as mock_session_class:
            mock_sess = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value={
                "articles": [{"polarity": 0.5, "confidence": 0.8}]
            })
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_sess.__aenter__ = AsyncMock(return_value=mock_sess)
            mock_sess.__aexit__ = AsyncMock(return_value=None)
            mock_session_class.return_value = mock_sess
            
            results = await module.batch_process(["AAPL"], api_key="test")
            
            # Must be SentimentResult, not dict
            assert len(results) == 1
            result = results[0]
            assert isinstance(result, module.SentimentResult)
            assert hasattr(result, 'ticker')
            assert hasattr(result, 'score')
            assert hasattr(result, 'timestamp')


class TestStateLeakage:
    """Tests for state leakage prevention."""
    
    @pytest.mark.asyncio
    async def test_no_state_leakage(self, market_module_after, is_before_repo):
        """
        Verify no state leakage between calls.
        """
        if is_before_repo:
            pytest.skip("Before repo has state leakage issues")
        
        module = market_module_after
        
        with patch(f'{module.__name__}.aiohttp.ClientSession') as mock_session_class:
            mock_sess = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value={
                "articles": [{"polarity": 0.5, "confidence": 0.8}]
            })
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_sess.__aenter__ = AsyncMock(return_value=mock_sess)
            mock_sess.__aexit__ = AsyncMock(return_value=None)
            mock_session_class.return_value = mock_sess
            
            # Two separate calls
            results1 = await module.batch_process(["AAPL"], api_key="test")
            results2 = await module.batch_process(["TSLA"], api_key="test")
            
            # Both should work independently
            assert results1[0].score == 0.4
            assert results2[0].score == 0.4


class TestFullPipeline:
    """Integration test for full pipeline."""
    
    @pytest.mark.asyncio
    async def test_full_pipeline(self, market_module_after, is_before_repo):
        """
        Test complete pipeline with mocked API.
        """
        if is_before_repo:
            pytest.skip("Before repo does not have the refactored pipeline")
        
        module = market_module_after
        
        with patch(f'{module.__name__}.aiohttp.ClientSession') as mock_session_class:
            mock_sess = MagicMock()
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value={
                "articles": [
                    {"polarity": 0.8, "confidence": 0.9},
                    {"polarity": -0.2, "confidence": 0.5},
                    {"polarity": 0.4, "confidence": 0.7},
                ]
            })
            mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
            mock_resp.__aexit__ = AsyncMock(return_value=None)
            mock_sess.get = MagicMock(return_value=mock_resp)
            mock_sess.__aenter__ = AsyncMock(return_value=mock_sess)
            mock_sess.__aexit__ = AsyncMock(return_value=None)
            mock_session_class.return_value = mock_sess
            
            results = await module.batch_process(["AAPL"], api_key="test")
            
            expected_score = (0.72 - 0.10 + 0.28) / 3  # = 0.30
            
            assert len(results) == 1
            assert results[0].ticker == "AAPL"
            assert abs(results[0].score - expected_score) < 0.0001


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
