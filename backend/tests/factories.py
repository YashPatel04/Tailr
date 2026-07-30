import uuid
from datetime import UTC, datetime

import bcrypt


def utcnow():
    return datetime.now(UTC)


async def create_user(db, email="test@example.com", password="testpassword12", verified=True):
    from app.models.models import User

    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
        is_verified=verified,
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
