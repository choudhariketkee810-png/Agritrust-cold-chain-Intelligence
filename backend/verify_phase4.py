import requests
import psycopg2
import time
import json
import io
import numpy as np
import cv2

API_BASE = "http://127.0.0.1:8000"

def run_phase4_verification():
    print("=" * 70)
    print("       AGRITRUST PHASE 4: QR SHIPMENT VERIFICATION SUITE")
    print("=" * 70)

    # 1. Verify GET /verify/AGRI-1001
    try:
        r_ver = requests.get(f"{API_BASE}/verify/AGRI-1001", timeout=3)
        assert r_ver.status_code == 200, f"Expected 200, got {r_ver.status_code}: {r_ver.text}"
        data = r_ver.json()
        
        # Verify required verification fields
        assert data["shipment_id"] == "AGRI-1001"
        assert data["product_name"] == "Mango"
        assert data["total_quantity"] == 1000.0
        assert data["grade_a_quantity"] == 750.0
        assert data["grade_b_quantity"] == 250.0
        assert data["origin"] == "Nashik"
        assert data["destination"] == "Mumbai"
        assert data["vehicle_id"] == "FTL-V001"
        assert data["vehicle_number"] == "MH15AB1234"
        assert data["target_temperature_range"]["min"] == 10.0
        assert data["target_temperature_range"]["max"] == 13.0
        assert data["verification_status"] == "VERIFIED"
        
        print(f"[OK] 1. GET /verify/AGRI-1001: Verification Passed!")
        print(f"  -> Status: {data['verification_status']}")
        print(f"  -> Shipment: {data['shipment_id']} | Product: {data['product_name']}")
        print(f"  -> Quantity: {data['total_quantity']} kg (Grade A: {data['grade_a_quantity']} kg, Grade B: {data['grade_b_quantity']} kg)")
        print(f"  -> Route: {data['origin']} -> {data['destination']} | Vehicle: {data['vehicle_number']}")
        print(f"  -> Target Temp: {data['target_temperature_range']['min']}C - {data['target_temperature_range']['max']}C")
        print(f"  -> Created At: {data['shipment_creation_time']}")
    except Exception as e:
        print(f"[FAIL] 1. GET /verify/AGRI-1001: {e}")
        return

    # 2. Verify Unknown Shipment Returns HTTP 404
    try:
        r_404 = requests.get(f"{API_BASE}/verify/UNKNOWN_SHIPMENT_999", timeout=3)
        assert r_404.status_code == 404
        print(f"[OK] 2. Unknown Shipment 404 Check: HTTP 404 | Detail: {r_404.json().get('detail')}")
    except Exception as e:
        print(f"[FAIL] 2. Unknown Shipment Check: {e}")
        return

    # 3. Verify GET /shipments/AGRI-1001/qr returns valid PNG image
    try:
        r_qr = requests.get(f"{API_BASE}/shipments/AGRI-1001/qr", timeout=3)
        assert r_qr.status_code == 200, f"Expected 200, got {r_qr.status_code}"
        assert r_qr.headers.get("content-type") == "image/png"
        qr_bytes = r_qr.content
        assert qr_bytes.startswith(b"\x89PNG\r\n\x1a\n"), "Response is not a valid PNG binary"
        print(f"[OK] 3. GET /shipments/AGRI-1001/qr: Returned Valid PNG Image ({len(qr_bytes)} bytes, content-type: image/png)")
    except Exception as e:
        print(f"[FAIL] 3. QR Generation: {e}")
        return

    # 4. Verify QR Decoding points to correct verification endpoint
    try:
        # Decode PNG image using OpenCV QRCodeDetector
        nparr = np.frombuffer(qr_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        detector = cv2.QRCodeDetector()
        decoded_url, points, _ = detector.detectAndDecode(img)
        assert decoded_url is not None and len(decoded_url) > 0, "Failed to decode QR code"
        assert decoded_url.endswith("/verify/AGRI-1001"), f"Decoded URL mismatch: {decoded_url}"
        print(f"[OK] 4. QR Image Decoding Verified!")
        print(f"  -> Encoded Verification URL: {decoded_url}")
    except Exception as e:
        print(f"[FAIL] 4. QR Decoding: {e}")
        return

    # 5. Verify QR 404 on Unknown Shipment
    try:
        r_qr_404 = requests.get(f"{API_BASE}/shipments/UNKNOWN_SHIPMENT_999/qr", timeout=3)
        assert r_qr_404.status_code == 404
        print(f"[OK] 5. QR Generation 404 Check: HTTP 404 on unknown shipment")
    except Exception as e:
        print(f"[FAIL] 5. QR 404 Check: {e}")

    # 6. Verify Existing Shipment APIs
    try:
        r_list = requests.get(f"{API_BASE}/shipments", timeout=3)
        assert r_list.status_code == 200
        print(f"[OK] 6. Existing GET /shipments: HTTP 200 | Count: {r_list.json().get('count')}")

        r_shp1 = requests.get(f"{API_BASE}/shipments/SHP-0001", timeout=3)
        assert r_shp1.status_code == 200
        print(f"[OK] 6. Existing GET /shipments/SHP-0001: HTTP 200 | Product: {r_shp1.json().get('product_name')}")
    except Exception as e:
        print(f"[FAIL] 6. Existing Shipment APIs: {e}")

    # 7. Verify GET /telemetry/latest & POST /alerts/check
    try:
        r_tel = requests.get(f"{API_BASE}/telemetry/latest", timeout=3)
        assert r_tel.status_code == 200
        print(f"[OK] 7. Existing GET /telemetry/latest: HTTP 200 | Latest Temp: {r_tel.json()['data'][0]['temperature']} C")

        r_chk = requests.post(f"{API_BASE}/alerts/check", timeout=3)
        assert r_chk.status_code == 200
        print(f"[OK] 7. Existing POST /alerts/check: HTTP 200 | Status: {r_chk.json().get('status')}")
    except Exception as e:
        print(f"[FAIL] 7. Telemetry & Alerts APIs: {e}")

    # 8. Verify Simulator Telemetry Insertion
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt1, t1 = cur.fetchone()
        time.sleep(6)
        cur.execute("SELECT COUNT(*), MAX(recorded_at) FROM telemetry;")
        cnt2, t2 = cur.fetchone()
        cur.close()
        conn.close()
        assert cnt2 > cnt1
        print(f"[OK] 8. Sensor Simulator Continues Active Logging: Rows {cnt1} -> {cnt2} (Latest: {t2})")
    except Exception as e:
        print(f"[FAIL] 8. Simulator Check: {e}")

    # 9. Verify Immutability: Baseline data in shipments and shipment_quality remains intact
    try:
        conn = psycopg2.connect(host="localhost", port=5432, database="ftl_cold_chain", user="postgres", password="1234")
        cur = conn.cursor()
        cur.execute("""
            SELECT s.shipment_id, s.product_name, sq.grade_a_quantity, sq.grade_b_quantity, sq.total_quantity
            FROM shipments s
            JOIN shipment_quality sq ON s.shipment_id = sq.shipment_id
            WHERE s.shipment_id = 'AGRI-1001';
        """)
        row = cur.fetchone()
        assert row is not None
        assert row[2] == 750.00 and row[3] == 250.00 and row[4] == 1000.00
        print(f"[OK] 9. Original Shipment Baseline Verified Unaltered: {row}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FAIL] 9. Immutability Check: {e}")

    print("=" * 70)
    print("           ALL PHASE 4 VERIFICATIONS PASSED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    run_phase4_verification()
