import uuid

from app.models.models import User


async def create_user(db, email="test@example.com", oauth_provider="github", oauth_id=None):
    user = User(
        id=uuid.uuid4(),
        email=email,
        oauth_provider=oauth_provider,
        oauth_id=oauth_id or f"github_{uuid.uuid4().hex[:8]}",
    )
    db.add(user)
    await db.flush()
    return user


async def create_session(db, user, company_name="TestCorp", role_title="Engineer"):
    from app.models.models import Session

    session = Session(
        id=uuid.uuid4(),
        user_id=user.id,
        company_name=company_name,
        role_title=role_title,
        tailoring_mode="polish",
    )
    db.add(session)
    await db.flush()
    return session


async def create_document(db, session, doc_type="resume", version=0):
    from app.models.models import SessionDocument

    doc = SessionDocument(
        id=uuid.uuid4(),
        session_id=session.id,
        doc_type=doc_type,
        version=version,
        content_json={"basics": {"name": "Test"}, "sections": [], "metadata": {}},
    )
    db.add(doc)
    await db.flush()
    return doc
