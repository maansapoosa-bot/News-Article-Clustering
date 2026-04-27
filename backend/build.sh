#!/usr/bin/env bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading clustered_data.csv from Google Drive..."
python3 - <<'EOF'
import os, sys, requests

file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clustered_data.csv")

if os.path.exists(file_path) and os.path.getsize(file_path) > 1_000_000:
    print(f"CSV already exists ({os.path.getsize(file_path)} bytes), skipping download.")
    sys.exit(0)

session = requests.Session()
url = "https://drive.google.com/uc?export=download"

print("Fetching from Google Drive...")
response = session.get(url, params={"id": "1ofVz9-SmtWHskuYHzRpSaiOkwFvvBqGp"}, stream=True)

token = None
for key, value in response.cookies.items():
    if key.startswith("download_warning"):
        token = value
        break

if token:
    print(f"Got confirmation token, re-requesting...")
    response = session.get(url, params={"id": "1ofVz9-SmtWHskuYHzRpSaiOkwFvvBqGp", "confirm": token}, stream=True)

with open(file_path, "wb") as f:
    downloaded = 0
    for chunk in response.iter_content(chunk_size=1024*1024):
        if chunk:
            f.write(chunk)
            downloaded += len(chunk)
            print(f"  Downloaded {downloaded // (1024*1024)} MB...", flush=True)

size = os.path.getsize(file_path)
print(f"Download complete. File size: {size} bytes")

if size < 1_000_000:
    print("ERROR: File too small — likely an HTML error page, not CSV!")
    os.remove(file_path)
    sys.exit(1)

print("CSV ready.")
EOF

echo "Build complete."
