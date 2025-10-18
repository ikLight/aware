import os
from pymongo import MongoClient

##------------------- Start OF BaseDB -------------------##

class BaseDB:

    def __init__(self, mongo_url: str | None = None, db_name: str | None = None):
        mongo_url = mongo_url or os.getenv("MONGO_URL", "mongodb://localhost:27017")
        db_name = db_name or os.getenv("MONGO_DB", "aware")
        self._client = MongoClient(mongo_url)
        self._db = self._client[db_name]
    
    ##------------------------------------------------##

    @property
    def db(self):
        return self._db
    
##------------------- END OF BaseDB -------------------##

