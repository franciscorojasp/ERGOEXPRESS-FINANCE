import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('api/.env')

url = f"{os.getenv('SUPABASE_URL')}/rest/v1/usuarios?super_admin=eq.true&select=id"
headers = {
    "apikey": os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
    "Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}",
    "Accept-Profile": "finance"
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(json.dumps(data))
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
