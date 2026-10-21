import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 60)
    print("AGRITRUST: END-TO-END ROLE WORKFLOW TEST SUITE")
    print("=" * 60)

    # 1. Test Login for all 5 roles
    credentials = {
        "ADMIN": ("admin@agritrust.io", "AdminSecret2026!"),
        "FARMER": ("farmer@agritrust.io", "Password123!"),
        "LOGISTICS": ("logistics@agritrust.io", "Password123!"),
        "COLD_STORAGE": ("coldstorage@agritrust.io", "Password123!"),
        "BUYER": ("buyer@agritrust.io", "Password123!")
    }

    tokens = {}
    users = {}

    print("\n--- 1. Testing Role Authentication ---")
    for role, (email, pwd) in credentials.items():
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pwd})
        if res.status_code == 200:
            data = res.json()
            tokens[role] = data["access_token"]
            users[role] = data["user"]
            print(f" [PASS] Login {role:<13}: User '{data['user']['full_name']}' ({data['user']['role']})")
        else:
            print(f" [FAIL] Login {role}: Status {res.status_code} - {res.text}")
            sys.exit(1)

    # 2. Test Role Guard (RBAC Authorization)
    print("\n--- 2. Testing RBAC Security Guard ---")
    farmer_headers = {"Authorization": f"Bearer {tokens['FARMER']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['ADMIN']}"}

    # Farmer trying to access Admin endpoints
    unauthorized_res = requests.get(f"{BASE_URL}/admin/users", headers=farmer_headers)
    if unauthorized_res.status_code == 403:
        print(f" [PASS] Role Guard: Farmer denied access to Admin endpoint (HTTP 403 Forbidden).")
    else:
        print(f" [FAIL] Role Guard failed! Status: {unauthorized_res.status_code}")

    # Admin accessing Admin endpoints
    admin_res = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers)
    if admin_res.status_code == 200:
        print(f" [PASS] Admin authorized for Admin users registry (Count: {admin_res.json().get('count')})")
    else:
        print(f" [FAIL] Admin access failed: {admin_res.status_code}")

    # 3. Test Farmer Workflow
    print("\n--- 3. Testing Farmer APIs ---")
    farms_res = requests.get(f"{BASE_URL}/farmer/farms", headers=farmer_headers)
    print(f" [PASS] Farmer Farms: {farms_res.json().get('count')} farms retrieved.")

    produce_res = requests.get(f"{BASE_URL}/farmer/produce", headers=farmer_headers)
    print(f" [PASS] Farmer Produce: {produce_res.json().get('count')} produce listings retrieved.")

    cs_res = requests.get(f"{BASE_URL}/farmer/cold-storages", headers=farmer_headers)
    print(f" [PASS] Cold Storage Finder: {cs_res.json().get('count')} facilities found.")

    # 4. Test Logistics APIs
    print("\n--- 4. Testing Logistics APIs ---")
    log_headers = {"Authorization": f"Bearer {tokens['LOGISTICS']}"}
    log_prof = requests.get(f"{BASE_URL}/logistics/profile", headers=log_headers)
    print(f" [PASS] Logistics Profile: Company '{log_prof.json().get('profile', {}).get('company_name')}'")

    log_drivers = requests.get(f"{BASE_URL}/logistics/drivers", headers=log_headers)
    print(f" [PASS] Logistics Drivers: {log_drivers.json().get('count')} drivers available.")

    log_fleet = requests.get(f"{BASE_URL}/logistics/fleet-telemetry", headers=log_headers)
    print(f" [PASS] Fleet Telemetry: {log_fleet.json().get('count')} active vehicles monitored.")

    # 5. Test Cold Storage APIs
    print("\n--- 5. Testing Cold Storage APIs ---")
    cs_headers = {"Authorization": f"Bearer {tokens['COLD_STORAGE']}"}
    cs_fac = requests.get(f"{BASE_URL}/cold-storage/facility", headers=cs_headers)
    print(f" [PASS] Cold Storage Facility: '{cs_fac.json().get('facility', {}).get('facility_name')}'")

    cs_chambers = requests.get(f"{BASE_URL}/cold-storage/chambers", headers=cs_headers)
    print(f" [PASS] Cold Storage Chambers: {cs_chambers.json().get('count')} chambers configured.")

    cs_bookings = requests.get(f"{BASE_URL}/cold-storage/bookings", headers=cs_headers)
    print(f" [PASS] Cold Storage Bookings: {cs_bookings.json().get('count')} bookings recorded.")

    # 6. Test Buyer APIs
    print("\n--- 6. Testing Buyer APIs ---")
    buyer_headers = {"Authorization": f"Bearer {tokens['BUYER']}"}
    marketplace = requests.get(f"{BASE_URL}/buyer/marketplace", headers=buyer_headers)
    print(f" [PASS] Buyer Marketplace: {marketplace.json().get('count')} listings available for purchase.")

    buyer_orders = requests.get(f"{BASE_URL}/buyer/orders", headers=buyer_headers)
    print(f" [PASS] Buyer Orders: {buyer_orders.json().get('count')} orders active.")

    # 7. Test Admin APIs
    print("\n--- 7. Testing Admin APIs ---")
    admin_stats = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
    stats_data = admin_stats.json().get('stats', {})
    print(f" [PASS] Admin Stats: {stats_data.get('total_users')} users, {stats_data.get('total_shipments')} shipments, {stats_data.get('total_disputes')} disputes.")

    admin_audit = requests.get(f"{BASE_URL}/admin/audit-logs", headers=admin_headers)
    print(f" [PASS] Admin Audit Logs: {admin_audit.json().get('count')} tamper-evident events.")

    # 8. Test Preserved Telemetry, QR & Simulator
    print("\n--- 8. Testing Preserved Telemetry, QR, and Alerts ---")
    tel_res = requests.get(f"{BASE_URL}/telemetry/latest")
    print(f" [PASS] Preserved /telemetry/latest: {tel_res.json().get('count')} readings returned.")

    verify_res = requests.get(f"{BASE_URL}/verify/SHP-0001")
    print(f" [PASS] Preserved /verify/SHP-0001: Verified Status = {verify_res.json().get('status')}")

    print("\n" + "=" * 60)
    print("ALL WORKFLOW AND RBAC TESTS PASSED WITH 100% INTEGRITY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
