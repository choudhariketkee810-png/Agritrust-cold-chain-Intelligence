from fastapi import FastAPI
import psycopg2

app = FastAPI(
    title="FTL Cold Chain Intelligence API",
    description="Real-time cold-chain monitoring backend",
    version="1.0.0"
)


def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="ftl_cold_chain",
        user="postgres",
        password="1234"
    )


@app.get("/")
def home():
    return {
        "message": "FTL Cold Chain Intelligence API is running"
    }


@app.get("/telemetry/latest")
def get_latest_telemetry():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            telemetry_id,
            shipment_id,
            temperature,
            humidity,
            latitude,
            longitude,
            door_status,
            refrigeration_status,
            recorded_at
        FROM telemetry
        ORDER BY recorded_at DESC
        LIMIT 20;
    """)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    telemetry = []

    for row in rows:
        telemetry.append({
            "telemetry_id": row[0],
            "shipment_id": row[1],
            "temperature": float(row[2]) if row[2] is not None else None,
            "humidity": float(row[3]) if row[3] is not None else None,
            "latitude": float(row[4]) if row[4] is not None else None,
            "longitude": float(row[5]) if row[5] is not None else None,
            "door_status": row[6],
            "refrigeration_status": row[7],
            "recorded_at": row[8].isoformat() if row[8] else None
        })

    return {
        "count": len(telemetry),
        "data": telemetry
    }