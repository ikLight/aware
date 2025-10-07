from .base import BaseDB


async def ensure_indexes(mongo_url: str | None = None, db_name: str | None = None):
    db = BaseDB(mongo_url=mongo_url, db_name=db_name).db
    # unique username
    await db.users.create_index("username", unique=True)
    # ensure tokens.jti is indexed for fast lookup and deletion
    await db.tokens.create_index("jti", unique=True)
