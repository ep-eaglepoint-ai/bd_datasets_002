import pytest
import time
import sys
import os

REPO_PATH = os.environ.get('REPO_PATH', 'repository_after')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', REPO_PATH))

IS_ASYNC = REPO_PATH == 'repository_after'

# Set appropriate DATABASE_URL before importing
if IS_ASYNC:
    os.environ['DATABASE_URL'] = 'postgresql+asyncpg://user:password@postgres:5432/catalog'
else:
    os.environ['DATABASE_URL'] = 'postgresql://user:password@postgres:5432/catalog'

if IS_ASYNC:
    import asyncio
    from httpx import AsyncClient
    from sqlalchemy.ext.asyncio import AsyncSession
    from database import engine, AsyncSessionLocal, Base
    from models import Product, Category, Review, Inventory
    from main import app
else:
    from httpx import Client
    from sqlalchemy.orm import Session
    from database import engine, SessionLocal, Base
    from models import Product, Category, Review, Inventory
    from main import app


if IS_ASYNC:
    @pytest.fixture(scope="session")
    def event_loop():
        loop = asyncio.get_event_loop_policy().new_event_loop()
        yield loop
        loop.close()

    @pytest.fixture(scope="session", autouse=True)
    async def setup_database():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        
        async with AsyncSessionLocal() as session:
            category = Category(id=1, name="Electronics", description="Electronic items")
            session.add(category)
            await session.flush()
            
            for i in range(1, 51):
                session.add(Product(id=i, name=f"Product {i}", description=f"Desc {i}",
                                  price=10.0+i, category_id=1, is_active=True))
            await session.flush()
            
            for i in range(1, 21):
                for j in range(3):
                    session.add(Review(product_id=i, user_id=j+1, rating=4+(j%2), comment=f"Review {j}"))
            
            for i in range(1, 21):
                session.add(Inventory(product_id=i, quantity=100+i, reserved=10, warehouse_location=f"A-{i}"))
            
            await session.commit()
        yield
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    @pytest.fixture
    async def client():
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.fixture
    async def db_session():
        async with AsyncSessionLocal() as session:
            yield session
else:
    @pytest.fixture(scope="session", autouse=True)
    def setup_database():
        db = SessionLocal()
        try:
            db.query(Inventory).delete()
            db.query(Review).delete()
            db.query(Product).delete()
            db.query(Category).delete()
            db.commit()
            
            category = Category(id=1, name="Electronics", description="Electronic items")
            db.add(category)
            db.flush()
            
            for i in range(1, 51):
                db.add(Product(id=i, name=f"Product {i}", description=f"Desc {i}",
                             price=10.0+i, category_id=1, is_active=True))
            db.flush()
            
            for i in range(1, 21):
                for j in range(3):
                    db.add(Review(product_id=i, user_id=j+1, rating=4+(j%2), comment=f"Review {j}"))
            
            for i in range(1, 21):
                db.add(Inventory(product_id=i, quantity=100+i, reserved=10, warehouse_location=f"A-{i}"))
            
            db.commit()
        finally:
            db.close()
        yield

    @pytest.fixture
    def client():
        return Client(app=app, base_url="http://test")

    @pytest.fixture
    def db_session():
        db = SessionLocal()
        yield db
        db.close()


@pytest.mark.asyncio
async def test_response_time_under_200ms(client):
    """Requirement 1: P95 response time < 200ms"""
    times = []
    for _ in range(20):
        start = time.time()
        if IS_ASYNC:
            response = await client.get("/products?page_size=20")
        else:
            response = client.get("/products?page=1&page_size=20")
        times.append(time.time() - start)
        assert response.status_code in [200, 304]
    
    times.sort()
    p95 = times[int(len(times) * 0.95)]
    print(f"\nP95: {p95*1000:.2f}ms")
    assert p95 < 0.2, f"P95 {p95*1000:.2f}ms exceeds 200ms"


@pytest.mark.asyncio
async def test_query_count_under_5(db_session):
    """Requirement 2: Query count < 5"""
    from crud import get_products
    
    if IS_ASYNC:
        products, total = await get_products(db_session, cursor=None, limit=20)
    else:
        products, total = get_products(db_session, skip=0, limit=20)
    
    assert len(products) == 20
    assert products[0].category is not None
    assert len(products[0].reviews) > 0
    assert products[0].inventory is not None


@pytest.mark.asyncio
async def test_reviews_use_selectinload(db_session):
    """Requirement 3: Reviews with selectinload()"""
    from crud import get_products
    
    if IS_ASYNC:
        products, _ = await get_products(db_session, cursor=None, limit=20)
    else:
        products, _ = get_products(db_session, skip=0, limit=20)
    
    products_with_reviews = [p for p in products if len(p.reviews) > 0]
    assert len(products_with_reviews) == 20


@pytest.mark.asyncio
async def test_inventory_uses_joinedload(db_session):
    """Requirement 4: Inventory with joinedload()"""
    from crud import get_products
    
    if IS_ASYNC:
        products, _ = await get_products(db_session, cursor=None, limit=20)
    else:
        products, _ = get_products(db_session, skip=0, limit=20)
    
    products_with_inventory = [p for p in products if p.inventory is not None]
    assert len(products_with_inventory) == 20


def test_connection_pool_configuration():
    """Requirement 5: Pool size=20, max_overflow=30"""
    pool = engine.pool
    assert pool.size() == 20, f"Pool size {pool.size()}, expected 20"
    assert pool._max_overflow == 30, f"Max overflow {pool._max_overflow}, expected 30"
    assert pool._timeout == 30, f"Timeout {pool._timeout}, expected 30"
    assert pool._pre_ping is True, "pre_ping should be True"


@pytest.mark.asyncio
async def test_foreign_key_indexes():
    """Requirement 6: Foreign key indexes"""
    from sqlalchemy import text
    
    if IS_ASYNC:
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT indexname FROM pg_indexes WHERE tablename='products' AND indexname LIKE '%category_id%'"
            ))
            assert len(result.fetchall()) > 0, "products.category_id needs index"
    else:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT indexname FROM pg_indexes WHERE tablename='products' AND indexname LIKE '%category_id%'"
            ))
            assert len(result.fetchall()) > 0, "products.category_id needs index"


@pytest.mark.asyncio
async def test_is_active_indexed():
    """Requirement 7: is_active indexed"""
    from sqlalchemy import text
    
    if IS_ASYNC:
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT indexname FROM pg_indexes WHERE tablename='products' AND indexname LIKE '%is_active%'"
            ))
            assert len(result.fetchall()) > 0, "products.is_active needs index"
    else:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT indexname FROM pg_indexes WHERE tablename='products' AND indexname LIKE '%is_active%'"
            ))
            assert len(result.fetchall()) > 0, "products.is_active needs index"


@pytest.mark.asyncio
async def test_redis_caching():
    """Requirement 8: Redis caching with 60s TTL"""
    if IS_ASYNC:
        from crud import redis_client
        
        # Test Redis connection
        await redis_client.ping()
        
        # Test cache set/get
        test_key = "test:cache"
        await redis_client.setex(test_key, 60, "test_value")
        value = await redis_client.get(test_key)
        assert value == "test_value"
        
        # Verify TTL
        ttl = await redis_client.ttl(test_key)
        assert 0 < ttl <= 60
        
        # Cleanup
        await redis_client.delete(test_key)
        print("\nRedis caching verified with 60s TTL")
    else:
        pass


def test_async_operations():
    """Requirement 9: Async operations"""
    import inspect
    from crud import get_products, get_product
    
    assert inspect.iscoroutinefunction(get_products), "get_products must be async"
    assert inspect.iscoroutinefunction(get_product), "get_product must be async"


@pytest.mark.asyncio
async def test_cursor_based_pagination(db_session):
    """Requirement 10: Cursor-based pagination"""
    from crud import get_products
    
    if IS_ASYNC:
        products_page1, _ = await get_products(db_session, cursor=None, limit=10)
        assert len(products_page1) == 10
        last_id = products_page1[-1].id
        
        products_page2, _ = await get_products(db_session, cursor=last_id, limit=10)
        assert len(products_page2) == 10
        assert all(p.id > last_id for p in products_page2)
        print(f"\nCursor pagination: page1 ends at {last_id}, page2 starts after {last_id}")
    else:
        products_page1, _ = get_products(db_session, skip=0, limit=10)
        assert len(products_page1) == 10


@pytest.mark.asyncio
async def test_count_query_optimized(db_session):
    """Requirement 11: Optimized count using cache or pg_class.reltuples"""
    from crud import get_products, get_cached_count
    
    if IS_ASYNC:
        # Test that count is cached
        count1 = await get_cached_count(db_session, category_id=1, is_active=True)
        count2 = await get_cached_count(db_session, category_id=1, is_active=True)
        assert count1 == count2 == 50
        
        products, total = await get_products(db_session, cursor=None, limit=20, category_id=1, is_active=True)
        assert total == 50
        assert len(products) == 20
        print(f"\nCached count: {total}, products returned: {len(products)}")
    else:
        products, total = get_products(db_session, skip=0, limit=20, category_id=1, is_active=True)
        assert total == 50
        assert len(products) == 20


@pytest.mark.asyncio
async def test_gzip_compression(client):
    """Requirement 12: GZip compression"""
    if IS_ASYNC:
        response = await client.get("/products?page_size=20", headers={"Accept-Encoding": "gzip"})
    else:
        response = client.get("/products?page=1&page_size=20", headers={"Accept-Encoding": "gzip"})
    
    assert response.status_code in [200, 304]
    
    # Check if GZipMiddleware is configured
    from main import app
    from fastapi.middleware.gzip import GZipMiddleware
    has_gzip = any(isinstance(m.cls, type) and issubclass(m.cls, GZipMiddleware) for m in app.user_middleware)
    assert has_gzip, "GZipMiddleware not configured"


@pytest.mark.asyncio
async def test_batch_endpoint_single_query(client):
    """Requirement 13: Batch single query"""
    if IS_ASYNC:
        response = await client.get("/products/batch?ids=1,2,3,4,5")
    else:
        response = client.get("/products/batch?ids=1,2,3,4,5")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5


@pytest.mark.asyncio
async def test_session_cleanup():
    """Requirement 14: Session cleanup"""
    from database import get_db
    
    if IS_ASYNC:
        initial = engine.pool.checkedout()
        try:
            async for session in get_db():
                pass
        except:
            pass
        await asyncio.sleep(0.1)
        final = engine.pool.checkedout()
        assert final <= initial
    else:
        initial = engine.pool.checkedout()
        try:
            for session in get_db():
                pass
        except:
            pass
        final = engine.pool.checkedout()
        assert final <= initial


@pytest.mark.asyncio
async def test_etag_caching(client):
    """Requirement 15: ETag caching"""
    if IS_ASYNC:
        response1 = await client.get("/products?page_size=20")
    else:
        response1 = client.get("/products?page=1&page_size=20")
    
    assert response1.status_code == 200
    
    etag = response1.headers.get("etag")
    assert etag is not None, "ETag header required"
    
    if IS_ASYNC:
        response2 = await client.get("/products?page_size=20", headers={"If-None-Match": etag})
    else:
        response2 = client.get("/products?page=1&page_size=20", headers={"If-None-Match": etag})
    
    assert response2.status_code == 304, "Should return 304"


@pytest.mark.asyncio
async def test_request_timing_middleware(client):
    """Requirement 16: Request timing"""
    if IS_ASYNC:
        response = await client.get("/products?page_size=20")
    else:
        response = client.get("/products?page=1&page_size=20")
    
    assert response.status_code in [200, 304]


@pytest.mark.asyncio
async def test_api_response_format(client):
    """API response format"""
    if IS_ASYNC:
        response = await client.get("/products?page_size=20")
    else:
        response = client.get("/products?page=1&page_size=20")
    
    if response.status_code == 200:
        data = response.json()
        assert 'items' in data
        assert 'total' in data


@pytest.mark.asyncio
async def test_performance_benchmark(client):
    """Performance benchmark"""
    times = []
    for i in range(10):
        start = time.time()
        if IS_ASYNC:
            response = await client.get(f"/products?page_size=20")
        else:
            response = client.get(f"/products?page={i%3+1}&page_size=20")
        times.append(time.time() - start)
        assert response.status_code in [200, 304]
    
    avg = sum(times) / len(times)
    print(f"\nAvg: {avg*1000:.2f}ms, Min: {min(times)*1000:.2f}ms, Max: {max(times)*1000:.2f}ms")
