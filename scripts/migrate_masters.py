import csv
import urllib.request
import json
import os
import re
from uuid import uuid4
from datetime import datetime
from dotenv import load_dotenv

# Configuración
load_dotenv('api/.env')
supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def call_supabase(method, table, params=None, body=None, schema='finance', upsert=False):
    url = f"{supabase_url}/rest/v1/{table}"
    if params: url += f"?{params}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept-Profile": schema,
        "Content-Profile": schema,
        "Prefer": "return=minimal"
    }
    if upsert:
        headers["Prefer"] = "return=minimal,resolution=merge-duplicates"
        
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"Error HTTP {e.code}: {err_body}")
        raise Exception(f"PostgREST Error: {err_body}")

def normalize_rif(rif):
    if not rif or str(rif).lower() == 'nan': return None
    clean = re.sub(r'[^VJEG0-9]', '', str(rif).upper())
    if not clean: return None
    match = re.match(r'([VJEG])?(\d+)', clean)
    if not match: return None
    letra = match.group(1) or 'V'
    numeros = match.group(2)
    if len(numeros) < 9: numeros = numeros.zfill(9)
    if len(numeros) > 9: numeros = numeros[:9]
    return f"{letra}-{numeros[:-1]}-{numeros[-1]}"

def migrate_contacts():
    print("Migrando Contactos (con Upsert)...")
    try:
        with open('contacts_import.csv', mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            records = []
            seen_rifs = set()
            for row in reader:
                rif = normalize_rif(row.get('RIF', ''))
                # Evitar duplicados en el mismo lote
                if rif and rif in seen_rifs: continue
                if rif: seen_rifs.add(rif)
                
                records.append({
                    "tipo": "cliente",
                    "razon_social": row.get('Razón Social', row.get('Nombre', '')).strip()[:255],
                    "rif": rif,
                    "persona_contacto": row.get('Persona Contacto', '')[:255],
                    "email": row.get('Email', '')[:255],
                    "telefonos": [row.get('Teléfonos', '')] if row.get('Teléfonos') else [],
                    "direccion": {"detalles": row.get('Dirección', '')},
                    "estado": row.get('Estado', '')[:50],
                    "activo": True
                })
                if len(records) >= 50:
                    call_supabase("POST", "entidades", params="on_conflict=rif", body=records, upsert=True)
                    records = []
                    seen_rifs = set()
            if records:
                call_supabase("POST", "entidades", params="on_conflict=rif", body=records, upsert=True)
        print("Done: Contactos migrados.")
    except Exception as e:
        print(f"Error migrando contactos: {e}")

def migrate_products():
    print("Migrando Productos (con Truncado)...")
    try:
        cats = call_supabase("GET", "categorias_productos", params="select=id,nombre")
        cat_map = {c['nombre']: c['id'] for c in cats}
        
        with open('products_import.csv', mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            records = []
            for row in reader:
                cat_name = row.get('Categoría', 'Otros')
                cat_id = cat_map.get(cat_name, cat_map.get('Otros'))
                price_str = re.sub(r'[^\d.]', '', row.get('Precio USD', '0').replace(',', '.'))
                price = float(price_str) if price_str else 0.0
                
                records.append({
                    "nombre": (row.get('Nombre', row.get('TRABAJO / ESTUDIO', '')) or "").strip()[:255],
                    "descripcion": row.get('Descripción', row.get('DESCRIPCIÓN', '')),
                    "categoria_id": cat_id,
                    "precio_usd": price,
                    "impuesto_pct": 16.00,
                    "activo": True
                })
                if len(records) >= 50:
                    call_supabase("POST", "productos", body=records, upsert=True)
                    records = []
            if records:
                call_supabase("POST", "productos", body=records, upsert=True)
        print("Done: Productos migrados.")
    except Exception as e:
        print(f"Error migrando productos: {e}")

if __name__ == "__main__":
    migrate_contacts()
    migrate_products()
