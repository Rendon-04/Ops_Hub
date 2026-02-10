import os
from typing import Dict, Any

import httpx
from urllib.parse import urlencode
from jose import jwt, jwk
from jose.utils import base64url_decode


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"


def build_google_auth_url() -> str:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise RuntimeError("GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI must be set")

    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    response = httpx.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
    response.raise_for_status()
    return response.json()


def _get_google_public_key(kid: str) -> Dict[str, Any]:
    response = httpx.get(GOOGLE_CERTS_URL, timeout=10)
    response.raise_for_status()
    keys = response.json().get("keys", [])
    for key in keys:
        if key.get("kid") == kid:
            return key
    raise ValueError("Unable to find matching Google public key")


def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID must be set")

    headers = jwt.get_unverified_header(id_token)
    kid = headers.get("kid")
    if not kid:
        raise ValueError("Missing kid in token header")

    key_data = _get_google_public_key(kid)
    public_key = jwk.construct(key_data)

    message, encoded_signature = id_token.rsplit(".", 1)
    decoded_signature = base64url_decode(encoded_signature.encode())
    if not public_key.verify(message.encode(), decoded_signature):
        raise ValueError("Invalid token signature")

    return jwt.decode(
        id_token,
        key=public_key,
        algorithms=[headers.get("alg", "RS256")],
        audience=client_id,
        options={"verify_at_hash": False},
    )
