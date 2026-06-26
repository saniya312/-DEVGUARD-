"""
RAG Context Provider — Future Integration

This module defines the interface that chat/services.py will call
when RAG is enabled. Currently returns empty context so it is
a no-op that doesn't break any existing code.

To activate RAG in the future:
1. Install: chromadb, sentence-transformers
2. Implement `build_index()` to ingest company documents
3. Implement `retrieve_context()` to return relevant chunks
4. Inject context into CHAT_SYSTEM_PROMPT in chat/services.py
"""

from typing import Optional


async def retrieve_context(query: str, top_k: int = 3) -> Optional[str]:
    """
    Retrieve relevant document chunks for a user query.
    Returns None when RAG is not yet configured — chat continues normally.
    """
    return None


async def build_index(documents_path: str) -> None:
    """
    Ingest documents from a directory into the vector store.
    Call this once when new HR documents are uploaded.
    """
    pass


def is_rag_enabled() -> bool:
    """Returns True when a vector store is configured and ready."""
    return False