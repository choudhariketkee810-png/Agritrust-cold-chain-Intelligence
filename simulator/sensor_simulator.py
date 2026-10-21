import psycopg2
import random
import time
import requests
from datetime import datetime

# ==========================================
# DATABASE CONNECTION
# ==========================================

connection = psycopg2.connect(
    host="localhost",
    port=5432,
    database="ftl_cold_chain",
    user="postgres",
    password="1234"
)

cursor = connection.cursor()

print("========================================")
print("   FTL COLD-CHAIN SENSOR SIMULATOR")
print("========================================")
print("Connected to PostgreSQL successfully!")
print("Starting real-time monitoring...")
print("----------------------------------------")

# ==========================================
# INITIAL SENSOR VALUES
# ==========================================

temperature = 11.2
humidity = 68.0

latitude = 20.0059
longitude = 73.8244

cycle = 0

# ==========================================
# CONTINUOUS SENSOR SIMULATION
# ==========================================

while True:

    cycle += 1

    phase = cycle % 40

    # ======================================
    # NORMAL CONDITION
    # ======================================

    if phase <= 10:

        temperature += random.uniform(-0.2, 0.2)

        temperature = max(10.2, min(12.8, temperature))

        scenario = "NORMAL"

    # ======================================
    # WARNING CONDITION
    # ======================================

    elif phase <= 20:

        temperature += random.uniform(0.1, 0.4)

        temperature = min(16.0, temperature)

        scenario = "WARNING"

    # ======================================
    # CRITICAL CONDITION
    # ======================================

    elif phase <= 30:

        temperature += random.uniform(0.3, 0.8)

        temperature = min(22.0, temperature)

        scenario = "CRITICAL"

    # ======================================
    # RECOVERY CONDITION
    # ======================================

    else:

        temperature -= random.uniform(0.5, 1.0)

        temperature = max(11.2, temperature)

        scenario = "RECOVERY"

    # ======================================
    # HUMIDITY
    # ======================================

    humidity += random.uniform(-1, 1)

    humidity = max(60, min(75, humidity))

    # ======================================
    # GPS MOVEMENT
    # ======================================

    latitude += random.uniform(0.0001, 0.0005)
    longitude += random.uniform(0.0001, 0.0005)

    # ======================================
    # OTHER SENSOR DATA
    # ======================================

    door_status = "CLOSED"
    refrigeration_status = "ON"

    current_time = datetime.now()

    # ======================================
    # SAVE TELEMETRY TO POSTGRESQL
    # ======================================

    cursor.execute(
        """
        INSERT INTO telemetry (
            shipment_id,
            temperature,
            humidity,
            latitude,
            longitude,
            door_status,
            refrigeration_status,
            recorded_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            "SHP-0001",
            round(temperature, 2),
            round(humidity, 2),
            round(latitude, 7),
            round(longitude, 7),
            door_status,
            refrigeration_status,
            current_time
        )
    )

    connection.commit()

    # ======================================
    # AUTOMATIC ALERT CHECK
    # ======================================

    try:

        response = requests.post(
            "http://127.0.0.1:8000/alerts/check",
            timeout=3
        )

        if response.status_code == 200:

            result = response.json()

            status = result.get("status")

            if status == "NEW_ALERT":

                print(
                    f"🚨 ALERT CREATED | "
                    f"Severity: {result.get('severity')} | "
                    f"Temperature: {result.get('temperature')}°C"
                )

            elif status == "ALERT_RESOLVED":

                print(
                    f"🟢 ALERT RESOLVED | "
                    f"Temperature: {result.get('temperature')}°C"
                )

    except requests.exceptions.RequestException:

        print("⚠️ Alert API unavailable")

    # ======================================
    # DISPLAY SENSOR READING
    # ======================================

    print(
        f"{current_time.strftime('%H:%M:%S')} | "
        f"Scenario: {scenario:<8} | "
        f"Temperature: {temperature:5.2f}°C | "
        f"Humidity: {humidity:5.2f}% | "
        f"GPS: {latitude:.5f}, {longitude:.5f}"
    )

    # ======================================
    # WAIT 5 SECONDS
    # ======================================

    time.sleep(5)