import urllib.request
import json
import os
from dotenv import load_dotenv

def run_migration():
    # Cargar variables de entorno
    env_path = 'api/.env'
    if not os.path.exists(env_path):
        print(f"ERROR: No se encontró el archivo {env_path}")
        return

    load_dotenv(env_path)
    
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.")
        return

    # SQL para agregar las columnas faltantes
    migration_sql = """
    ALTER TABLE finance.entidades ADD COLUMN IF NOT EXISTS etapa_pipeline VARCHAR(50);
    ALTER TABLE finance.entidades ADD COLUMN IF NOT EXISTS vendedor_email VARCHAR(255);
    
    COMMENT ON COLUMN finance.entidades.etapa_pipeline IS 'Etapa del embudo de ventas (Nuevo, Ganado, etc)';
    COMMENT ON COLUMN finance.entidades.vendedor_email IS 'Email del vendedor asignado para filtrado de seguridad';
    """

    url = f"{supabase_url}/rest/v1/rpc/execute_sql"
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    payload = {'query': migration_sql}
    data = json.dumps(payload).encode('utf-8')
    
    print(f"Ejecutando migración en {supabase_url}...")
    
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req) as res:
            response_data = res.read().decode('utf-8')
            print("RESPUESTA EXITOSA:", response_data)
            return True
    except Exception as e:
        print("ERROR DURANTE LA MIGRACIÓN:")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        else:
            print(str(e))
        return False

if __name__ == "__main__":
    run_migration()
