import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

key = os.environ.get('OPENAI_API_KEY')
if key:
    print(f"Key found: {key[:10]}...")
else:
    print("Key NOT found")
