#!/usr/bin/env python3
"""Serve Clara's Stories from origin/main or the current workspace."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tarfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


PROJECT = Path("/Users/marcusc/Documents/codex/Clara's Stories")
STAGE = Path("/tmp/codex-clara-live-preview")
ARCHIVE = Path("/tmp/codex-clara-live-preview.tar")
BASE_PATH = "/Clara-sStories"
EXPECTED_REMOTE = "marcusc9/Clara-sStories.git"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve Clara's Stories for local annotation."
    )
    parser.add_argument(
        "--source",
        choices=("live", "workspace"),
        default="live",
        help="Serve origin/main (live) or the current workspace.",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3002)
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="Use the locally known origin/main without fetching.",
    )
    return parser.parse_args()


def git(*args: str, capture: bool = False) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=PROJECT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return result.stdout.strip() if capture else ""


def validate_project() -> None:
    if not (PROJECT / ".git").is_dir() or not (PROJECT / "index.html").is_file():
        raise RuntimeError(f"Clara's Stories project not found at {PROJECT}")
    remote = git("remote", "get-url", "origin", capture=True)
    if EXPECTED_REMOTE not in remote:
        raise RuntimeError(f"Unexpected origin remote: {remote}")


def reset_stage() -> None:
    if STAGE.is_symlink():
        STAGE.unlink()
    elif STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)
    ARCHIVE.unlink(missing_ok=True)


def export_live(skip_fetch: bool) -> tuple[Path, str]:
    if not skip_fetch:
        git("fetch", "--prune", "origin", "main")
    commit = git("rev-parse", "origin/main", capture=True)
    reset_stage()
    git("archive", "--format=tar", f"--output={ARCHIVE}", "origin/main")
    try:
        with tarfile.open(ARCHIVE) as archive:
            archive.extractall(STAGE)
    finally:
        ARCHIVE.unlink(missing_ok=True)
    return STAGE, f"origin/main @ {commit[:12]}"


def make_handler(source: Path):
    root = source.resolve()

    class PagesHandler(SimpleHTTPRequestHandler):
        def translate_path(self, path: str) -> str:
            request_path = unquote(urlsplit(path).path)
            if request_path == BASE_PATH:
                request_path = "/"
            elif request_path.startswith(BASE_PATH + "/"):
                request_path = request_path[len(BASE_PATH) :]

            parts = [
                part
                for part in request_path.split("/")
                if part not in ("", ".", "..") and not part.startswith(".")
            ]
            candidate = root.joinpath(*parts).resolve()
            if candidate != root and root not in candidate.parents:
                return str(root / "__not_found__")
            return str(candidate)

        def send_head(self):
            if urlsplit(self.path).path == "/":
                self.send_response(302)
                self.send_header("Location", BASE_PATH + "/")
                self.end_headers()
                return None
            return super().send_head()

        def end_headers(self) -> None:
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

    return PagesHandler


def main() -> int:
    args = parse_args()
    validate_project()

    if args.source == "live":
        source, label = export_live(args.skip_fetch)
    else:
        source, label = PROJECT, "workspace (may include uncommitted changes)"

    if not (source / "stories.html").is_file():
        raise RuntimeError(f"stories.html is missing from {source}")

    url = f"http://{args.host}:{args.port}{BASE_PATH}/stories.html"
    server = ThreadingHTTPServer((args.host, args.port), make_handler(source))
    print(f"Serving Clara preview at {url}", flush=True)
    print(f"Source: {label}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Clara preview", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError, tarfile.TarError) as error:
        print(f"Clara preview error: {error}", file=sys.stderr)
        raise SystemExit(1)
