import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv('api/.env')
supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def test_insert():
    url = f"{supabase_url}/rest/v1/entidades"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept-Profile": "finance",
        "Content-Profile": "finance"
    }
    
    # Test record (dummy)
    data = json.dumps({
        "razon_social": "TEST MIGRATION",
        "tipo_entidad": "cliente",
        "rif": "J-00000000-0"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as response:
            print("Inserción de prueba exitosa.")
            print(response.read().decode())
    except Exception as e:
        print(f"Error en inserción: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())

if __name__ == "__main__":
    test_insert()
