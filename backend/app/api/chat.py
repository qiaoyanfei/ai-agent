import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.api.schemas import ChatRequest, ConversationResponse, MessageResponse
from app.db.session import get_session
from app.models import ChatMessage, Collection, Conversation, MessageRole, User
from app.services.rag import (
    build_citations,
    build_context,
    ensure_citation_markers,
    retrieve_chunks,
    source_count,
    stream_answer,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _owned_collection(session: Session, user: User, collection_id: int) -> Collection:
    col = session.get(Collection, collection_id)
    if not col or col.owner_id != user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    return col


@router.post("")
async def chat_stream(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _owned_collection(session, user, body.collection_id)

    if body.conversation_id:
        conv = session.get(Conversation, body.conversation_id)
        if not conv or conv.user_id != user.id or conv.collection_id != body.collection_id:
            raise HTTPException(status_code=404, detail="对话不存在")
    else:
        conv = Conversation(
            collection_id=body.collection_id,
            user_id=user.id,
            title=body.message[:30] or "新对话",
        )
        session.add(conv)
        session.commit()
        session.refresh(conv)

    user_msg = ChatMessage(
        conversation_id=conv.id,
        role=MessageRole.user,
        content=body.message,
    )
    session.add(user_msg)
    session.commit()

    chunks = await retrieve_chunks(session, body.collection_id, body.message)
    context = build_context(chunks)
    citations_json = build_citations(chunks)
    conversation_id = conv.id
    citations_list = json.loads(citations_json) if citations_json else []

    async def event_generator():
        full = []
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation_id, 'citations': citations_list}, ensure_ascii=False)}\n\n"
        try:
            async for payload in stream_answer(body.message, context, source_count(chunks)):
                import json as _json

                delta = _json.loads(payload)
                token = delta.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if token:
                    full.append(token)
                    yield f"data: {json.dumps({'type': 'token', 'content': token}, ensure_ascii=False)}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)}, ensure_ascii=False)}\n\n"
            return

        answer = ensure_citation_markers("".join(full), chunks)
        from app.db.session import engine
        from sqlmodel import Session as DbSession

        with DbSession(engine) as save_session:
            save_session.add(
                ChatMessage(
                    conversation_id=conversation_id,
                    role=MessageRole.assistant,
                    content=answer,
                    citations=citations_json,
                )
            )
            save_session.commit()
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id, 'content': answer}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(
    collection_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _owned_collection(session, user, collection_id)
    rows = session.exec(
        select(Conversation)
        .where(Conversation.collection_id == collection_id)
        .where(Conversation.user_id == user.id)
    ).all()
    return [
        ConversationResponse(
            id=c.id,
            collection_id=c.collection_id,
            title=c.title,
            created_at=c.created_at,
        )
        for c in rows
    ]


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    conv = session.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="对话不存在")
    rows = session.exec(
        select(ChatMessage).where(ChatMessage.conversation_id == conversation_id)
    ).all()
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=m.citations,
            created_at=m.created_at,
        )
        for m in rows
    ]
