import os
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "aware")

def test_db_connection():
    print(f"Connecting to MongoDB at {MONGO_URL}, DB: {DB_NAME}")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    try:
        # List collections
        collections = db.list_collection_names()
        print(f"Collections in DB: {collections}")
        # Try reading one user document
        if "users" in collections:
            user = db["users"].find_one()
            print(f"Sample user document: {user}")
        else:
            print("No 'users' collection found.")
        print("MongoDB connection test succeeded.")
    except Exception as e:
        print(f"MongoDB connection test failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    test_db_connection()
