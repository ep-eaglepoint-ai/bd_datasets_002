import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Depends, status, Form
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from src.database import get_db, init_db
from src.models import URLItem, URLResponse
from src.crud import create_short_url, get_url_by_short_code
from src.config import settings
from src.validation import is_url_reachable
import uvicorn

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
HTML_TEMPLATE = (_TEMPLATES_DIR / "base.html").read_text(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize database on startup.
    This ensures that the SQLite schema is ready before the first request arrives.
    """
    logger.info("Initializing database...")
    init_db()
    yield
    logger.info("Shutting down...")

app = FastAPI(title="Elegant URL Shortener", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 400 Bad Request for invalid request body (e.g. invalid URL)."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Invalid URL"},
    )


@app.get("/", response_class=HTMLResponse)
def index_page():
    content = """
        <h1>Shorty</h1>
        <p>Convert long links into powerful short URLs effortlessly.</p>
        <form action="/shorten-ui" method="post" class="input-group">
            <input type="url" name="target_url" placeholder="https://your-long-link.com" required>
            <button type="submit">Shorten URL</button>
        </form>
    """
    return HTML_TEMPLATE.format(content=content)

@app.post("/shorten-ui", response_class=HTMLResponse)
async def shorten_url_ui(target_url: str = Form(...), db: Session = Depends(get_db)):
    try:
        item = URLItem(target_url=target_url)
        url_str = str(item.target_url)
        if settings.VALIDATE_URL_REACHABILITY and not await is_url_reachable(url_str):
            content = """
            <h1 style="color: #ef4444;">Oops!</h1>
            <p>That URL is not reachable. Please check the link and try again.</p>
            <a href="/" class="back-link">← Try again</a>
            """
            return HTML_TEMPLATE.format(content=content)
        db_url = create_short_url(db, url_str)
        short_url = f"{settings.BASE_URL}/{db_url.short_code}"
        
        content = f"""
            <h1>Success!</h1>
            <p>Your premium short link is ready.</p>
            <div class="result">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem;">Short Link</div>
                <a href="{short_url}" target="_blank">{short_url}</a>
                <div style="margin-top: 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem;">Original Destination</div>
                <div style="font-size: 0.875rem; color: #334155;">{db_url.target_url}</div>
            </div>
            <a href="/" class="back-link">← Create another one</a>
        """
        return HTML_TEMPLATE.format(content=content)
    except Exception as e:
        logger.error(f"UI error: {e}")
        content = f"""
            <h1 style="color: #ef4444;">Oops!</h1>
            <p>We couldn't shorten that link. Please ensure it's a valid URL.</p>
            <a href="/" class="back-link">← Try again</a>
        """
        return HTML_TEMPLATE.format(content=content)

@app.post("/api/shorten", response_model=URLResponse)
async def shorten_url(item: URLItem, db: Session = Depends(get_db)):
    """
    REQ-01: Accept a long URL and generate a unique short code.
    REQ-04: URL validation is handled by Pydantic model; optional reachability check.
    REQ-05: Idempotency is handled in create_short_url.
    """
    if settings.VALIDATE_URL_REACHABILITY:
        url_str = str(item.target_url)
        if not await is_url_reachable(url_str):
            raise HTTPException(status_code=400, detail="URL is not reachable")
    logger.info(f"Shortening API request for: {item.target_url}")
    db_url = create_short_url(db, str(item.target_url))
    
    return URLResponse(
        target_url=db_url.target_url,
        short_code=db_url.short_code,
        short_url=f"{settings.BASE_URL}/{db_url.short_code}"
    )

@app.get("/api/url/{short_code}", response_model=URLResponse)
def get_url_info(short_code: str, db: Session = Depends(get_db)):
    """
    REQ-Retrieve: Retrieve the original URL given a short code.
    """
    db_url = get_url_by_short_code(db, short_code)
    if db_url is None:
        raise HTTPException(status_code=404, detail="Short URL not found")
    
    return URLResponse(
        target_url=db_url.target_url,
        short_code=db_url.short_code,
        short_url=f"{settings.BASE_URL}/{db_url.short_code}"
    )

@app.get("/{short_code}")
def redirect_to_url(short_code: str, db: Session = Depends(get_db)):
    """
    REQ-02: Redirect users from short URLs to their original destinations.
    REQ-Critical: Return 404 for non-existent code.
    """
    db_url = get_url_by_short_code(db, short_code)
    if db_url is None:
        logger.warning(f"Failed redirect: code {short_code} not found")
        raise HTTPException(status_code=404, detail="Short URL not found")
    
    logger.info(f"Redirecting {short_code} -> {db_url.target_url}")
    return RedirectResponse(url=db_url.target_url, status_code=307)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
