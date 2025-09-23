#!/usr/bin/env python3
"""
FantaPay Backend API Comprehensive Test Suite
Tests all backend functionality including authentication, competitions, wallet operations, and transactions.
"""

import requests
import json
import time
import random
import string
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://fintech-fantapay.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FantaPayTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session_token = None
        self.user_data = None
        self.competition_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        request_headers = HEADERS.copy()
        
        if headers:
            request_headers.update(headers)
            
        if self.session_token:
            request_headers["Authorization"] = f"Bearer {self.session_token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def generate_test_user_data(self):
        """Generate realistic test user data"""
        random_suffix = ''.join(random.choices(string.digits, k=6))
        return {
            "username": f"marco_rossi_{random_suffix}",
            "email": f"marco.rossi.{random_suffix}@fantapay.it",
            "name": "Marco Rossi",
            "password": "SecurePass123!",
            "language": "it"
        }
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.make_request("GET", "/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "API is healthy", data)
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_user_signup(self, user_data: Dict):
        """Test user signup with email/password"""
        try:
            response = self.make_request("POST", "/auth/signup", user_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("otp_sent") and data.get("email") == user_data["email"]:
                    self.log_test("User Signup", True, f"Account created for {user_data['email']}", data)
                    return True
                else:
                    self.log_test("User Signup", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("User Signup", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Signup", False, f"Exception: {str(e)}")
            return False
    
    def get_otp_from_logs(self, email: str) -> str:
        """Extract OTP from backend logs"""
        try:
            import subprocess
            result = subprocess.run(['tail', '-n', '100', '/var/log/supervisor/backend.out.log'], 
                                  capture_output=True, text=True)
            logs = result.stdout
            
            # Look for OTP email line for this specific email
            for line in logs.split('\n'):
                if f"📧 OTP Email for {email}" in line and ":" in line:
                    # Extract OTP from line like: "📧 OTP Email for email@test.com (Name): 123456"
                    otp = line.split(':')[-1].strip()
                    if otp.isdigit() and len(otp) == 6:
                        return otp
            return "123456"  # fallback
        except:
            return "123456"  # fallback

    def test_otp_verification(self, email: str, otp_code: str = None):
        """Test OTP verification (extracting real OTP from logs)"""
        try:
            # Get the real OTP from backend logs
            if otp_code is None:
                otp_code = self.get_otp_from_logs(email)
                print(f"   Using OTP from logs: {otp_code}")
            
            verification_data = {
                "email": email,
                "otp_code": otp_code
            }
            
            response = self.make_request("POST", "/auth/verify-otp", verification_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user") and data.get("session_token"):
                    self.session_token = data["session_token"]
                    self.user_data = data["user"]
                    self.log_test("OTP Verification", True, f"Account verified for {email}", data)
                    return True
                else:
                    self.log_test("OTP Verification", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("OTP Verification", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("OTP Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login(self, email: str, password: str):
        """Test user login with email/password"""
        try:
            login_data = {
                "email": email,
                "password": password
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user") and data.get("session_token"):
                    self.session_token = data["session_token"]
                    self.user_data = data["user"]
                    self.log_test("User Login", True, f"Login successful for {email}", data)
                    return True
                else:
                    self.log_test("User Login", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_google_oauth_session(self):
        """Test Google OAuth session creation (mocked)"""
        try:
            # Mock session ID for testing
            mock_session_id = "mock_google_session_123"
            headers = {"X-Session-ID": mock_session_id}
            
            response = self.make_request("POST", "/auth/session", headers=headers)
            
            # This will likely fail since we're using a mock session ID
            # But we test the endpoint structure
            if response.status_code == 400:
                self.log_test("Google OAuth Session", True, "Endpoint accessible, invalid session ID as expected")
                return True
            elif response.status_code == 200:
                data = response.json()
                self.log_test("Google OAuth Session", True, "Session created successfully", data)
                return True
            else:
                self.log_test("Google OAuth Session", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Google OAuth Session", False, f"Exception: {str(e)}")
            return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("email") and data.get("name"):
                    self.log_test("Get Current User", True, f"User info retrieved for {data['email']}", data)
                    return True
                else:
                    self.log_test("Get Current User", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Get Current User", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")
            return False
    
    def test_language_update(self):
        """Test language preference update"""
        try:
            response = self.make_request("PATCH", "/auth/language?language=en")
            
            if response.status_code == 200:
                data = response.json()
                if "updated successfully" in data.get("message", ""):
                    self.log_test("Language Update", True, "Language updated to English", data)
                    return True
                else:
                    self.log_test("Language Update", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Language Update", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Language Update", False, f"Exception: {str(e)}")
            return False
    
    def test_biometric_toggle(self):
        """Test biometric authentication toggle"""
        try:
            response = self.make_request("PATCH", "/auth/biometric?enabled=true")
            
            if response.status_code == 200:
                data = response.json()
                if "enabled" in data.get("message", ""):
                    self.log_test("Biometric Toggle", True, "Biometric authentication enabled", data)
                    return True
                else:
                    self.log_test("Biometric Toggle", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Biometric Toggle", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Biometric Toggle", False, f"Exception: {str(e)}")
            return False
    
    def test_create_competition(self):
        """Test competition creation"""
        try:
            competition_data = {
                "name": "Serie A Fantasy League 2024",
                "rules": {
                    "type": "mixed",
                    "daily_prize": 50.0,
                    "final_prize_pool": [
                        {"position": 1, "amount": 500.0, "description": "First Place"},
                        {"position": 2, "amount": 300.0, "description": "Second Place"},
                        {"position": 3, "amount": 200.0, "description": "Third Place"}
                    ]
                }
            }
            
            response = self.make_request("POST", "/competitions", competition_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("invite_code"):
                    self.competition_id = data["id"]
                    self.log_test("Create Competition", True, f"Competition created with ID {self.competition_id}", data)
                    return True
                else:
                    self.log_test("Create Competition", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Create Competition", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Competition", False, f"Exception: {str(e)}")
            return False
    
    def test_get_my_competitions(self):
        """Test getting user's competitions"""
        try:
            response = self.make_request("GET", "/competitions/my")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get My Competitions", True, f"Retrieved {len(data)} competitions", data)
                    return True
                else:
                    self.log_test("Get My Competitions", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Get My Competitions", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get My Competitions", False, f"Exception: {str(e)}")
            return False
    
    def test_get_competition_details(self):
        """Test getting competition details"""
        if not self.competition_id:
            self.log_test("Get Competition Details", False, "No competition ID available")
            return False
            
        try:
            response = self.make_request("GET", f"/competitions/{self.competition_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("participants"):
                    self.log_test("Get Competition Details", True, f"Competition details retrieved", data)
                    return True
                else:
                    self.log_test("Get Competition Details", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Get Competition Details", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Competition Details", False, f"Exception: {str(e)}")
            return False
    
    def test_wallet_balance(self):
        """Test getting wallet balance"""
        try:
            response = self.make_request("GET", "/wallet/balance")
            
            if response.status_code == 200:
                data = response.json()
                if "balance" in data:
                    self.log_test("Get Wallet Balance", True, f"Balance: €{data['balance']}", data)
                    return True
                else:
                    self.log_test("Get Wallet Balance", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Get Wallet Balance", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Wallet Balance", False, f"Exception: {str(e)}")
            return False
    
    def test_wallet_topup(self):
        """Test wallet top-up"""
        try:
            response = self.make_request("POST", "/wallet/topup?amount=100.0")
            
            if response.status_code == 200:
                data = response.json()
                if "topped up successfully" in data.get("message", "") and data.get("new_balance"):
                    self.log_test("Wallet Top-up", True, f"Topped up €100, new balance: €{data['new_balance']}", data)
                    return True
                else:
                    self.log_test("Wallet Top-up", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Wallet Top-up", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Wallet Top-up", False, f"Exception: {str(e)}")
            return False
    
    def test_wallet_withdraw(self):
        """Test wallet withdrawal"""
        try:
            response = self.make_request("POST", "/wallet/withdraw?amount=25.0")
            
            if response.status_code == 200:
                data = response.json()
                if "successful" in data.get("message", "") and data.get("new_balance") is not None:
                    self.log_test("Wallet Withdrawal", True, f"Withdrew €25, new balance: €{data['new_balance']}", data)
                    return True
                else:
                    self.log_test("Wallet Withdrawal", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Wallet Withdrawal", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Wallet Withdrawal", False, f"Exception: {str(e)}")
            return False
    
    def test_competition_payment(self):
        """Test paying competition fee"""
        if not self.competition_id:
            self.log_test("Competition Payment", False, "No competition ID available")
            return False
            
        try:
            response = self.make_request("POST", f"/competitions/{self.competition_id}/pay?amount=50.0")
            
            if response.status_code == 200:
                data = response.json()
                if "successful" in data.get("message", ""):
                    self.log_test("Competition Payment", True, f"Paid €50 to competition", data)
                    return True
                else:
                    self.log_test("Competition Payment", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Competition Payment", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Competition Payment", False, f"Exception: {str(e)}")
            return False
    
    def test_transaction_history(self):
        """Test getting transaction history"""
        try:
            response = self.make_request("GET", "/transactions")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Transaction History", True, f"Retrieved {len(data)} transactions", data)
                    return True
                else:
                    self.log_test("Transaction History", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Transaction History", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Transaction History", False, f"Exception: {str(e)}")
            return False
    
    def test_competition_transactions(self):
        """Test getting competition transaction history"""
        if not self.competition_id:
            self.log_test("Competition Transactions", False, "No competition ID available")
            return False
            
        try:
            response = self.make_request("GET", f"/competitions/{self.competition_id}/transactions")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Competition Transactions", True, f"Retrieved {len(data)} competition transactions", data)
                    return True
                else:
                    self.log_test("Competition Transactions", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Competition Transactions", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Competition Transactions", False, f"Exception: {str(e)}")
            return False
    
    def test_error_scenarios(self):
        """Test various error scenarios"""
        error_tests = []
        
        # Test invalid credentials
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": "nonexistent@test.com",
                "password": "wrongpassword"
            })
            if response.status_code == 401:
                error_tests.append(("Invalid Login", True, "Correctly rejected invalid credentials"))
            else:
                error_tests.append(("Invalid Login", False, f"Expected 401, got {response.status_code}"))
        except Exception as e:
            error_tests.append(("Invalid Login", False, f"Exception: {str(e)}"))
        
        # Test insufficient balance withdrawal
        try:
            response = self.make_request("POST", "/wallet/withdraw?amount=10000.0")
            if response.status_code == 400:
                error_tests.append(("Insufficient Balance", True, "Correctly rejected insufficient balance"))
            else:
                error_tests.append(("Insufficient Balance", False, f"Expected 400, got {response.status_code}"))
        except Exception as e:
            error_tests.append(("Insufficient Balance", False, f"Exception: {str(e)}"))
        
        # Test invalid competition code
        try:
            response = self.make_request("POST", "/competitions/join", {"invite_code": "INVALID123"})
            if response.status_code == 404:
                error_tests.append(("Invalid Competition Code", True, "Correctly rejected invalid code"))
            else:
                error_tests.append(("Invalid Competition Code", False, f"Expected 404, got {response.status_code}"))
        except Exception as e:
            error_tests.append(("Invalid Competition Code", False, f"Exception: {str(e)}"))
        
        # Log all error test results
        for test_name, success, details in error_tests:
            self.log_test(test_name, success, details)
        
        return all(result[1] for result in error_tests)
    
    def test_unauthorized_access(self):
        """Test unauthorized access scenarios"""
        # Temporarily clear session token
        original_token = self.session_token
        self.session_token = None
        
        try:
            response = self.make_request("GET", "/auth/me")
            if response.status_code == 401:
                self.log_test("Unauthorized Access", True, "Correctly rejected unauthorized request")
                success = True
            else:
                self.log_test("Unauthorized Access", False, f"Expected 401, got {response.status_code}")
                success = False
        except Exception as e:
            self.log_test("Unauthorized Access", False, f"Exception: {str(e)}")
            success = False
        finally:
            # Restore session token
            self.session_token = original_token
        
        return success
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting FantaPay Backend API Comprehensive Test Suite")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Generate test user data
        test_user = self.generate_test_user_data()
        print(f"👤 Test User: {test_user['name']} ({test_user['email']})")
        print("=" * 80)
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Signup", lambda: self.test_user_signup(test_user)),
            ("OTP Verification", lambda: self.test_otp_verification(test_user["email"])),
            ("User Login", lambda: self.test_user_login(test_user["email"], test_user["password"])),
            ("Google OAuth Session", self.test_google_oauth_session),
            ("Get Current User", self.test_get_current_user),
            ("Language Update", self.test_language_update),
            ("Biometric Toggle", self.test_biometric_toggle),
            ("Create Competition", self.test_create_competition),
            ("Get My Competitions", self.test_get_my_competitions),
            ("Get Competition Details", self.test_get_competition_details),
            ("Get Wallet Balance", self.test_wallet_balance),
            ("Wallet Top-up", self.test_wallet_topup),
            ("Wallet Withdrawal", self.test_wallet_withdraw),
            ("Competition Payment", self.test_competition_payment),
            ("Transaction History", self.test_transaction_history),
            ("Competition Transactions", self.test_competition_transactions),
            ("Error Scenarios", self.test_error_scenarios),
            ("Unauthorized Access", self.test_unauthorized_access),
        ]
        
        # Run tests
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running: {test_name}")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test_name}: Exception - {str(e)}")
                self.log_test(test_name, False, f"Exception: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        print("-" * 80)
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        return passed, failed, self.test_results

def main():
    """Main test execution"""
    tester = FantaPayTester()
    passed, failed, results = tester.run_comprehensive_test()
    
    # Save results to file
    with open("/app/backend_test_results.json", "w") as f:
        json.dump({
            "summary": {
                "passed": passed,
                "failed": failed,
                "success_rate": passed/(passed+failed)*100 if (passed+failed) > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "results": results
        }, f, indent=2)
    
    print(f"\n💾 Results saved to /app/backend_test_results.json")
    
    return passed, failed

if __name__ == "__main__":
    main()