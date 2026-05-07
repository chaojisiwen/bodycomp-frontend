#!/usr/bin/env python3
"""
bodycomp-frontend COS 上传脚本 (Python SDK 版)
替代损坏的 coscli，零外部二进制依赖。

用法:
  python3 publish-cos.py              # 只上传 dist/ 到 COS
  python3 publish-cos.py --refresh    # 上传后刷新 CDN 缓存

前提:
  pip3 install cos-python-sdk-v5
"""

import os
import sys
import mimetypes
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client

# ============================================================
# 配置
# ============================================================
SECRET_ID = "AKIDeDdqtmHfu44wjT3Slx21rbL0Vp0yjKmX"
SECRET_KEY = "ugG3sW4nOq8kLzVLDybapCmsoY6RbaMw"
REGION = "ap-guangzhou"
BUCKET = "equilibrio-corporeo-v2-1418254508"

SCRIPT_DIR = Path(__file__).resolve().parent
DIST_DIR = SCRIPT_DIR / "dist"

# ============================================================
# COS 客户端
# ============================================================
config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY)
client = CosS3Client(config)

# ============================================================
# MIME 类型映射
# ============================================================
mimetypes.init()
EXTRA_MIME = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


def get_content_type(filepath):
    """获取文件的 Content-Type"""
    ext = filepath.suffix.lower()
    if ext in EXTRA_MIME:
        return EXTRA_MIME[ext]
    mime, _ = mimetypes.guess_type(str(filepath))
    return mime or "application/octet-stream"


def get_cache_control(filepath):
    """根据文件类型设置缓存策略"""
    ext = filepath.suffix.lower()
    # HTML 不缓存（SPA 入口），静态资源长缓存（带 hash）
    if ext == ".html":
        return "no-cache"
    return "max-age=31536000"


def upload_file(local_path, cos_key):
    """上传单个文件到 COS"""
    content_type = get_content_type(local_path)
    cache_control = get_cache_control(local_path)

    try:
        client.put_object_from_local_file(
            Bucket=BUCKET,
            LocalFilePath=str(local_path),
            Key=cos_key,
            ContentType=content_type,
            CacheControl=cache_control,
        )
        return True, None
    except Exception as e:
        return False, str(e)


def main():
    refresh_cdn = "--refresh" in sys.argv

    if not DIST_DIR.exists():
        print("❌ dist/ 目录不存在，请先执行 npm run build")
        sys.exit(1)

    # 收集所有文件
    files = []
    for root, _, filenames in os.walk(DIST_DIR):
        for fname in filenames:
            local_path = Path(root) / fname
            rel_path = local_path.relative_to(DIST_DIR)
            # 统一使用 / 作为路径分隔符（COS key 格式）
            cos_key = str(rel_path).replace("\\", "/")
            files.append((local_path, cos_key))

    print(f"📦 准备上传 {len(files)} 个文件到 COS...")
    print(f"   桶: {BUCKET}")
    print(f"   区域: {REGION}")
    print()

    success_count = 0
    fail_count = 0

    for local_path, cos_key in files:
        ok, err = upload_file(local_path, cos_key)
        status = "✅" if ok else "❌"
        print(f"  {status} {cos_key}")

        if ok:
            success_count += 1
        else:
            fail_count += 1
            print(f"      错误: {err}")

    print()
    print(f"📊 上传完成: {success_count} 成功, {fail_count} 失败")

    if fail_count > 0:
        print("⚠️  部分文件上传失败，请检查网络或凭证")
        sys.exit(1)

    # 刷新 CDN
    if refresh_cdn:
        print()
        print("🔄 刷新 CDN 缓存...")
        try:
            from tencentcloud.common import credential
            from tencentcloud.cdn.v20180606 import cdn_client, models

            cred = credential.Credential(SECRET_ID, SECRET_KEY)
            cdn = cdn_client.CdnClient(cred, "")
            req = models.PurgeUrlsCacheRequest()
            req.Urls = ["https://v2.equilibrio-corporeo.space/"]
            cdn.PurgeUrlsCache(req)
            print("✅ CDN 刷新已提交（约 5 分钟生效）")
        except ImportError:
            print("⚠️  tencentcloud-sdk-python 未安装，跳过 CDN 刷新")
            print("   安装: pip3 install tencentcloud-sdk-python")
        except Exception as e:
            print(f"⚠️  CDN 刷新失败: {e}")
    else:
        print("ℹ️  跳过 CDN 刷新（使用 --refresh 参数可刷新）")

    print()
    print("=" * 50)
    print(" ✅ 发布完成！")
    print(" 访问: https://v2.equilibrio-corporeo.space")
    print("=" * 50)


if __name__ == "__main__":
    main()
