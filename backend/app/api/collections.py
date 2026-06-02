from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.api.schemas import CollectionCreate, CollectionResponse
from app.db.session import get_session
from app.models import Collection, User

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
def list_collections(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rows = session.exec(select(Collection).where(Collection.owner_id == user.id)).all()
    return [
        CollectionResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("", response_model=CollectionResponse)
def create_collection(
    body: CollectionCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    col = Collection(name=body.name, description=body.description, owner_id=user.id)
    session.add(col)
    session.commit()
    session.refresh(col)
    return CollectionResponse(
        id=col.id,
        name=col.name,
        description=col.description,
        created_at=col.created_at,
    )


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    col = session.get(Collection, collection_id)
    if not col or col.owner_id != user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    return CollectionResponse(
        id=col.id,
        name=col.name,
        description=col.description,
        created_at=col.created_at,
    )
