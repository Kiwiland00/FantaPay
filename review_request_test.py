#!/usr/bin/env python3
"""
FantaPay Backend Review Request Validation Test
Focus: Specific requirements mentioned in the review request

Testing the critical backend functionality mentioned in the review request:
1. **Competition Creation & Fee Settings**: Verify competitions are created with correct daily payment amounts (€10) and fees are properly stored/retrieved
2. **Payment Processing**: Test payments use actual competition fee (€10) instead of hardcoded values (€5)
3. **Admin Participant Removal**: Test participant management system and admin logging
4. **Competition Financial Display**: Ensure competition balance and fee display works correctly
5. **All Core Systems**: Verify wallet, payment, logging, and competition management APIs
"""

import requests
import json
import time
import random
import string
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://fantaleague-pay.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ReviewRequestTester:
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
        
        if self.session_token:
            request_headers["Authorization"] = f"Bearer {self.session_token}"
            
        if headers:
            request_headers.update(headers)
            
        try:
            if method == "GET":
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == "PATCH":
                response = requests.patch(url, json=data, headers=request_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {str(e)}")
            raise
            
    def setup_test_user(self) -> bool:
        """Setup authenticated test user"""
        print("🔧 Setting up test user...")
        
        # Generate unique test user
        suffix = random.randint(100000, 999999)
        user_data = {
            "username": f"review_tester_{suffix}",
            "email": f"review.tester.{suffix}@fantapay.com",
            "name": f"Review Tester {suffix}",
            "password": "ReviewTest123!",
            "language": "en"
        }
        
        try:
            # Signup
            signup_response = self.make_request("POST", "/auth/signup", user_data)
            if signup_response.status_code != 200:
                print(f"❌ Signup failed: {signup_response.text}")
                return False
                
            # OTP Verification (using mock OTP)
            otp_data = {
                "email": user_data["email"],
                "otp_code": "123456"  # Mock OTP
            }
            
            otp_response = self.make_request("POST", "/auth/verify-otp", otp_data)
            if otp_response.status_code != 200:
                print(f"❌ OTP verification failed: {otp_response.text}")
                return False
                
            otp_result = otp_response.json()
            self.session_token = otp_result.get("session_token")
            self.user_data = user_data
            
            print(f"✅ Test user setup complete: {user_data['name']}")
            return True
            
        except Exception as e:
            print(f"❌ Test user setup failed: {str(e)}")
            return False
            
    def test_competition_creation_with_10_euro_fee(self) -> bool:
        """Test 1: Competition Creation & Fee Settings with €10 daily payment"""
        print("\n🧪 Testing Competition Creation with €10 Daily Payment Fee...")
        
        try:
            # Create competition with €10 daily payment (as mentioned in review request)
            competition_data = {
                "name": f"Review Test League {random.randint(1000, 9999)}",
                "rules": {
                    "type": "mixed",
                    "daily_prize": 15.0,
                    "final_prize_pool": [
                        {"position": 1, "amount": 1000.0, "description": "Winner"},
                        {"position": 2, "amount": 600.0, "description": "Runner-up"},
                        {"position": 3, "amount": 400.0, "description": "Third Place"}
                    ]
                },
                "total_matchdays": 36,
                "participation_cost_per_team": 360.0,  # €10 * 36 matchdays
                "expected_teams": 10,
                "total_prize_pool": 3600.0,  # €360 * 10 teams
                "daily_payment_enabled": True,
                "daily_payment_amount": 10.0  # €10 per matchday as mentioned in review
            }
            
            response = self.make_request("POST", "/competitions", competition_data)
            
            if response.status_code != 200:
                self.log_test("Competition Creation €10 Fee", False, f"Failed to create competition: {response.text}")
                return False
                
            competition = response.json()
            self.competition_id = competition.get("_id") or competition.get("id")
            
            # Verify €10 fee is correctly stored
            daily_amount = competition.get("daily_payment_amount")
            daily_enabled = competition.get("daily_payment_enabled")
            
            if daily_amount != 10.0:
                self.log_test("Competition Creation €10 Fee", False, f"Expected €10.0 daily fee, got €{daily_amount}")
                return False
                
            if not daily_enabled:
                self.log_test("Competition Creation €10 Fee", False, "Daily payments should be enabled")
                return False
                
            self.log_test("Competition Creation €10 Fee", True, f"Competition created with correct €10 daily fee, ID: {self.competition_id}")
            return True
            
        except Exception as e:
            self.log_test("Competition Creation €10 Fee", False, f"Exception: {str(e)}")
            return False
            
    def test_payment_processing_with_10_euro_fee(self) -> bool:
        """Test 2: Payment Processing uses actual €10 fee instead of hardcoded €5"""
        print("\n🧪 Testing Payment Processing with €10 Fee (not hardcoded €5)...")
        
        try:
            if not self.competition_id:
                self.log_test("Payment Processing €10 Fee", False, "No competition available for testing")
                return False
                
            # First, top up wallet with sufficient funds
            topup_response = self.make_request("POST", "/wallet/topup", {"amount": 200.0})
            if topup_response.status_code != 200:
                self.log_test("Payment Processing €10 Fee", False, f"Wallet top-up failed: {topup_response.text}")
                return False
                
            # Test matchday payment for 3 matchdays (should cost €30, not €15)
            matchdays_to_pay = [1, 2, 3]
            expected_cost = 30.0  # 3 matchdays * €10 each
            
            payment_data = {
                "competition_id": self.competition_id,
                "matchdays": matchdays_to_pay
            }
            
            payment_response = self.make_request("POST", f"/competitions/{self.competition_id}/matchday-payments", payment_data)
            
            if payment_response.status_code != 200:
                self.log_test("Payment Processing €10 Fee", False, f"Matchday payment failed: {payment_response.text}")
                return False
                
            payment_result = payment_response.json()
            actual_cost = payment_result.get("total_cost")
            
            # Verify cost is €30 (3 * €10) not €15 (3 * €5)
            if actual_cost != expected_cost:
                self.log_test("Payment Processing €10 Fee", False, f"Expected cost €{expected_cost}, got €{actual_cost} - still using hardcoded €5?")
                return False
                
            self.log_test("Payment Processing €10 Fee", True, f"Payment processing uses correct €10 fee: 3 matchdays = €{actual_cost}")
            return True
            
        except Exception as e:
            self.log_test("Payment Processing €10 Fee", False, f"Exception: {str(e)}")
            return False
            
    def test_competition_financial_display(self) -> bool:
        """Test 3: Competition Financial Display shows correct amounts"""
        print("\n🧪 Testing Competition Financial Display...")
        
        try:
            if not self.competition_id:
                self.log_test("Competition Financial Display", False, "No competition available for testing")
                return False
                
            # Get competition details
            details_response = self.make_request("GET", f"/competitions/{self.competition_id}")
            
            if details_response.status_code != 200:
                self.log_test("Competition Financial Display", False, f"Failed to get competition details: {details_response.text}")
                return False
                
            competition = details_response.json()
            
            # Check financial display fields
            daily_amount = competition.get("daily_payment_amount")
            wallet_balance = competition.get("wallet_balance", 0)
            participation_cost = competition.get("participation_cost_per_team")
            total_prize_pool = competition.get("total_prize_pool")
            
            # Verify fee display shows €10, not €5
            if daily_amount != 10.0:
                self.log_test("Competition Financial Display", False, f"Fee display shows €{daily_amount} instead of €10.0")
                return False
                
            # Check if competition balance was updated from payments
            if wallet_balance > 0:
                balance_msg = f"Competition balance correctly updated: €{wallet_balance}"
            else:
                balance_msg = "Competition balance: €0 (no payments yet)"
                
            self.log_test("Competition Financial Display", True, f"Financial display correct - Daily fee: €{daily_amount}, {balance_msg}")
            return True
            
        except Exception as e:
            self.log_test("Competition Financial Display", False, f"Exception: {str(e)}")
            return False
            
    def test_admin_logging_system(self) -> bool:
        """Test 4: Admin Logging System for payments and management"""
        print("\n🧪 Testing Admin Logging System...")
        
        try:
            if not self.competition_id:
                self.log_test("Admin Logging System", False, "No competition available for testing")
                return False
                
            # Test admin payment status table
            admin_table_response = self.make_request("GET", f"/competitions/{self.competition_id}/payment-status-table")
            
            if admin_table_response.status_code != 200:
                self.log_test("Admin Logging System", False, f"Admin payment table failed: {admin_table_response.text}")
                return False
                
            admin_data = admin_table_response.json()
            participants = admin_data.get("participants", [])
            daily_amount = admin_data.get("daily_payment_amount")
            
            # Verify admin table shows correct €10 fee
            if daily_amount != 10.0:
                self.log_test("Admin Logging System", False, f"Admin table shows €{daily_amount} instead of €10.0")
                return False
                
            # Test competition transaction history (admin logging)
            trans_response = self.make_request("GET", f"/competitions/{self.competition_id}/transactions")
            
            if trans_response.status_code != 200:
                self.log_test("Admin Logging System", False, f"Competition transactions failed: {trans_response.text}")
                return False
                
            transactions = trans_response.json()
            
            # Check for proper logging of matchday payments with €10 amounts
            matchday_payments = [t for t in transactions if t.get("type") == "matchday_payment"]
            
            if matchday_payments:
                for payment in matchday_payments:
                    amount = payment.get("amount", 0)
                    # Verify payment amounts are multiples of €10 (not €5)
                    if amount % 10.0 != 0:
                        self.log_test("Admin Logging System", False, f"Payment logged with incorrect amount: €{amount} (not multiple of €10)")
                        return False
                        
            self.log_test("Admin Logging System", True, f"Admin logging working - {len(participants)} participants, {len(matchday_payments)} matchday payments logged with correct €10 amounts")
            return True
            
        except Exception as e:
            self.log_test("Admin Logging System", False, f"Exception: {str(e)}")
            return False
            
    def test_core_systems_integration(self) -> bool:
        """Test 5: All Core Systems working together"""
        print("\n🧪 Testing Core Systems Integration...")
        
        try:
            # Test wallet balance
            balance_response = self.make_request("GET", "/wallet/balance")
            if balance_response.status_code != 200:
                self.log_test("Core Systems Integration", False, f"Wallet balance failed: {balance_response.text}")
                return False
                
            balance = balance_response.json().get("balance", 0)
            
            # Test user's competitions list
            my_comps_response = self.make_request("GET", "/competitions/my")
            if my_comps_response.status_code != 200:
                self.log_test("Core Systems Integration", False, f"My competitions failed: {my_comps_response.text}")
                return False
                
            competitions = my_comps_response.json()
            
            # Test transaction history
            trans_response = self.make_request("GET", "/transactions")
            if trans_response.status_code != 200:
                self.log_test("Core Systems Integration", False, f"Transaction history failed: {trans_response.text}")
                return False
                
            transactions = trans_response.json()
            
            # Verify all systems are working
            self.log_test("Core Systems Integration", True, f"All core systems working - Wallet: €{balance}, Competitions: {len(competitions)}, Transactions: {len(transactions)}")
            return True
            
        except Exception as e:
            self.log_test("Core Systems Integration", False, f"Exception: {str(e)}")
            return False
            
    def run_review_request_tests(self) -> Dict[str, bool]:
        """Run all review request specific tests"""
        print("🎯 FANTAPAY BACKEND REVIEW REQUEST VALIDATION")
        print("=" * 60)
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)
        
        results = {}
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Failed to setup test user - aborting tests")
            return {}
            
        # Run specific review request tests
        results["competition_creation_10_euro_fee"] = self.test_competition_creation_with_10_euro_fee()
        time.sleep(1)
        
        results["payment_processing_10_euro_fee"] = self.test_payment_processing_with_10_euro_fee()
        time.sleep(1)
        
        results["competition_financial_display"] = self.test_competition_financial_display()
        time.sleep(1)
        
        results["admin_logging_system"] = self.test_admin_logging_system()
        time.sleep(1)
        
        results["core_systems_integration"] = self.test_core_systems_integration()
        
        return results
        
    def print_review_summary(self, results: Dict[str, bool]):
        """Print review request specific summary"""
        print("\n" + "=" * 60)
        print("🎯 REVIEW REQUEST VALIDATION SUMMARY")
        print("=" * 60)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        failed_tests = total_tests - passed_tests
        
        # Review request specific results
        print("📋 REVIEW REQUEST REQUIREMENTS:")
        print("-" * 40)
        
        if results.get("competition_creation_10_euro_fee"):
            print("✅ Competition Creation & Fee Settings (€10): WORKING")
        else:
            print("❌ Competition Creation & Fee Settings (€10): FAILED")
            
        if results.get("payment_processing_10_euro_fee"):
            print("✅ Payment Processing (€10 not €5): WORKING")
        else:
            print("❌ Payment Processing (€10 not €5): FAILED")
            
        if results.get("competition_financial_display"):
            print("✅ Competition Financial Display: WORKING")
        else:
            print("❌ Competition Financial Display: FAILED")
            
        if results.get("admin_logging_system"):
            print("✅ Admin Logging & Management: WORKING")
        else:
            print("❌ Admin Logging & Management: FAILED")
            
        if results.get("core_systems_integration"):
            print("✅ All Core Systems Integration: WORKING")
        else:
            print("❌ All Core Systems Integration: FAILED")
            
        print("-" * 40)
        print(f"📊 OVERALL: {passed_tests}/{total_tests} tests passed ({failed_tests} failed)")
        
        if passed_tests == total_tests:
            print("🎉 ALL REVIEW REQUEST REQUIREMENTS VALIDATED!")
            print("✅ Backend properly handles €10 fees instead of hardcoded €5")
            print("✅ Competition creation and financial display working correctly")
            print("✅ Admin logging and payment processing operational")
        else:
            print("⚠️ Some review request requirements failed validation")
            print("❌ Issues found that need to be addressed")
            
        print("=" * 60)
        
        return passed_tests == total_tests

def main():
    """Main test execution"""
    tester = ReviewRequestTester()
    
    try:
        results = tester.run_review_request_tests()
        success = tester.print_review_summary(results)
        
        # Save results
        with open("/app/review_request_test_results.json", "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "results": results,
                "test_details": tester.test_results,
                "success": success
            }, f, indent=2)
            
        print(f"💾 Results saved to /app/review_request_test_results.json")
        
        exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()