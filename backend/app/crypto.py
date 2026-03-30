"""
Placeholder encryption utility for sensitive PII fields (pesel, passport_number).

Phase 2 will replace this with a real AWS KMS or HashiCorp Vault-backed implementation.
For now, the functions base64-encode/decode plaintext so that field contracts are
established and can be swapped without touching the rest of the codebase.

GDPR note:
    Fields protected by this module are classified as special-category PII under
    GDPR Art. 9 and Polish UODO (Ustawa o ochronie danych osobowych). All access
    to decrypted values should be logged via the audit_log table.

Usage:
    from app.crypto import encrypt_field, decrypt_field

    # Store to DB
    worker.pesel = encrypt_field(raw_pesel)

    # Read from DB
    raw_pesel = decrypt_field(worker.pesel)
"""

import base64


def encrypt_field(value: str | None) -> str | None:
    """Encode a sensitive string field before writing to the database.

    Placeholder implementation: base64-encodes the value.
    Replace with real KMS encryption call in Phase 2.

    Args:
        value: Plaintext PII string, or None.

    Returns:
        Base64-encoded string, or None if value is None.
    """
    if value is None:
        return None
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def decrypt_field(value: str | None) -> str | None:
    """Decode a sensitive string field after reading from the database.

    Placeholder implementation: base64-decodes the value.
    Replace with real KMS decryption call in Phase 2.

    Args:
        value: Base64-encoded PII string from the database, or None.

    Returns:
        Plaintext string, or None if value is None.
    """
    if value is None:
        return None
    return base64.b64decode(value.encode("ascii")).decode("utf-8")
