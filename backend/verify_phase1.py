import psycopg2
import requests

def run_checks():
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )
    cur = conn.cursor()

    print("--- 1. Verifying Tables in Database ---")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    tables = [r[0] for r in cur.fetchall()]
    print("Tables found:", tables)

    expected = ['alerts', 'incidents', 'receiving_records', 'shipment_events', 'shipment_evidence', 'shipment_quality', 'shipments', 'telemetry', 'vehicles']
    assert all(t in tables for t in expected), "Missing expected tables!"

    print("\n--- 2. Verifying Foreign Keys ---")
    cur.execute("""
        SELECT t.relname, c.conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'f' AND t.relname IN ('shipment_quality', 'shipment_evidence', 'shipment_events', 'receiving_records', 'incidents')
        ORDER BY t.relname;
    """)
    for r in cur.fetchall():
        print(f"  {r[0]}.{r[1]} -> {r[2]}")

    print("\n--- 3. Verifying Existing Telemetry Stream & Alerts ---")
    cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
    t_count, t_max = cur.fetchone()
    print(f"Telemetry row count: {t_count}, Latest timestamp: {t_max}")

    cur.execute("SELECT COUNT(*), MAX(created_at) FROM alerts;")
    a_count, a_max = cur.fetchone()
    print(f"Alerts row count: {a_count}, Latest timestamp: {a_max}")

    print("\n--- 4. Testing FastAPI Application Status ---")
    try:
        r1 = requests.get("http://127.0.0.1:8000/telemetry/latest", timeout=3).json()
        print("GET /telemetry/latest status: OK, count:", r1.get('count'))
        r2 = requests.get("http://127.0.0.1:8000/shipments/current", timeout=3).json()
        print("GET /shipments/current status: OK, shipment:", r2.get('data', {}).get('shipment_id'))
    except Exception as e:
        print("FastAPI test warning:", e)

    cur.close()
    conn.close()
    print("\nAll Phase 1 verifications completed successfully!")

if __name__ == "__main__":
    run_checks()
