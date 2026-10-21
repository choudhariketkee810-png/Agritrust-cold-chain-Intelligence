import os
import hashlib
import hmac
import base64
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

# Configuration
SECRET_KEY = os.environ.get("AGRITRUST_SECRET_KEY", "agritrust_ultra_secure_production_secret_key_2026_ftl_cold_chain")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security_bearer = HTTPBearer(auto_error=False)


# ====================================================================
# PASSWORD HASHING (PBKDF2-HMAC-SHA256 with dynamic salt)
# ====================================================================

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )
    # Format: salt_hex$hash_hex
    return f"{salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against salt$hash string."""
    try:
        if not hashed_password or '$' not in hashed_password:
            return False
        salt_hex, hash_hex = hashed_password.split('$', 1)
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt,
            100000
        )
        return hmac.compare_digest(key.hex(), hash_hex)
    except Exception:
        return False


# ====================================================================
# JWT TOKEN GENERATION & DECODING
# ====================================================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


# ====================================================================
# FASTAPI DEPENDENCIES FOR ROLE AUTHORIZATION (RBAC)
# ====================================================================

async def get_current_user_optional(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[Dict[str, Any]]:
    if not auth_header:
        return None
    try:
        token = auth_header.credentials
        payload = decode_access_token(token)
        return payload
    except Exception:
        return None


async def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    token = auth_header.credentials
    return decode_access_token(token)


def require_roles(allowed_roles: List[str]):
    """Enforces role-based authorization in FastAPI routes."""
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "").upper()
        # Admin always has elevated access across platform
        if user_role == "ADMIN" or user_role in [r.upper() for r in allowed_roles]:
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {', '.join(allowed_roles)}. Your role is '{user_role}'."
        )
    return role_checker
