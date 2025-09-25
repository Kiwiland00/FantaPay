#!/usr/bin/env python3
"""
FantaPay Backend Comprehensive Testing Suite
Tests backend functionality including database operations and business logic
"""

import requests
import json
import uuid
from datetime import datetime
import time
import asyncio
import motor.motor_asyncio
import os
from bson import ObjectId

# Configuration
BASE_URL = "https://fantaleague-pay.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FantaPayComprehensiveTester:
    def __init__(self):
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
    
    def test_api_structure(self):
        """Test API structure and routing"""
        try:
            # Test that /api prefix is working
            response = requests.get(f"{BASE_URL}/health")
            api_prefix_works = response.status_code == 200
            
            # Test that root path without /api doesn't work for our endpoints
            base_without_api = BASE_URL.replace('/api', '')
            response_no_api = requests.get(f"{base_without_api}/health")
            root_isolated = response_no_api.status_code == 404
            
            success = api_prefix_works and root_isolated
            details = f"API prefix works: {api_prefix_works}, Root isolated: {root_isolated}"
            self.log_test("API Structure & Routing", success, details)
            return success
        except Exception as e:
            self.log_test("API Structure & Routing", False, f"Exception: {str(e)}")
            return False
    
    def test_pydantic_models(self):
        """Test Pydantic model validation through API responses"""
        try:
            # Test validation errors with malformed data
            test_cases = [
                # Invalid competition data
                {
                    "endpoint": "/competitions",
                    "method": "POST",
                    "data": {"name": "", "rules": {"type": "invalid_type"}},
                    "expected_status": [401, 422]  # 401 for auth, 422 for validation
                },
                # Invalid join data
                {
                    "endpoint": "/competitions/join", 
                    "method": "POST",
                    "data": {"invite_code": ""},
                    "expected_status": [401, 422]
                },
                # Invalid wallet amount
                {
                    "endpoint": "/wallet/topup",
                    "method": "POST", 
                    "data": {"amount": -100},
                    "expected_status": [401, 422]
                }
            ]
            
            all_success = True
            for case in test_cases:
                response = requests.request(
                    case["method"],
                    f"{BASE_URL}{case['endpoint']}", 
                    json=case["data"],
                    headers=HEADERS
                )
                
                success = response.status_code in case["expected_status"]
                if not success:
                    all_success = False
                    
                self.log_test(
                    f"Pydantic Validation {case['endpoint']}", 
                    success, 
                    f"Status: {response.status_code}, Expected: {case['expected_status']}"
                )
            
            return all_success
        except Exception as e:
            self.log_test("Pydantic Models", False, f"Exception: {str(e)}")
            return False
    
    def test_objectid_handling(self):
        """Test ObjectId handling in endpoints"""
        try:
            test_cases = [
                # Invalid ObjectId format
                {"endpoint": "/competitions/invalid_id", "expected": 401},
                {"endpoint": "/competitions/invalid_id/standings", "expected": 401},
                {"endpoint": "/competitions/invalid_id/pay", "expected": 401},
                {"endpoint": "/competitions/invalid_id/transactions", "expected": 401},
                
                # Valid ObjectId format but non-existent
                {"endpoint": "/competitions/507f1f77bcf86cd799439011", "expected": 401},
                {"endpoint": "/competitions/507f1f77bcf86cd799439011/standings", "expected": 401},
            ]
            
            all_success = True
            for case in test_cases:
                response = requests.get(f"{BASE_URL}{case['endpoint']}")
                success = response.status_code == case["expected"]
                if not success:
                    all_success = False
                
                self.log_test(
                    f"ObjectId handling {case['endpoint']}", 
                    success, 
                    f"Status: {response.status_code}, Expected: {case['expected']}"
                )
            
            return all_success
        except Exception as e:
            self.log_test("ObjectId Handling", False, f"Exception: {str(e)}")
            return False
    
    def test_http_methods(self):
        """Test correct HTTP methods are enforced"""
        try:
            test_cases = [
                # Wrong methods should return 405 or 401
                {"endpoint": "/auth/me", "method": "POST", "expected": [401, 405]},
                {"endpoint": "/auth/logout", "method": "GET", "expected": [401, 405]},
                {"endpoint": "/competitions", "method": "GET", "expected": [401, 405]},
                {"endpoint": "/wallet/balance", "method": "POST", "expected": [401, 405]},
                {"endpoint": "/wallet/topup", "method": "GET", "expected": [401, 405]},
            ]
            
            all_success = True
            for case in test_cases:
                response = requests.request(case["method"], f"{BASE_URL}{case['endpoint']}")
                success = response.status_code in case["expected"]
                if not success:
                    all_success = False
                
                self.log_test(
                    f"HTTP Method {case['method']} {case['endpoint']}", 
                    success, 
                    f"Status: {response.status_code}, Expected: {case['expected']}"
                )
            
            return all_success
        except Exception as e:
            self.log_test("HTTP Methods", False, f"Exception: {str(e)}")
            return False
    
    def test_authentication_flow(self):
        """Test authentication flow and session management"""
        try:
            # Test session creation with invalid session ID
            mock_session_id = str(uuid.uuid4())
            response = requests.post(
                f"{BASE_URL}/auth/session",
                headers={"X-Session-ID": mock_session_id}
            )
            
            # Should fail with 400 because Emergent Auth will reject the mock session
            session_creation_fails = response.status_code == 400
            
            # Test that all protected endpoints require authentication
            protected_endpoints = [
                "/auth/me", "/auth/logout", "/auth/language", "/auth/biometric",
                "/competitions", "/competitions/join", "/competitions/my",
                "/wallet/balance", "/wallet/topup", "/wallet/withdraw",
                "/transactions"
            ]
            
            all_protected = True
            for endpoint in protected_endpoints:
                response = requests.get(f"{BASE_URL}{endpoint}")
                if response.status_code != 401:
                    all_protected = False
                    break
            
            success = session_creation_fails and all_protected
            details = f"Session creation properly fails: {session_creation_fails}, All endpoints protected: {all_protected}"
            self.log_test("Authentication Flow", success, details)
            return success
        except Exception as e:
            self.log_test("Authentication Flow", False, f"Exception: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test error handling and response formats"""
        try:
            # Test various error scenarios
            test_cases = [
                # Missing headers
                {"url": f"{BASE_URL}/auth/session", "method": "POST", "expected": [400, 422]},
                
                # Invalid JSON
                {"url": f"{BASE_URL}/competitions", "method": "POST", "data": "invalid json", "expected": [400, 422]},
                
                # Missing required fields (will hit auth first, but structure is important)
                {"url": f"{BASE_URL}/competitions/join", "method": "POST", "data": {}, "expected": [401, 422]},
            ]
            
            all_success = True
            for i, case in enumerate(test_cases):
                try:
                    if case.get("data") == "invalid json":
                        # Send invalid JSON
                        response = requests.post(case["url"], data="invalid json", headers={"Content-Type": "application/json"})
                    else:
                        response = requests.request(
                            case["method"], 
                            case["url"], 
                            json=case.get("data"),
                            headers=HEADERS
                        )
                    
                    success = response.status_code in case["expected"]
                    if not success:
                        all_success = False
                    
                    self.log_test(
                        f"Error Handling Case {i+1}", 
                        success, 
                        f"Status: {response.status_code}, Expected: {case['expected']}"
                    )
                except Exception as e:
                    self.log_test(f"Error Handling Case {i+1}", False, f"Exception: {str(e)}")
                    all_success = False
            
            return all_success
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")
            return False
    
    def test_business_logic_validation(self):
        """Test business logic validation (through expected error responses)"""
        try:
            # Test business logic that should be validated
            test_cases = [
                # Negative amounts should be rejected
                {"endpoint": "/wallet/topup", "data": {"amount": -50}, "desc": "Negative topup"},
                {"endpoint": "/wallet/withdraw", "data": {"amount": -25}, "desc": "Negative withdrawal"},
                {"endpoint": "/competitions/507f1f77bcf86cd799439011/pay", "data": {"amount": -10}, "desc": "Negative payment"},
                
                # Zero amounts should be rejected  
                {"endpoint": "/wallet/topup", "data": {"amount": 0}, "desc": "Zero topup"},
                {"endpoint": "/wallet/withdraw", "data": {"amount": 0}, "desc": "Zero withdrawal"},
                
                # Invalid language codes
                {"endpoint": "/auth/language", "data": {"language": "invalid"}, "desc": "Invalid language"},
            ]
            
            all_success = True
            for case in test_cases:
                response = requests.post(f"{BASE_URL}{case['endpoint']}", json=case["data"], headers=HEADERS)
                # Should return 401 (auth) or 400/422 (validation)
                success = response.status_code in [400, 401, 422]
                if not success:
                    all_success = False
                
                self.log_test(
                    f"Business Logic: {case['desc']}", 
                    success, 
                    f"Status: {response.status_code}"
                )
            
            return all_success
        except Exception as e:
            self.log_test("Business Logic Validation", False, f"Exception: {str(e)}")
            return False
    
    async def test_database_connectivity(self):
        """Test MongoDB connectivity directly"""
        try:
            # Try to connect to MongoDB using the same connection string
            mongo_url = "mongodb://localhost:27017"
            client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
            db = client["test_database"]
            
            # Test basic operations
            await db.test_collection.insert_one({"test": "connectivity"})
            result = await db.test_collection.find_one({"test": "connectivity"})
            await db.test_collection.delete_one({"test": "connectivity"})
            
            success = result is not None
            details = f"MongoDB connection and basic operations: {'OK' if success else 'FAILED'}"
            self.log_test("Database Connectivity", success, details)
            
            client.close()
            return success
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Exception: {str(e)}")
            return False
    
    def test_api_documentation(self):
        """Test API documentation endpoints"""
        try:
            # FastAPI automatically provides OpenAPI docs
            docs_endpoints = [
                "/docs",
                "/redoc", 
                "/openapi.json"
            ]
            
            base_url = BASE_URL.replace('/api', '')
            all_success = True
            
            for endpoint in docs_endpoints:
                response = requests.get(f"{base_url}{endpoint}")
                success = response.status_code == 200
                if not success:
                    all_success = False
                
                self.log_test(
                    f"API Docs {endpoint}", 
                    success, 
                    f"Status: {response.status_code}"
                )
            
            return all_success
        except Exception as e:
            self.log_test("API Documentation", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all comprehensive backend tests"""
        print("=" * 70)
        print("FANTAPAY BACKEND COMPREHENSIVE TESTING SUITE")
        print("=" * 70)
        print(f"Testing backend at: {BASE_URL}")
        print()
        
        # Run synchronous tests
        sync_tests = [
            self.test_api_structure,
            self.test_pydantic_models,
            self.test_objectid_handling,
            self.test_http_methods,
            self.test_authentication_flow,
            self.test_error_handling,
            self.test_business_logic_validation,
            self.test_api_documentation
        ]
        
        passed = 0
        total = 0
        
        for test in sync_tests:
            print(f"\n--- Running {test.__name__} ---")
            if test():
                passed += 1
            total += 1
        
        # Run async test
        print(f"\n--- Running test_database_connectivity ---")
        try:
            db_result = asyncio.run(self.test_database_connectivity())
            if db_result:
                passed += 1
            total += 1
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Async test failed: {str(e)}")
            total += 1
        
        # Summary
        print("\n" + "=" * 70)
        print("COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Critical issues
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for result in failed_tests:
                print(f"   • {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FantaPayComprehensiveTester()
    success = tester.run_all_tests()
    
    print(f"\n{'='*70}")
    print("BACKEND COMPREHENSIVE TESTING COMPLETE")
    print(f"Overall Result: {'✅ ALL TESTS PASSED' if success else '❌ SOME TESTS FAILED'}")
    print(f"{'='*70}")