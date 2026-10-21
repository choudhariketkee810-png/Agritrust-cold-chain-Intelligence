"""
AGRITrust — Marine Route & Shipping Container Telematics Simulator
Continuously simulates real-time container movements, AIS transmissions,
and smart reefer telemetry across Indian Ocean, Arabian Sea, Red Sea,
Mediterranean, and North Sea nautical corridors.
"""

import sys
import os
import time
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        database=os.environ.get("DB_NAME", "ftl_cold_chain"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "1234")
    )

print("=" * 75)
print(" AGRITRUST — MULTIMODAL MARINE & REEFER CONTAINER SIMULATOR")
print("=" * 75)
print("Data Source Notice: DEMO / SIMULATED DATA")
print("AIS / Carrier API Architecture: Active & Abstraction-Ready")
print("-" * 75)

def run_simulation_cycle(interval_sec: float = 3.0, max_cycles: int = 20):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT container_id, current_vessel_name, current_temperature, set_temperature, target_temp_min, target_temp_max, current_latitude, current_longitude, speed_knots, heading_degrees, total_distance_nmi, distance_travelled_nmi, distance_remaining_nmi, route_progress_pct FROM shipping_containers ORDER BY container_id ASC;")
    containers = cur.fetchall()

    print(f"Loaded {len(containers)} monitored containers from PostgreSQL.")
    cycle = 0

    try:
        while cycle < max_cycles:
            cycle += 1
            now = datetime.now()
            print(f"\n[CYCLE {cycle:02d} - {now.strftime('%H:%M:%S')}] Advancing Maritime Vessel Telemetry...")

            for c in containers:
                cid = c["container_id"]
                vessel = c["current_vessel_name"]
                
                # Small incremental progression (e.g. 5-15 nmi per cycle)
                advance_nmi = random.uniform(8.0, 15.0)
                tot_dist = float(c["total_distance_nmi"])
                cur_trav = float(c["distance_travelled_nmi"])
                new_trav = min(tot_dist, cur_trav + advance_nmi)
                new_rem = max(0.0, tot_dist - new_trav)
                new_pct = round((new_trav / max(1.0, tot_dist)) * 100.0, 1)

                # Small coordinate drift along heading
                lat = float(c["current_latitude"]) + random.uniform(0.01, 0.04)
                lon = float(c["current_longitude"]) + random.uniform(0.02, 0.06)

                # Reefer temperature simulation with occasional excursion for demo
                set_t = float(c["set_temperature"])
                cur_t = float(c["current_temperature"])
                
                # Specific container behaviors
                if cid == "CMAU8492019":
                    # Known excursion scenario
                    cur_t = max(7.5, min(9.2, cur_t + random.uniform(-0.1, 0.2)))
                elif cid == "MSKU1234567":
                    # Optimal normal scenario
                    cur_t = max(3.8, min(4.5, set_t + random.uniform(-0.2, 0.3)))
                else:
                    cur_t = set_t + random.uniform(-0.3, 0.4)

                cur_t = round(cur_t, 2)
                hum = round(max(65.0, min(88.0, 75.0 + random.uniform(-3.0, 3.0))), 1)

                # Update container
                cur.execute("""
                    UPDATE shipping_containers SET
                        current_latitude = %s,
                        current_longitude = %s,
                        current_temperature = %s,
                        current_humidity = %s,
                        distance_travelled_nmi = %s,
                        distance_remaining_nmi = %s,
                        route_progress_pct = %s,
                        last_telemetry_at = %s
                    WHERE container_id = %s;
                """, (lat, lon, cur_t, hum, new_trav, new_rem, new_pct, now, cid))

                # Insert location history
                hist_id = f"CLH-{cid}-{int(now.timestamp())}"
                cur.execute("""
                    INSERT INTO container_location_history (
                        history_id, container_id, latitude, longitude, speed_knots,
                        heading_degrees, sea_region, temperature, humidity,
                        distance_remaining_nmi, route_progress_pct, recorded_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    hist_id, cid, lat, lon, float(c["speed_knots"]),
                    float(c["heading_degrees"]), "Maritime Corridor",
                    cur_t, hum, new_rem, new_pct, now
                ))

                print(f"  Container {cid} ({vessel}): {lat:.3f}N, {lon:.3f}E | Temp: {cur_t}°C | Progress: {new_pct}% ({new_rem:.0f} nmi left)")

            conn.commit()
            time.sleep(interval_sec)

    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
    finally:
        cur.close()
        conn.close()
        print("\nSimulator cycle complete.")

if __name__ == "__main__":
    run_simulation_cycle(interval_sec=2.0, max_cycles=3)
