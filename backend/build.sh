#!/usr/bin/env bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading clustered_data.csv from Google Drive..."
python3 - <<'PYEOF'
import os, sys, re, requests

file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clustered_data_slim.csv")

if os.path.exists(file_path) and os.path.getsize(file_path) > 10_000_000:
    print(f"CSV already exists ({os.path.getsize(file_path)} bytes), skipping download.")
    sys.exit(0)

FILE_ID = "1Q3QRFh4COicewZ462g6i9iAhdJBuB0am"
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

# Use the newer usercontent endpoint which bypasses the virus scan warning
download_url = f"https://drive.usercontent.google.com/download?id={FILE_ID}&export=download&authuser=0&confirm=t"
print(f"Downloading from: {download_url}")

resp = session.get(download_url, stream=True)
print(f"Status: {resp.status_code}, Content-Type: {resp.headers.get('content-type', '?')}")

with open(file_path, "wb") as f:
    downloaded = 0
    for chunk in resp.iter_content(chunk_size=1024*1024):
        if chunk:
            f.write(chunk)
            downloaded += len(chunk)
            if downloaded % (20*1024*1024) == 0:
                print(f"  Downloaded {downloaded // (1024*1024)} MB...", flush=True)

size = os.path.getsize(file_path)
print(f"Download complete. File size: {size} bytes ({size//(1024*1024)} MB)")

if size < 10_000_000:
    with open(file_path, "rb") as f:
        preview = f.read(300).decode("utf-8", errors="replace")
    print(f"File preview (first 300 chars):\n{preview}")
    print("ERROR: File too small — not a valid CSV!")
    os.remove(file_path)
    sys.exit(1)

print("CSV ready.")
PYEOF

echo "Build complete."
