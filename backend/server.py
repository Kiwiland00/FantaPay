from fastapi import FastAPI, HTTPException, APIRouter, Depends, Header, Response, Request
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import requests
import json
from bson import ObjectId
import hashlib
import secrets
import random
import string
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="FantaPay API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid objectid')
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type='string')
        return field_schema

# User Models
class User(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    name: str
    username: Optional[str] = None
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    auth_method: str = "google"  # "google" or "email"
    is_verified: bool = True  # Google users are auto-verified
    language: str = "en"
    wallet_balance: float = 0.0
    biometric_enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    language: str = "en"

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    name: str
    password: str
    language: str = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerification(BaseModel):
    email: EmailStr
    otp_code: str

class OTPRecord(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    otp_code: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified: bool = False

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserSession(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Competition Models
class PrizeSlot(BaseModel):
    position: int
    amount: float
    description: str = ""

class CompetitionRules(BaseModel):
    type: str  # "daily", "final", "mixed"
    daily_prize: Optional[float] = None
    final_prize_pool: List[PrizeSlot] = []

class Competition(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    admin_id: PyObjectId
    rules: CompetitionRules
    invite_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    invite_link: str = ""
    participants: List[PyObjectId] = []
    wallet_balance: float = 0.0
    is_active: bool = True
    standings: Dict[str, Any] = {}
    current_matchday: int = 1
    # Financial configuration fields
    total_matchdays: int = 36  # Default Serie A matchdays
    participation_cost_per_team: float = 210.0  # Cost per team in euros
    expected_teams: int = 8  # Expected number of teams
    total_prize_pool: float = 1680.0  # Total prize pool in euros
    # Daily payment configuration
    daily_payment_enabled: bool = False  # Whether daily payments are required
    daily_payment_amount: float = 0.0  # Amount per matchday if enabled
    # Season status
    season_ended: bool = False  # Whether final prizes have been distributed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CompetitionCreate(BaseModel):
    name: str
    rules: CompetitionRules
    # Financial configuration fields
    total_matchdays: Optional[int] = 36
    participation_cost_per_team: Optional[float] = 210.0
    expected_teams: Optional[int] = 8
    total_prize_pool: Optional[float] = 1680.0
    # Daily payment configuration
    daily_payment_enabled: Optional[bool] = False
    daily_payment_amount: Optional[float] = 0.0

class CompetitionJoin(BaseModel):
    invite_code: str

class StandingsUpdate(BaseModel):
    standings: Dict[str, Any]
    matchday: Optional[int] = None

# Transaction Models
class Transaction(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    competition_id: Optional[PyObjectId] = None
    type: str  # "deposit", "withdraw", "payment", "prize", "refund"
    amount: float
    description: str
    from_wallet: str  # "personal", "competition"
    to_wallet: str
    status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TransactionCreate(BaseModel):
    competition_id: Optional[PyObjectId] = None
    type: str
    amount: float
    description: str
    from_wallet: str
    to_wallet: str

# MatchdayPayment Models
class MatchdayPayment(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    competition_id: PyObjectId
    matchday: int  # Matchday number (1 to total_matchdays)
    amount: float  # Amount for this matchday
    status: str = "pending"  # "pending" or "paid"
    paid_at: Optional[datetime] = None  # When payment was completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class MatchdayPaymentCreate(BaseModel):
    competition_id: str
    matchdays: List[int]  # List of matchdays to pay for

class MatchdayPaymentStatus(BaseModel):
    user_id: str
    competition_id: str
    matchday: int
    status: str
    amount: float
    paid_at: Optional[datetime] = None

# Authentication helpers
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(email: str, otp_code: str, name: str) -> bool:
    """Send OTP via email (mock implementation for MVP)"""
    try:
        # For MVP, we'll just log the OTP instead of sending real email
        # In production, you would use a real email service like SendGrid, SES, etc.
        print(f"📧 OTP Email for {email} ({name}): {otp_code}")
        
        # Mock email content
        subject = "FantaPay - Email Verification Code"
        body = f"""
        Hello {name},
        
        Welcome to FantaPay! Your verification code is: {otp_code}
        
        This code will expire in 10 minutes.
        
        If you didn't create an account with FantaPay, please ignore this email.
        
        Best regards,
        The FantaPay Team
        """
        
        # In production, replace this with actual email sending logic
        # For now, return True to simulate successful sending
        return True
        
    except Exception as e:
        print(f"Failed to send OTP email: {str(e)}")
        return False

async def create_session_token(user_id: PyObjectId) -> str:
    """Create a session token and store it in database"""
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "_id": ObjectId(),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    return session_token

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """Get current user from session token"""
    session_token = None
    
    # Try to get session token from cookies first
    if 'session_token' in request.cookies:
        session_token = request.cookies['session_token']
    # Fallback to Authorization header
    elif authorization:
        session_token = authorization.replace('Bearer ', '')
    
    if not session_token:
        raise HTTPException(status_code=401, detail="No session token provided")
    
    # Find session in database
    session = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Get user
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    return User(**user)

# Auth endpoints
@api_router.post("/auth/signup")
async def signup_user(signup_data: UserSignup):
    """Register new user with email/password and send OTP"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({
            "$or": [
                {"email": signup_data.email},
                {"username": signup_data.username}
            ]
        })
        
        if existing_user:
            if existing_user["email"] == signup_data.email:
                raise HTTPException(status_code=400, detail="Email already registered")
            else:
                raise HTTPException(status_code=400, detail="Username already taken")
        
        # Hash password
        password_hash = hash_password(signup_data.password)
        
        # Create user (not verified yet)
        user_doc = {
            "_id": ObjectId(),
            "username": signup_data.username,
            "email": signup_data.email,
            "name": signup_data.name,
            "password_hash": password_hash,
            "auth_method": "email",
            "is_verified": False,
            "language": signup_data.language,
            "wallet_balance": 0.0,
            "biometric_enabled": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_login": None
        }
        
        await db.users.insert_one(user_doc)
        
        # Generate and store OTP
        otp_code = generate_otp()
        otp_doc = {
            "_id": ObjectId(),
            "email": signup_data.email,
            "otp_code": otp_code,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "created_at": datetime.now(timezone.utc),
            "verified": False
        }
        
        await db.otp_records.insert_one(otp_doc)
        
        # Send OTP email
        email_sent = await send_otp_email(signup_data.email, otp_code, signup_data.name)
        
        if not email_sent:
            # Cleanup if email sending fails
            await db.users.delete_one({"_id": user_doc["_id"]})
            await db.otp_records.delete_one({"_id": otp_doc["_id"]})
            raise HTTPException(status_code=500, detail="Failed to send verification email")
        
        return {
            "message": "Account created successfully. Please check your email for verification code.",
            "email": signup_data.email,
            "otp_sent": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@api_router.post("/auth/verify-otp")
async def verify_otp(response: Response, verification_data: OTPVerification):
    """Verify OTP and activate account"""
    try:
        # Find valid OTP record
        otp_record = await db.otp_records.find_one({
            "email": verification_data.email,
            "otp_code": verification_data.otp_code,
            "verified": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        # Mark OTP as verified
        await db.otp_records.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"verified": True}}
        )
        
        # Activate user account
        user = await db.users.find_one({"email": verification_data.email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "is_verified": True,
                    "updated_at": datetime.now(timezone.utc),
                    "last_login": datetime.now(timezone.utc)
                }
            }
        )
        
        # Create session
        session_token = await create_session_token(user["_id"])
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        # Return user data
        updated_user = await db.users.find_one({"_id": user["_id"]})
        user_dict = dict(updated_user)
        user_dict["_id"] = str(user_dict["_id"])
        
        return {
            "user": user_dict,
            "session_token": session_token,
            "message": "Account verified successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@api_router.post("/auth/login")
async def login_user(response: Response, login_data: UserLogin):
    """Login with email/password"""
    try:
        # Find user by email
        user = await db.users.find_one({"email": login_data.email})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user used email registration
        if user.get("auth_method") != "email":
            raise HTTPException(status_code=400, detail="Please use Google login for this account")
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if account is verified
        if not user.get("is_verified", False):
            raise HTTPException(status_code=403, detail="Account not verified. Please check your email for verification code")
        
        # Update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Create session
        session_token = await create_session_token(user["_id"])
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        # Return user data
        user_dict = dict(user)
        user_dict["_id"] = str(user_dict["_id"])
        
        return {
            "user": user_dict,
            "session_token": session_token,
            "message": "Login successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@api_router.post("/auth/resend-otp")
async def resend_otp(email: EmailStr):
    """Resend OTP for unverified account"""
    try:
        # Find unverified user
        user = await db.users.find_one({
            "email": email,
            "auth_method": "email",
            "is_verified": False
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found or already verified")
        
        # Invalidate existing OTP records for this email
        await db.otp_records.update_many(
            {"email": email, "verified": False},
            {"$set": {"verified": True}}  # Mark as used
        )
        
        # Generate new OTP
        otp_code = generate_otp()
        otp_doc = {
            "_id": ObjectId(),
            "email": email,
            "otp_code": otp_code,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "created_at": datetime.now(timezone.utc),
            "verified": False
        }
        
        await db.otp_records.insert_one(otp_doc)
        
        # Send OTP email
        email_sent = await send_otp_email(email, otp_code, user["name"])
        
        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send verification email")
        
        return {
            "message": "Verification code sent successfully",
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resend OTP: {str(e)}")

@api_router.post("/auth/session")
async def create_session(response: Response, session_id: str = Header(..., alias="X-Session-ID")):
    """Process session ID from Emergent Auth (Google OAuth)"""
    try:
        # Call Emergent Auth API
        auth_response = requests.post(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        auth_data = auth_response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": auth_data["email"]})
        
        if existing_user:
            user = User(**existing_user)
            # Update last login for Google users
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"last_login": datetime.now(timezone.utc)}}
            )
        else:
            # Create new Google user (auto-verified)
            user_data = {
                "email": auth_data["email"],
                "name": auth_data["name"],
                "picture": auth_data.get("picture"),
                "auth_method": "google",
                "is_verified": True,  # Google users are auto-verified
                "wallet_balance": 0.0,
                "biometric_enabled": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "last_login": datetime.now(timezone.utc)
            }
            user_data["_id"] = ObjectId()
            result = await db.users.insert_one(user_data)
            user = User(**user_data)
        
        # Create session in database
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "_id": ObjectId(),
            "user_id": user.id,
            "session_token": auth_data["session_token"],
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.user_sessions.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=auth_data["session_token"],
            max_age=7 * 24 * 60 * 60,  # 7 days
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        return {
            "user": dict(user, _id=str(user["_id"])),
            "session_token": auth_data["session_token"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Logout user"""
    # Delete session from database
    await db.user_sessions.delete_many({"user_id": current_user.id})
    
    # Clear cookie
    response.delete_cookie("session_token", path="/")
    
    return {"message": "Logged out successfully"}

@api_router.patch("/auth/language")
async def update_language(language: str, current_user: User = Depends(get_current_user)):
    """Update user language preference"""
    if language not in ["en", "it"]:
        raise HTTPException(status_code=400, detail="Language must be 'en' or 'it'")
    
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"language": language, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Language updated successfully"}

@api_router.patch("/auth/biometric")
async def toggle_biometric(enabled: bool, current_user: User = Depends(get_current_user)):
    """Toggle biometric authentication"""
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"biometric_enabled": enabled, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": f"Biometric authentication {'enabled' if enabled else 'disabled'}"}

# Competition endpoints
@api_router.post("/competitions", response_model=Competition)
async def create_competition(competition_data: CompetitionCreate, current_user: User = Depends(get_current_user)):
    """Create a new competition"""
    competition_dict = competition_data.dict()
    competition_dict["_id"] = ObjectId()
    competition_dict["admin_id"] = current_user.id
    competition_dict["participants"] = [current_user.id]
    
    # Generate invite code and link
    invite_code = str(uuid.uuid4())[:8].upper()
    competition_dict["invite_code"] = invite_code
    competition_dict["invite_link"] = f"fantapay://join/{invite_code}"
    competition_dict["wallet_balance"] = 0.0
    competition_dict["is_active"] = True
    competition_dict["standings"] = {}
    competition_dict["current_matchday"] = 1
    competition_dict["created_at"] = datetime.now(timezone.utc)
    competition_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Ensure financial fields have default values if not provided
    competition_dict["total_matchdays"] = competition_dict.get("total_matchdays", 36)
    competition_dict["participation_cost_per_team"] = competition_dict.get("participation_cost_per_team", 210.0)
    competition_dict["expected_teams"] = competition_dict.get("expected_teams", 8)
    competition_dict["total_prize_pool"] = competition_dict.get("total_prize_pool", 1680.0)
    
    # Log the competition creation with financial details
    await db.admin_logs.insert_one({
        "_id": ObjectId(),
        "admin_id": current_user.id,
        "admin_username": current_user.username or current_user.name,
        "competition_id": competition_dict["_id"],
        "competition_name": competition_dict["name"],
        "action": "create_competition",
        "details": f"Created competition with total prize pool €{competition_dict['total_prize_pool']}, cost per team €{competition_dict['participation_cost_per_team']}, {competition_dict['expected_teams']} expected teams",
        "timestamp": datetime.now(timezone.utc)
    })
    
    result = await db.competitions.insert_one(competition_dict)
    competition = Competition(**competition_dict)
    
    return competition

@api_router.post("/competitions/join")
async def join_competition(join_data: CompetitionJoin, current_user: User = Depends(get_current_user)):
    """Join a competition using invite code"""
    competition = await db.competitions.find_one({"invite_code": join_data.invite_code})
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if current_user.id in competition["participants"]:
        raise HTTPException(status_code=400, detail="Already joined this competition")
    
    # Add user to participants
    await db.competitions.update_one(
        {"_id": competition["_id"]},
        {"$push": {"participants": current_user.id}}
    )
    
    return {"message": "Successfully joined competition"}

@api_router.get("/competitions/my")
async def get_my_competitions(current_user: User = Depends(get_current_user)):
    """Get competitions where user is a participant"""
    competitions = await db.competitions.find({
        "participants": current_user.id
    }).to_list(100)
    
    # Convert ObjectIds to strings for JSON serialization
    for comp in competitions:
        comp["_id"] = str(comp["_id"])
        comp["admin_id"] = str(comp["admin_id"])
        comp["participants"] = [str(p) for p in comp["participants"]]
    
    return competitions

@api_router.get("/competitions/{competition_id}")
async def get_competition(competition_id: str, current_user: User = Depends(get_current_user)):
    """Get competition details"""
    try:
        comp_id = ObjectId(competition_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid competition ID")
    
    competition = await db.competitions.find_one({"_id": comp_id})
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if current_user.id not in competition["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant in this competition")
    
    # Get participant details
    participant_ids = competition["participants"]
    participants = await db.users.find({"_id": {"$in": participant_ids}}).to_list(100)
    
    # Convert ObjectIds
    competition["_id"] = str(competition["_id"])
    competition["admin_id"] = str(competition["admin_id"])
    competition["participants"] = [
        {
            "id": str(p["_id"]),
            "name": p["name"],
            "email": p["email"]
        }
        for p in participants
    ]
    
    return competition

@api_router.patch("/competitions/{competition_id}/standings")
async def update_standings(
    competition_id: str,
    standings_data: StandingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update competition standings (admin only)"""
    try:
        comp_id = ObjectId(competition_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid competition ID")
    
    competition = await db.competitions.find_one({"_id": comp_id})
    
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if competition["admin_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only admin can update standings")
    
    update_data = {
        "standings": standings_data.standings,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if standings_data.matchday:
        update_data["current_matchday"] = standings_data.matchday
    
    await db.competitions.update_one(
        {"_id": comp_id},
        {"$set": update_data}
    )
    
    return {"message": "Standings updated successfully"}

# Wallet endpoints
@api_router.get("/wallet/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    """Get user's wallet balance"""
    return {"balance": current_user.wallet_balance}

@api_router.post("/wallet/topup")
async def topup_wallet(amount: float, current_user: User = Depends(get_current_user)):
    """Simulate wallet top-up"""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Update user balance
    new_balance = current_user.wallet_balance + amount
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create transaction record
    transaction = TransactionCreate(
        type="deposit",
        amount=amount,
        description=f"Wallet top-up of €{amount}",
        from_wallet="external",
        to_wallet="personal"
    )
    
    transaction_dict = transaction.dict()
    transaction_dict["_id"] = ObjectId()
    transaction_dict["user_id"] = current_user.id
    
    await db.transactions.insert_one(transaction_dict)
    
    return {"message": "Wallet topped up successfully", "new_balance": new_balance}

@api_router.post("/wallet/withdraw")
async def withdraw_from_wallet(amount: float, current_user: User = Depends(get_current_user)):
    """Simulate wallet withdrawal"""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if current_user.wallet_balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Update user balance
    new_balance = current_user.wallet_balance - amount
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create transaction record
    transaction = TransactionCreate(
        type="withdraw",
        amount=amount,
        description=f"Withdrawal of €{amount}",
        from_wallet="personal",
        to_wallet="external"
    )
    
    transaction_dict = transaction.dict()
    transaction_dict["_id"] = ObjectId()
    transaction_dict["user_id"] = current_user.id
    
    await db.transactions.insert_one(transaction_dict)
    
    return {"message": "Withdrawal successful", "new_balance": new_balance}

@api_router.post("/competitions/{competition_id}/pay")
async def pay_competition_fee(
    competition_id: str,
    amount: float,
    current_user: User = Depends(get_current_user)
):
    """Pay competition fee from personal wallet to competition wallet"""
    try:
        comp_id = ObjectId(competition_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid competition ID")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if current_user.wallet_balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    competition = await db.competitions.find_one({"_id": comp_id})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if current_user.id not in competition["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant in this competition")
    
    # Update user balance
    new_user_balance = current_user.wallet_balance - amount
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"wallet_balance": new_user_balance, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Update competition wallet
    new_comp_balance = competition["wallet_balance"] + amount
    await db.competitions.update_one(
        {"_id": comp_id},
        {"$set": {"wallet_balance": new_comp_balance, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create transaction record
    transaction = TransactionCreate(
        competition_id=comp_id,
        type="payment",
        amount=amount,
        description=f"Payment to {competition['name']}",
        from_wallet="personal",
        to_wallet="competition"
    )
    
    transaction_dict = transaction.dict()
    transaction_dict["_id"] = ObjectId()
    transaction_dict["user_id"] = current_user.id
    
    await db.transactions.insert_one(transaction_dict)
    
    return {
        "message": "Payment successful",
        "new_user_balance": new_user_balance,
        "new_competition_balance": new_comp_balance
    }

# Transaction endpoints
@api_router.get("/transactions")
async def get_transactions(current_user: User = Depends(get_current_user)):
    """Get user's transaction history"""
    transactions = await db.transactions.find({
        "user_id": current_user.id
    }).sort("created_at", -1).to_list(100)
    
    # Convert ObjectIds
    for trans in transactions:
        trans["_id"] = str(trans["_id"])
        trans["user_id"] = str(trans["user_id"])
        if trans.get("competition_id"):
            trans["competition_id"] = str(trans["competition_id"])
    
    return transactions

@api_router.get("/competitions/{competition_id}/transactions")
async def get_competition_transactions(
    competition_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get competition transaction history"""
    try:
        comp_id = ObjectId(competition_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid competition ID")
    
    competition = await db.competitions.find_one({"_id": comp_id})
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    if current_user.id not in competition["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant in this competition")
    
    transactions = await db.transactions.find({
        "competition_id": comp_id
    }).sort("created_at", -1).to_list(100)
    
    # Get user details for each transaction
    user_ids = list(set([trans["user_id"] for trans in transactions]))
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(100)
    user_map = {str(user["_id"]): user for user in users}
    
    # Convert ObjectIds and add user info
    for trans in transactions:
        trans["_id"] = str(trans["_id"])
        trans["user_id"] = str(trans["user_id"])
        trans["competition_id"] = str(trans["competition_id"])
        trans["user_name"] = user_map.get(trans["user_id"], {}).get("name", "Unknown")
    
    return transactions

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)