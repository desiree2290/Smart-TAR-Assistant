from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .api.requests import router as requests_router

def create_app() -> FastAPI:
    app = FastAPI(title="Smart TAR Review Assistant API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Base.metadata.create_all(bind=engine)

    app.include_router(requests_router)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

app = create_app()
