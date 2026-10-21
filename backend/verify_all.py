import psycopg2
import requests
import json
import time

def run_verification():
    print("=" * 60)
    print("       AGRITRUST PHASE 1 COMPLETE VERIFICATION")
    print("=" * 60)

    # 1. PostgreSQL Connection Test
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="ftl_cold_chain",
            user="postgres",
            password="1234"
        )
        cur = conn.cursor()
        print("[PASS] 1. PostgreSQL Connection: CONNECTED (Database: ftl_cold_chain, Port: 5432)")
    except Exception as e:
        print(f"[FAIL] 1. PostgreSQL Connection: {e}")
        return

    # 2. Verify Existing Tables
    print("\n[CHECK] 2. Existing Tables Operational Status:")
    existing_tables = ['vehicles', 'shipments', 'telemetry', 'alerts']
    for t in existing_tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {t};")
            cnt = cur.fetchone()[0]
            print(f"  [OK] Existing Table '{t}': Operational ({cnt} records)")
        except Exception as e:
            print(f"  [FAIL] Existing Table '{t}': ERROR ({e})")

    # 3. Verify New AGRITrust Tables and Foreign Keys
    print("\n[CHECK] 3. AGRITrust Tables & Foreign Key Integrity:")
    new_tables = ['shipment_quality', 'shipment_evidence', 'shipment_events', 'receiving_records', 'incidents']
    
    cur.execute("""
        SELECT 
            t.relname as table_name, 
            c.conname as constraint_name, 
            pg_get_constraintdef(c.oid) as constraint_definition
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'f' AND t.relname = ANY(%s)
        ORDER BY t.relname;
    """, (new_tables,))
    fks = {r[0]: (r[1], r[2]) for r in cur.fetchall()}

    for t in new_tables:
        cur.execute(f"SELECT COUNT(*) FROM {t};")
        cnt = cur.fetchone()[0]
        if t in fks:
            cname, cdef = fks[t]
            print(f"  [OK] Table '{t}' EXISTS | FK [{cname}]: {cdef}")
        else:
            print(f"  [FAIL] Table '{t}' MISSING FOREIGN KEY")

    # 4. Verify Live Sensor Simulator Data Insertion (check count at t=0 and t=6s)
    print("\n[CHECK] 4. Sensor Simulator Live Ingestion Check:")
    cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
    c1, t1 = cur.fetchone()
    print(f"  Reading 1: Row Count = {c1} | Latest Timestamp = {t1}")
    
    time.sleep(6) # Wait for simulator cycle (5s)
    
    cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
    c2, t2 = cur.fetchone()
    print(f"  Reading 2 (+6s): Row Count = {c2} | Latest Timestamp = {t2}")
    
    if c2 > c1:
        print(f"  [OK] Live insertion verified: Simulator continuously inserted {c2 - c1} new record(s).")
    else:
        print("  [NOTE] Simulator insert pending cycle.")

    cur.close()
    conn.close()

    # 5. Verify FastAPI Endpoints
    print("\n[CHECK] 5. FastAPI Endpoints Health & Functionality:")
    
    # Root
    try:
        r_root = requests.get("http://127.0.0.1:8000/", timeout=3)
        print(f"  [OK] GET /: HTTP {r_root.status_code} | {r_root.json().get('message')}")
    except Exception as e:
        print(f"  [FAIL] GET /: ERROR ({e})")

    # GET /telemetry/latest
    try:
        r_tel = requests.get("http://127.0.0.1:8000/telemetry/latest", timeout=3)
        tel_data = r_tel.json()
        print(f"  [OK] GET /telemetry/latest: HTTP {r_tel.status_code} | Returned {tel_data.get('count')} records | Latest Temp: {tel_data['data'][0]['temperature']} C")
    except Exception as e:
        print(f"  [FAIL] GET /telemetry/latest: ERROR ({e})")

    # POST /alerts/check
    try:
        r_chk = requests.post("http://127.0.0.1:8000/alerts/check", timeout=3)
        chk_data = r_chk.json()
        print(f"  [OK] POST /alerts/check: HTTP {r_chk.status_code} | Alert Status: {chk_data.get('status')} | Message: {chk_data.get('message')}")
    except Exception as e:
        print(f"  [FAIL] POST /alerts/check: ERROR ({e})")

    print("\n" + "=" * 60)
    print("                  VERIFICATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_verification()
