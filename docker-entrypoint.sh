#!/bin/sh
set -eu

# Dokploy mounts SCREENSHOTS_DIR at runtime, after image-layer ownership has
# been applied. Repair both the mount point and existing root-owned screenshots
# so refreshing an older image can overwrite it.
if [ "$(id -u)" = "0" ]; then
    screenshots_dir="${SCREENSHOTS_DIR:-/app/.screenshots}"
    mkdir -p "$screenshots_dir"
    chown -R bun:bun "$screenshots_dir"

    exec gosu bun "$@"
fi

exec "$@"
