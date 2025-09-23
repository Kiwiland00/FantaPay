#!/usr/bin/env python3
"""
FantaPay Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BASE_URL = "https://fantasy-wallet-app.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FantaPayTester:
    def __init__(self):
        self.session_token = None
        self.user_data = None
        self.competition_id = None
        self.invite_code = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/health")
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Response: {response.json() if success else response.text}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_session_mock(self):
        """Test authentication with mock session (since we can't use real Google OAuth)"""
        try:
            # Create a mock session ID for testing
            mock_session_id = str(uuid.uuid4())
            
            # This will fail as expected since we don't have real Emergent Auth
            response = requests.post(
                f"{BASE_URL}/auth/session",
                headers={"X-Session-ID": mock_session_id}
            )
            
            # Expected to fail with 400 due to invalid session ID
            success = response.status_code == 400
            details = f"Status: {response.status_code} (Expected 400 for mock session)"
            self.log_test("Auth Session (Mock)", success, details)
            return success
        except Exception as e:
            self.log_test("Auth Session (Mock)", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_endpoints_without_session(self):
        """Test auth endpoints without valid session (should return 401)"""
        endpoints = [
            ("/auth/me", "GET"),
            ("/auth/logout", "POST"),
            ("/auth/language", "PATCH"),
            ("/auth/biometric", "PATCH")
        ]
        
        all_success = True
        for endpoint, method in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    response = requests.post(f"{BASE_URL}{endpoint}")
                elif method == "PATCH":
                    response = requests.patch(f"{BASE_URL}{endpoint}", json={"test": "data"})
                
                success = response.status_code == 401
                details = f"Status: {response.status_code} (Expected 401 for unauthorized)"
                self.log_test(f"Auth {endpoint} (Unauthorized)", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Auth {endpoint} (Unauthorized)", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_competition_endpoints_without_auth(self):
        """Test competition endpoints without authentication"""
        endpoints = [
            ("/competitions", "POST", {"name": "Test Competition", "rules": {"type": "daily"}}),
            ("/competitions/join", "POST", {"invite_code": "TEST123"}),
            ("/competitions/my", "GET", None),
            ("/competitions/test123", "GET", None),
            ("/competitions/test123/standings", "PATCH", {"standings": {}})
        ]
        
        all_success = True
        for endpoint, method, data in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    response = requests.post(f"{BASE_URL}{endpoint}", json=data, headers=HEADERS)
                elif method == "PATCH":
                    response = requests.patch(f"{BASE_URL}{endpoint}", json=data, headers=HEADERS)
                
                success = response.status_code == 401
                details = f"Status: {response.status_code} (Expected 401 for unauthorized)"
                self.log_test(f"Competition {endpoint} (Unauthorized)", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Competition {endpoint} (Unauthorized)", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_wallet_endpoints_without_auth(self):
        """Test wallet endpoints without authentication"""
        endpoints = [
            ("/wallet/balance", "GET", None),
            ("/wallet/topup", "POST", {"amount": 100}),
            ("/wallet/withdraw", "POST", {"amount": 50}),
            ("/competitions/test123/pay", "POST", {"amount": 25}),
            ("/transactions", "GET", None),
            ("/competitions/test123/transactions", "GET", None)
        ]
        
        all_success = True
        for endpoint, method, data in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    response = requests.post(f"{BASE_URL}{endpoint}", json=data, headers=HEADERS)
                
                success = response.status_code == 401
                details = f"Status: {response.status_code} (Expected 401 for unauthorized)"
                self.log_test(f"Wallet {endpoint} (Unauthorized)", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Wallet {endpoint} (Unauthorized)", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_invalid_endpoints(self):
        """Test invalid endpoints return 404"""
        invalid_endpoints = [
            "/invalid/endpoint",
            "/auth/invalid",
            "/competitions/invalid/action",
            "/wallet/invalid"
        ]
        
        all_success = True
        for endpoint in invalid_endpoints:
            try:
                response = requests.get(f"{BASE_URL}{endpoint}")
                success = response.status_code == 404
                details = f"Status: {response.status_code} (Expected 404 for invalid endpoint)"
                self.log_test(f"Invalid endpoint {endpoint}", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Invalid endpoint {endpoint}", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_malformed_requests(self):
        """Test malformed request data handling"""
        test_cases = [
            ("/competitions", "POST", {"invalid": "data"}),
            ("/competitions/join", "POST", {"wrong_field": "value"}),
            ("/wallet/topup", "POST", {"amount": "not_a_number"}),
            ("/wallet/withdraw", "POST", {"amount": -50}),
            ("/auth/language", "PATCH", {"language": "invalid_lang"})
        ]
        
        all_success = True
        for endpoint, method, data in test_cases:
            try:
                if method == "POST":
                    response = requests.post(f"{BASE_URL}{endpoint}", json=data, headers=HEADERS)
                elif method == "PATCH":
                    response = requests.patch(f"{BASE_URL}{endpoint}", json=data, headers=HEADERS)
                
                # Should return 401 (unauthorized) or 422 (validation error)
                success = response.status_code in [401, 422, 400]
                details = f"Status: {response.status_code} (Expected 401/422/400 for malformed data)"
                self.log_test(f"Malformed request {endpoint}", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Malformed request {endpoint}", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def test_database_connection(self):
        """Test if backend can connect to database (via health check)"""
        try:
            response = requests.get(f"{BASE_URL}/health")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "status" in data and data["status"] == "healthy"
            details = f"Database connection via health check: {'OK' if success else 'FAILED'}"
            self.log_test("Database Connection", success, details)
            return success
        except Exception as e:
            self.log_test("Database Connection", False, f"Exception: {str(e)}")
            return False
    
    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{BASE_URL}/health")
            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers"
            ]
            
            success = True
            missing_headers = []
            for header in cors_headers:
                if header not in response.headers:
                    missing_headers.append(header)
                    success = False
            
            details = f"CORS headers: {'All present' if success else f'Missing: {missing_headers}'}"
            self.log_test("CORS Headers", success, details)
            return success
        except Exception as e:
            self.log_test("CORS Headers", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("FANTAPAY BACKEND API TESTING SUITE")
        print("=" * 60)
        print(f"Testing backend at: {BASE_URL}")
        print()
        
        # Run all tests
        tests = [
            self.test_health_check,
            self.test_database_connection,
            self.test_cors_headers,
            self.test_auth_session_mock,
            self.test_auth_endpoints_without_session,
            self.test_competition_endpoints_without_auth,
            self.test_wallet_endpoints_without_auth,
            self.test_invalid_endpoints,
            self.test_malformed_requests
        ]
        
        passed = 0
        total = 0
        
        for test in tests:
            print(f"\n--- Running {test.__name__} ---")
            if test():
                passed += 1
            total += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Detailed results
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FantaPayTester()
    success = tester.run_all_tests()
    
    print(f"\n{'='*60}")
    print("BACKEND TESTING COMPLETE")
    print(f"Overall Result: {'✅ ALL TESTS PASSED' if success else '❌ SOME TESTS FAILED'}")
    print(f"{'='*60}")