import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes:
    return hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()


def encrypt(plaintext: str) -> str:
    key = _get_key()
    nonce = os.urandom(12)
    aead = AESGCM(key)
    ciphertext = aead.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt(ciphertext: str) -> str:
    key = _get_key()
    raw = base64.b64decode(ciphertext)
    nonce = raw[:12]
    ct = raw[12:]
    aead = AESGCM(key)
    return aead.decrypt(nonce, ct, None).decode("utf-8")
