import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('api/.env')
supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

CATEGORIES = [
    "Higiene", "Ergonomía", "Protección", "Formación", "Asesoría", 
    "Consultoría", "Acompañamiento", "Servicios", "Suministro", 
    "Consumibles", "Otros"
]

def init_categories():
    url = f"{supabase_url}/rest/v1/categorias_productos"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
        "Accept-Profile": "finance",
        "Content-Profile": "finance"
    }
    
    data = [{"nombre": c} for c in CATEGORIES]
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req) as response:
            print("Categorías inicializadas.")
    except Exception as e:
        print(f"Error inicializando categorías: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())

if __name__ == "__main__":
    init_categories()
