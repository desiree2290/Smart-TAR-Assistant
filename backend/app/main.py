from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.demo_cases import get_demo_case
from app.review import run_review

from .db import Base, engine
from .api.requests import router as requests_router
from .api.upload import router as upload_router

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
    app.include_router(upload_router)

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.post("/api/demo/{scenario}")
    def run_demo_scenario(scenario: str):
        try:
            request_payload, doc_text = get_demo_case(scenario)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # 1. Create request in DB
        # Replace this part with your actual create/save logic
        req = create_request_in_db(request_payload)

        # 2. Run review
        review = run_review(request_payload, doc_text)

        # 3. Save review in DB
        save_review_in_db(req["id"], review)

        # 4. Return request id so frontend can navigate to /requests/:id
        return {"id": req["id"]}

    return app


app = create_app()
