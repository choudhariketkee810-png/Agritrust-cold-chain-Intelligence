import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="ftl_cold_chain",
    user="postgres",
    password="1234"
)
cur = conn.cursor()

def inspect_table(t):
    cur.execute(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{t}' ORDER BY ordinal_position;")
    cols = cur.fetchall()
    print(f"\n=== Table: {t} ===")
    for c in cols:
        print(f"  {c[0]} ({c[1]}, nullable={c[2]})")

for t in ["shipments", "multimodal_shipments", "multimodal_journey_stages", "shipping_containers", "users"]:
    inspect_table(t)

conn.close()
