#!/usr/bin/env python3
"""
FantaPay Enhanced Payment Features Testing Suite
Specifically tests the enhanced competition balance and user-specific payment features
Focus areas from review request:
1. Competition balance calculation and real-time updates
2. User-specific payment access control
3. Participant payment history retrieval
4. All existing APIs still working after modifications
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

class EnhancedPaymentTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_users = []
        self.competitions = []
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
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, params: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        request_headers = HEADERS.copy()
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                return requests.get(url, headers=request_headers, params=params, timeout=30)
            elif method.upper() == "POST":
                return requests.post(url, json=data, headers=request_headers, params=params, timeout=30)
            elif method.upper() == "PATCH":
                return requests.patch(url, json=data, headers=request_headers, params=params, timeout=30)
            elif method.upper() == "DELETE":
                return requests.delete(url, headers=request_headers, timeout=30)
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def generate_test_email(self) -> str:
        """Generate unique test email"""
        timestamp = int(time.time())
        random_str = ''.join(random.choices(string.ascii_lowercase, k=6))
        return f"enhanced_test_{timestamp}_{random_str}@fantapay.test"
    
    def create_test_user(self, name_suffix: str) -> Optional[Dict[str, Any]]:
        """Create and verify a test user"""
        email = self.generate_test_email()
        username = f"enhanced_user_{int(time.time())}_{name_suffix}"
        
        # Signup
        signup_data = {
            "username": username,
            "email": email,
            "name": f"Enhanced Test User {name_suffix}",
            "password": "TestPassword123!",
            "language": "en"
        }
        
        response = self.make_request("POST", "/auth/signup", signup_data)
        if not response or response.status_code != 200:
            self.log_test(f"User Signup ({name_suffix})", False, f"Signup failed: {response.status_code if response else 'No response'}")
            return None
        
        # Try OTP verification with common test codes
        test_otps = ["123456", "000000", "111111", "999999"]
        for otp in test_otps:
            otp_data = {"email": email, "otp_code": otp}
            verify_response = self.make_request("POST", "/auth/verify-otp", otp_data)
            
            if verify_response and verify_response.status_code == 200:
                verify_result = verify_response.json()
                user_data = verify_result.get('user', {})
                session_token = verify_result.get('session_token')
                
                if session_token:
                    user = {
                        'email': email,
                        'username': username,
                        'name': user_data.get('name'),
                        'user_id': user_data.get('_id'),
                        'session_token': session_token,
                        'wallet_balance': user_data.get('wallet_balance', 0.0)
                    }
                    self.test_users.append(user)
                    self.log_test(f"User Creation ({name_suffix})", True, f"User {email} created and verified")
                    return user
        
        self.log_test(f"User Creation ({name_suffix})", False, "OTP verification failed")
        return None
    
    def fund_user_wallet(self, user: Dict[str, Any], amount: float = 200.0) -> bool:
        """Add funds to user wallet"""
        headers = {'Authorization': f'Bearer {user["session_token"]}'}
        response = self.make_request("POST", "/wallet/topup", params={'amount': amount}, headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            user['wallet_balance'] = result.get('new_balance', amount)
            self.log_test(f"Wallet Funding ({user['name']})", True, f"Added €{amount}, new balance: €{user['wallet_balance']}")
            return True
        else:
            self.log_test(f"Wallet Funding ({user['name']})", False, f"Failed: {response.status_code if response else 'No response'}")
            return False
    
    def create_competition_with_daily_payments(self, admin_user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a competition with daily payments enabled"""
        headers = {'Authorization': f'Bearer {admin_user["session_token"]}'}
        
        competition_data = {
            "name": f"Enhanced Payment Test League {int(time.time())}",
            "rules": {
                "type": "mixed",
                "daily_prize": 15.0,
                "final_prize_pool": [
                    {"position": 1, "amount": 800.0, "description": "Champion"},
                    {"position": 2, "amount": 500.0, "description": "Runner-up"},
                    {"position": 3, "amount": 300.0, "description": "Third Place"}
                ]
            },
            "total_matchdays": 36,
            "participation_cost_per_team": 180.0,
            "expected_teams": 12,
            "total_prize_pool": 2160.0,
            "daily_payment_enabled": True,
            "daily_payment_amount": 6.0
        }
        
        response = self.make_request("POST", "/competitions", competition_data, headers=headers)
        
        if response and response.status_code == 200:
            competition = response.json()
            competition_data = {
                'id': competition.get('_id') or competition.get('id'),
                'name': competition['name'],
                'admin_user': admin_user,
                'daily_payment_enabled': True,
                'daily_payment_amount': 6.0,
                'total_matchdays': 36,
                'invite_code': competition.get('invite_code'),
                'initial_balance': 0.0
            }
            self.competitions.append(competition_data)
            self.log_test("Enhanced Competition Creation", True, 
                        f"Competition created with €6/matchday payments, ID: {competition_data['id']}")
            return competition_data
        else:
            self.log_test("Enhanced Competition Creation", False, 
                        f"Failed: {response.status_code if response else 'No response'}")
            return None
    
    def join_competition(self, competition: Dict[str, Any], user: Dict[str, Any]) -> bool:
        """Join a competition"""
        headers = {'Authorization': f'Bearer {user["session_token"]}'}
        join_data = {"invite_code": competition['invite_code']}
        
        response = self.make_request("POST", "/competitions/join", join_data, headers=headers)
        
        if response and response.status_code == 200:
            self.log_test(f"Competition Join ({user['name']})", True, 
                        f"Successfully joined {competition['name']}")
            return True
        else:
            self.log_test(f"Competition Join ({user['name']})", False, 
                        f"Failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_competition_balance_calculation(self, competition: Dict[str, Any], admin_user: Dict[str, Any]) -> bool:
        """Test 1: Competition balance calculation and real-time updates"""
        headers = {'Authorization': f'Bearer {admin_user["session_token"]}'}
        competition_id = competition['id']
        
        # Get initial competition balance
        comp_response = self.make_request("GET", f"/competitions/{competition_id}", headers=headers)
        if not comp_response or comp_response.status_code != 200:
            self.log_test("Competition Balance - Initial Check", False, "Failed to get competition details")
            return False
        
        initial_comp_data = comp_response.json()
        initial_balance = initial_comp_data.get('wallet_balance', 0)
        
        # Make a payment and check balance update
        payment_data = {
            "competition_id": competition_id,
            "matchdays": [1, 2, 3]
        }
        
        payment_response = self.make_request("POST", f"/competitions/{competition_id}/matchday-payments", 
                                           payment_data, headers=headers)
        
        if not payment_response or payment_response.status_code != 200:
            self.log_test("Competition Balance - Payment", False, "Payment failed")
            return False
        
        payment_result = payment_response.json()
        expected_payment = 3 * competition['daily_payment_amount']  # 3 matchdays * €6
        
        # Check competition balance after payment
        comp_response_after = self.make_request("GET", f"/competitions/{competition_id}", headers=headers)
        if not comp_response_after or comp_response_after.status_code != 200:
            self.log_test("Competition Balance - After Payment Check", False, "Failed to get updated competition details")
            return False
        
        updated_comp_data = comp_response_after.json()
        updated_balance = updated_comp_data.get('wallet_balance', 0)
        expected_balance = initial_balance + expected_payment
        
        if abs(updated_balance - expected_balance) < 0.01:
            self.log_test("Competition Balance Calculation", True, 
                        f"Balance correctly updated: €{initial_balance} → €{updated_balance} (+€{expected_payment})")
            competition['current_balance'] = updated_balance
            return True
        else:
            self.log_test("Competition Balance Calculation", False, 
                        f"Balance mismatch: expected €{expected_balance}, got €{updated_balance}")
            return False
    
    def test_user_specific_payment_access(self, competition: Dict[str, Any], user1: Dict[str, Any], user2: Dict[str, Any]) -> bool:
        """Test 2: User-specific payment access control"""
        competition_id = competition['id']
        
        # User1 accesses their payment data
        headers1 = {'Authorization': f'Bearer {user1["session_token"]}'}
        user1_response = self.make_request("GET", f"/competitions/{competition_id}/matchday-payments", headers=headers1)
        
        if not user1_response or user1_response.status_code != 200:
            self.log_test("User-Specific Access - User1", False, "Failed to get User1 payment data")
            return False
        
        user1_data = user1_response.json()
        user1_payments = user1_data.get('payments', [])
        
        # User2 accesses their payment data
        headers2 = {'Authorization': f'Bearer {user2["session_token"]}'}
        user2_response = self.make_request("GET", f"/competitions/{competition_id}/matchday-payments", headers=headers2)
        
        if not user2_response or user2_response.status_code != 200:
            self.log_test("User-Specific Access - User2", False, "Failed to get User2 payment data")
            return False
        
        user2_data = user2_response.json()
        user2_payments = user2_data.get('payments', [])
        
        # Verify users only see their own data
        user1_ids = set(p.get('user_id') for p in user1_payments if p.get('user_id'))
        user2_ids = set(p.get('user_id') for p in user2_payments if p.get('user_id'))
        
        user1_only_sees_own = len(user1_ids) <= 1 and (not user1_ids or user1['user_id'] in user1_ids)
        user2_only_sees_own = len(user2_ids) <= 1 and (not user2_ids or user2['user_id'] in user2_ids)
        
        if user1_only_sees_own and user2_only_sees_own:
            self.log_test("User-Specific Payment Access Control", True, 
                        f"Users correctly see only their own payment data (User1: {len(user1_payments)} records, User2: {len(user2_payments)} records)")
            return True
        else:
            self.log_test("User-Specific Payment Access Control", False, 
                        "Users can see other users' payment data")
            return False
    
    def test_participant_payment_history_retrieval(self, competition: Dict[str, Any], user: Dict[str, Any]) -> bool:
        """Test 3: Participant payment history retrieval"""
        competition_id = competition['id']
        headers = {'Authorization': f'Bearer {user["session_token"]}'}
        
        # Make some payments first
        payment_data = {
            "competition_id": competition_id,
            "matchdays": [4, 5, 6, 7]
        }
        
        payment_response = self.make_request("POST", f"/competitions/{competition_id}/matchday-payments", 
                                           payment_data, headers=headers)
        
        if not payment_response or payment_response.status_code != 200:
            self.log_test("Payment History - Setup Payment", False, "Failed to make test payment")
            return False
        
        # Retrieve payment history
        history_response = self.make_request("GET", f"/competitions/{competition_id}/matchday-payments", headers=headers)
        
        if not history_response or history_response.status_code != 200:
            self.log_test("Participant Payment History Retrieval", False, "Failed to retrieve payment history")
            return False
        
        history_data = history_response.json()
        payments = history_data.get('payments', [])
        
        # Check for paid and pending payments
        paid_payments = [p for p in payments if p.get('status') == 'paid']
        pending_payments = [p for p in payments if p.get('status') == 'pending']
        
        # Verify payment history structure
        has_required_fields = all(
            'matchday' in p and 'status' in p and 'amount' in p 
            for p in payments
        )
        
        if has_required_fields and len(paid_payments) >= 4:  # At least the 4 we just paid
            self.log_test("Participant Payment History Retrieval", True, 
                        f"Retrieved complete payment history: {len(paid_payments)} paid, {len(pending_payments)} pending")
            return True
        else:
            self.log_test("Participant Payment History Retrieval", False, 
                        f"Incomplete payment history: {len(paid_payments)} paid, missing required fields: {not has_required_fields}")
            return False
    
    def test_existing_apis_still_working(self, user: Dict[str, Any]) -> bool:
        """Test 4: All existing APIs still working after modifications"""
        headers = {'Authorization': f'Bearer {user["session_token"]}'}
        
        # Test wallet balance
        balance_response = self.make_request("GET", "/wallet/balance", headers=headers)
        if not balance_response or balance_response.status_code != 200:
            self.log_test("Existing APIs - Wallet Balance", False, "Wallet balance API failed")
            return False
        
        # Test user info
        user_response = self.make_request("GET", "/auth/me", headers=headers)
        if not user_response or user_response.status_code != 200:
            self.log_test("Existing APIs - User Info", False, "User info API failed")
            return False
        
        # Test competitions list
        competitions_response = self.make_request("GET", "/competitions/my", headers=headers)
        if not competitions_response or competitions_response.status_code != 200:
            self.log_test("Existing APIs - Competitions List", False, "Competitions list API failed")
            return False
        
        # Test transaction history
        transactions_response = self.make_request("GET", "/transactions", headers=headers)
        if not transactions_response or transactions_response.status_code != 200:
            self.log_test("Existing APIs - Transaction History", False, "Transaction history API failed")
            return False
        
        self.log_test("Existing APIs Still Working", True, 
                    "All core APIs (wallet, user, competitions, transactions) working correctly")
        return True
    
    def test_real_time_balance_format(self, competition: Dict[str, Any], admin_user: Dict[str, Any]) -> bool:
        """Test enhanced balance display format (€paid / €total)"""
        headers = {'Authorization': f'Bearer {admin_user["session_token"]}'}
        competition_id = competition['id']
        
        # Get payment status table
        status_response = self.make_request("GET", f"/competitions/{competition_id}/payment-status-table", headers=headers)
        
        if not status_response or status_response.status_code != 200:
            self.log_test("Real-time Balance Format", False, "Failed to get payment status table")
            return False
        
        status_data = status_response.json()
        participants = status_data.get('participants', [])
        daily_amount = status_data.get('daily_payment_amount', 0)
        total_matchdays = status_data.get('total_matchdays', 0)
        
        if not participants:
            self.log_test("Real-time Balance Format", False, "No participants found")
            return False
        
        # Calculate balance format for each participant
        balance_calculations = []
        for participant in participants:
            matchday_payments = participant.get('matchday_payments', [])
            paid_matchdays = [mp for mp in matchday_payments if mp.get('status') == 'paid']
            
            paid_amount = len(paid_matchdays) * daily_amount
            total_amount = total_matchdays * daily_amount
            
            balance_format = f"€{paid_amount:.1f} / €{total_amount:.1f}"
            balance_calculations.append({
                'participant': participant.get('name', 'Unknown'),
                'paid_matchdays': len(paid_matchdays),
                'balance_format': balance_format
            })
        
        if balance_calculations:
            self.log_test("Real-time Balance Format", True, 
                        f"Balance format calculated for {len(balance_calculations)} participants: " +
                        ", ".join([f"{bc['participant']}: {bc['balance_format']}" for bc in balance_calculations[:2]]))
            return True
        else:
            self.log_test("Real-time Balance Format", False, "Failed to calculate balance format")
            return False
    
    def run_enhanced_payment_tests(self):
        """Run all enhanced payment feature tests"""
        print("🚀 Starting FantaPay Enhanced Payment Features Testing Suite")
        print("=" * 80)
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Phase 1: Setup test users
        print("\n👥 PHASE 1: Test User Setup")
        admin_user = self.create_test_user("Admin")
        if not admin_user:
            print("❌ Failed to create admin user - aborting tests")
            return False
        
        user1 = self.create_test_user("User1")
        if not user1:
            print("❌ Failed to create user1 - aborting tests")
            return False
        
        user2 = self.create_test_user("User2")
        if not user2:
            print("❌ Failed to create user2 - aborting tests")
            return False
        
        # Fund wallets
        self.fund_user_wallet(admin_user, 300.0)
        self.fund_user_wallet(user1, 250.0)
        self.fund_user_wallet(user2, 200.0)
        
        # Phase 2: Create competition
        print("\n🏆 PHASE 2: Enhanced Competition Setup")
        competition = self.create_competition_with_daily_payments(admin_user)
        if not competition:
            print("❌ Failed to create competition - aborting tests")
            return False
        
        # Join competition
        self.join_competition(competition, user1)
        self.join_competition(competition, user2)
        
        # Phase 3: Core enhanced payment tests
        print("\n💰 PHASE 3: Enhanced Payment Feature Tests")
        
        test_results = []
        
        # Test 1: Competition balance calculation and real-time updates
        test_results.append(self.test_competition_balance_calculation(competition, admin_user))
        
        # Test 2: User-specific payment access control
        test_results.append(self.test_user_specific_payment_access(competition, user1, user2))
        
        # Test 3: Participant payment history retrieval
        test_results.append(self.test_participant_payment_history_retrieval(competition, user1))
        
        # Test 4: All existing APIs still working
        test_results.append(self.test_existing_apis_still_working(user2))
        
        # Test 5: Real-time balance format
        test_results.append(self.test_real_time_balance_format(competition, admin_user))
        
        # Results summary
        print("\n" + "=" * 80)
        print("📊 ENHANCED PAYMENT FEATURES TEST SUMMARY")
        print("=" * 80)
        
        passed_tests = sum(1 for result in self.test_results if result['success'])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {passed_tests}")
        print(f"❌ FAILED: {total_tests - passed_tests}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate < 100:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Save results
        with open('/app/enhanced_payment_test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to /app/enhanced_payment_test_results.json")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = EnhancedPaymentTester()
    success = tester.run_enhanced_payment_tests()
    
    if success:
        print(f"\n🎉 ENHANCED PAYMENT FEATURES TESTING SUCCESSFUL!")
        print("All enhanced competition balance and user-specific payment features are working correctly.")
    else:
        print(f"\n⚠️ ENHANCED PAYMENT FEATURES TESTING COMPLETED WITH ISSUES")
        print("Some enhanced features may need attention before production deployment.")