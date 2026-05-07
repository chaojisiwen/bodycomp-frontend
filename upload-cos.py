#!/usr/bin/env python3
"""Upload dist/ to COS. Optionally refresh CDN via simple API call."""
import os
import sys
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = "AKIDkOuHSQBl9LJG3f8OTT3RefT6YosoYRCl"
SECRET_KEY = "Tp4A4mJhuwnV3QcdTAevzqQr8GE1lLk0"
BUCKET = "equilibrio-corporeo-v2-1418254508"
REGION = "ap-guangzhou"
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY)
client = CosS3Client(config)

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json; charset=utf-8",
    ".ico": "image/x-icon",
}

def upload_file(local_path, key):
    ext = os.path.splitext(local_path)[1].lower()
    ct = CONTENT_TYPES.get(ext, "application/octet-stream")
    try:
        with open(local_path, "rb") as f:
            client.put_object(Bucket=BUCKET, Body=f, Key=key, ContentType=ct, CacheControl="no-cache")
        return True
    except Exception as e:
        print(f"  ❌ {key}: {e}")
        return False

def main():
    if not os.path.isdir(DIST_DIR):
        print(f"❌ dist/ not found at {DIST_DIR}"); sys.exit(1)

    files = []
    for root, dirs, fnames in os.walk(DIST_DIR):
        for f in fnames:
            p = os.path.join(root, f)
            files.append((p, os.path.relpath(p, DIST_DIR)))

    print(f"📦 Uploading {len(files)} files to cos://{BUCKET} ...")
    ok = fail = 0
    for local_path, key in files:
        if upload_file(local_path, key):
            print(f"  ✅ {key}")
            ok += 1
        else:
            fail += 1

    print(f"\n✅ {ok} uploaded" + (f", ❌ {fail} failed" if fail else ""))
    if fail: sys.exit(1)

    print("\n✅ Done! 访问 https://v2.equilibrio-corporeo.space 查看")
    if "--refresh" in sys.argv:
        print("⚠️  CDN refresh not automated. 请手动操作：")
        print("   CDN 控制台 → 缓存刷新 → 输入 https://v2.equilibrio-corporeo.space/")

if __name__ == "__main__":
    main()
