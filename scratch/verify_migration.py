import urllib.request
import os
from dotenv import load_dotenv

load_dotenv('api/.env')
headers = {
    'apikey': os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}',
    'Accept-Profile': 'finance',
    'Prefer': 'count=exact'
}

def count(table):
    url = f'{os.getenv("SUPABASE_URL")}/rest/v1/{table}?select=id&limit=1'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as res:
            cr = res.getheader("Content-Range")
            print(f'{table}: {cr}')
    except Exception as e:
        print(f"Error contando {table}: {e}")
        if hasattr(e, 'read'): print(e.read().decode())

if __name__ == "__main__":
    count('entidades')
    count('productos')
