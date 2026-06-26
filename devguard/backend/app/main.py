from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import create_tables
from app.modules.auth.routes import router as auth_router
from app.modules.chat.routes import router as chat_router
from app.modules.voice.routes import router as voice_router
from app.modules.face.routes import router as face_router
from app.modules.hr.routes import router as hr_router

app = FastAPI(
    title="DevGuard API",
    description="AI Workplace Wellness Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()


app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(face_router)
app.include_router(hr_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "DevGuard API"}