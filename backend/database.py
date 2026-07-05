from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from config import DB_URL

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    import models  # noqa: F401  (register tables on SQLModel.metadata)

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
