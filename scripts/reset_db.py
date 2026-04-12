import urllib.request
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('api/.env')

supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def call_supabase(method, table, params=None, body=None, schema='finance'):
    url = f"{supabase_url}/rest/v1/{table}"
    if params:
        url += f"?{params}"
        
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept-Profile": schema,
        "Content-Profile": schema
    }
    
    data = json.dumps(body).encode("utf-8") if body else None
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req) as response:
            return response.read().decode("utf-8")
    except Exception as e:
        print(f"Error en {method} {table}: {e}")
        if hasattr(e, 'read'):
            print(f"Detalles: {e.read().decode()}")
        return None

def manual_reset():
    if not supabase_url or not service_key:
        print("Error: Credenciales de Supabase no encontradas.")
        return

    print("Iniciando reseteo manual de tablas fiscales...")
    
    # 1. Limpiar documentos de ajuste
    print("Limpiando documentos_ajuste...")
    call_supabase("DELETE", "documentos_ajuste", params="id=not.eq.0")
    
    # 2. Limpiar facturas
    print("Limpiando facturas...")
    call_supabase("DELETE", "facturas", params="id=not.eq.0")
    
    # 3. Limpiar notas de entrega
    print("Limpiando notas_entrega...")
    call_supabase("DELETE", "notas_entrega", params="id=not.eq.0")

    # 4. Limpiar cotizaciones (opcional pero recomendado para el blanco total)
    print("Limpiando cotizaciones...")
    call_supabase("DELETE", "cotizaciones", params="id=not.eq.0")
    
    # 5. Reiniciar secuencias fiscales
    print("Reiniciando secuencias...")
    call_supabase("PATCH", "secuencias_fiscales", params="proximo_numero=not.eq.0", body={"proximo_numero": 1})
    
    print("Reseteo manual completado (Nota: TRUNCATE no es posible via PostgREST, IDs podrían no reiniciar a 1).")

if __name__ == "__main__":
    manual_reset()
