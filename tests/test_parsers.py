#!/usr/bin/env python3
"""Fixture-based regression tests for the Droid forensic parsers.

Runs each analysis script against fixtures/sample-droid-log.log and asserts
that the known signals (429 storm, duplicate-key, max-depth crash) are detected.
"""
import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TOOLS = REPO / "tools"
FIXTURE = REPO / "fixtures" / "sample-droid-log.log"
CONSOLE = REPO / "fixtures" / "console.log"


class ParserTests(unittest.TestCase):
    def _run(self, script, *extra_args):
        cmd = [sys.executable, str(TOOLS / script),
               "--log", str(FIXTURE), *extra_args]
        # scripts that take --console-log
        if script == "analyze_errors.py":
            cmd += ["--console-log", str(CONSOLE)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0,
                         msg=f"{script} failed:\n{result.stderr}")
        return result.stdout

    def test_parse_sessions_detects_sessions(self):
        out_file = "/tmp/_test_sessies.md"
        out = self._run("parse_sessions.py", "--out", out_file)
        combined = out
        with open(out_file, encoding="utf-8", errors="replace") as f:
            combined += f.read()
        self.assertIn("session", combined.lower(), "expected session detection in output")
        self.assertIn("sess_", combined, "expected session IDs in output")

    def test_analyze_errors_finds_duplicate_key(self):
        out = self._run("analyze_errors.py", "--out", "/tmp/_test_timeline.md")
        combined = out
        with open("/tmp/_test_timeline.md", encoding="utf-8", errors="replace") as f:
            combined += f.read()
        self.assertIn("duplicate", combined.lower(),
                      "expected duplicate-key detection in output")

    def test_analyze_errors_finds_max_depth(self):
        out = self._run("analyze_errors.py", "--out", "/tmp/_test_timeline2.md")
        combined = out
        with open("/tmp/_test_timeline2.md", encoding="utf-8", errors="replace") as f:
            combined += f.read()
        self.assertIn("maximum update depth", combined.lower(),
                      "expected max-depth crash detection in output")

    def test_analyze_errors_finds_429(self):
        out = self._run("analyze_errors.py", "--out", "/tmp/_test_timeline3.md")
        combined = out
        with open("/tmp/_test_timeline3.md", encoding="utf-8", errors="replace") as f:
            combined += f.read()
        self.assertIn("429", combined, "expected HTTP 429 detection in output")

    def test_extract_mcp_network_runs(self):
        # writes to --out; also prints a summary
        out_file = "/tmp/_test_mcp.md"
        result = subprocess.run(
            [sys.executable, str(TOOLS / "extract_mcp_network.py"),
             "--log", str(FIXTURE), "--out", out_file],
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0,
                         msg=f"extract_mcp_network failed:\n{result.stderr}")


if __name__ == "__main__":
    unittest.main()
