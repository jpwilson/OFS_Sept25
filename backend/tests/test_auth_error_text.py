"""
Auth failures return a generic message to the client and log neither the token
nor its claims.
    cd backend && .venv/bin/python -m unittest tests.test_auth_error_text -v
"""
import contextlib
import io
import unittest
import uuid
from unittest import mock

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings
from app.core import deps, supabase_auth

SECRET = "test-supabase-secret"


class AuthErrorTextTest(unittest.TestCase):
    def setUp(self):
        p = mock.patch.object(settings, "SUPABASE_JWT_SECRET", SECRET)
        p.start()
        self.addCleanup(p.stop)

    def run_quietly(self, fn, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), self.assertRaises(HTTPException) as ctx:
            fn(*args)
        return ctx.exception, out.getvalue()

    def test_get_current_user_bad_token(self):
        token = "not-a-jwt-token-value"
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        err, logs = self.run_quietly(deps.get_current_user, creds, mock.Mock())
        self.assertEqual(err.status_code, 401)
        self.assertEqual(err.detail, "Could not validate credentials")
        self.assertNotIn(token, logs)

    def test_get_current_user_unknown_user_does_not_log_the_id(self):
        sub = str(uuid.uuid4())
        token = jwt.encode({"sub": sub, "aud": "authenticated"}, SECRET, algorithm="HS256")
        db = mock.Mock()
        db.query.return_value.filter.return_value.first.return_value = None
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        err, logs = self.run_quietly(deps.get_current_user, creds, db)
        self.assertEqual(err.status_code, 401)
        self.assertNotIn(sub, logs)
        self.assertNotIn(token, logs)

    def test_validate_supabase_token_generic_message(self):
        expired = jwt.encode({"sub": "abc", "exp": 1}, SECRET, algorithm="HS256")
        err, logs = self.run_quietly(supabase_auth.validate_supabase_token, expired)
        self.assertEqual(err.status_code, 401)
        self.assertEqual(err.detail, "Invalid authentication token")
        self.assertNotIn(expired, logs)
        self.assertNotIn("abc", logs)


if __name__ == "__main__":
    unittest.main()
