
import logging
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from src.database import get_db, init_db
from src.models import URLItem, URLResponse
from src.crud import create_short_url, get_url_by_short_code
from src.config import settings
from src.validation import is_url_reachable
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    yield
    logger.info("Shutting down...")


app = FastAPI(title="URL Shortener API", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Invalid URL"},
    )


@app.post("/api/shorten", response_model=URLResponse)
async def shorten_url(item: URLItem, db: Session = Depends(get_db)):
    if settings.VALIDATE_URL_REACHABILITY:
        url_str = str(item.target_url)
        if not await is_url_reachable(url_str):
            raise HTTPException(status_code=400, detail="URL is not reachable")
    logger.info(f"Shortening API request for: {item.target_url}")
    db_url = create_short_url(db, str(item.target_url))
    return URLResponse(
        target_url=db_url.target_url,
        short_code=db_url.short_code,
        short_url=f"{settings.BASE_URL}/{db_url.short_code}",
    )


@app.get("/api/url/{short_code}", response_model=URLResponse)
def get_url_info(short_code: str, db: Session = Depends(get_db)):
    db_url = get_url_by_short_code(db, short_code)
    if db_url is None:
        raise HTTPException(status_code=404, detail="Short URL not found")
    return URLResponse(
        target_url=db_url.target_url,
        short_code=db_url.short_code,
        short_url=f"{settings.BASE_URL}/{db_url.short_code}",
    )


@app.get("/{short_code}")
def redirect_to_url(short_code: str, db: Session = Depends(get_db)):
    db_url = get_url_by_short_code(db, short_code)
    if db_url is None:
        logger.warning(f"Failed redirect: code {short_code} not found")
        raise HTTPException(status_code=404, detail="Short URL not found")
    logger.info(f"Redirecting {short_code} -> {db_url.target_url}")
    return RedirectResponse(url=db_url.target_url, status_code=307)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
