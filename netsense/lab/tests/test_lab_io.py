from __future__ import annotations

import json
import os
import stat
import tempfile
import unittest
from pathlib import Path

from lab import _read_private_token, _write_json


class LabIoTest(unittest.TestCase):
    def test_json_artifacts_are_complete_and_owner_only(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "result.json"

            _write_json(path, {"passed": True})

            self.assertEqual(json.loads(path.read_text()), {"passed": True})
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_rejects_group_readable_token_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "token"
            path.write_text("secret", encoding="utf-8")
            os.chmod(path, 0o640)

            with self.assertRaisesRegex(ValueError, "owner-only"):
                _read_private_token(path)

    def test_rejects_token_symlinks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            token = Path(directory) / "token"
            link = Path(directory) / "link"
            token.write_text("secret", encoding="utf-8")
            os.chmod(token, 0o600)
            link.symlink_to(token)

            with self.assertRaisesRegex(ValueError, "non-symlink"):
                _read_private_token(link)


if __name__ == "__main__":
    unittest.main()
