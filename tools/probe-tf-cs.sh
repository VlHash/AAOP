#!/bin/sh
# Collect TF/microSD SPI chip-select evidence from a running OpenWrt image.
# This script is read-only apart from mounting debugfs when it is not mounted.

set -u

section() {
	printf '\n===== %s =====\n' "$1"
}

section "board"
if command -v ubus >/dev/null 2>&1; then
	ubus call system board 2>/dev/null || true
fi
for f in /tmp/sysinfo/board_name /tmp/sysinfo/model /proc/cmdline; do
	[ -r "$f" ] && { printf '%s: ' "$f"; cat "$f"; echo; }
done

section "debugfs"
if [ ! -d /sys/kernel/debug/gpio ] && [ -d /sys/kernel/debug ]; then
	mount -t debugfs debugfs /sys/kernel/debug 2>/dev/null || true
fi
mount | grep -E 'debugfs|/sys/kernel/debug' || true

section "SPI devices"
found=0
for d in /sys/bus/spi/devices/spi*; do
	[ -e "$d" ] || continue
	found=1
	echo "[$d]"
	[ -r "$d/modalias" ] && { printf 'modalias: '; cat "$d/modalias"; }
	readlink -f "$d" 2>/dev/null || true
done
[ "$found" -eq 1 ] || echo "No /sys/bus/spi/devices/spi* entries found."

section "MMC hosts and block devices"
ls -la /sys/class/mmc_host 2>/dev/null || true
ls -la /dev/mmcblk* 2>/dev/null || true
if command -v block >/dev/null 2>&1; then
	block info 2>/dev/null || true
fi

section "GPIO ownership"
if [ -r /sys/kernel/debug/gpio ]; then
	cat /sys/kernel/debug/gpio
else
	echo "/sys/kernel/debug/gpio is unavailable."
fi

section "pinctrl / pinmux"
found=0
for f in /sys/kernel/debug/pinctrl/*/pinmux-pins /sys/kernel/debug/pinctrl/*/pins; do
	[ -r "$f" ] || continue
	found=1
	echo "--- $f"
	cat "$f"
done
[ "$found" -eq 1 ] || echo "No pinctrl debug files found (common on older ar71xx kernels)."

section "device-tree SPI/MMC nodes"
if [ -d /proc/device-tree ]; then
	find /proc/device-tree -maxdepth 6 \( -iname '*spi*' -o -iname '*mmc*' -o -iname '*sd*' \) -print 2>/dev/null || true
elif [ -d /sys/firmware/devicetree/base ]; then
	find /sys/firmware/devicetree/base -maxdepth 6 \( -iname '*spi*' -o -iname '*mmc*' -o -iname '*sd*' \) -print 2>/dev/null || true
else
	echo "No runtime device tree found; the production image may use legacy ar71xx board files."
fi

section "kernel log evidence"
dmesg 2>/dev/null | grep -Ei 'mmc|mmc_spi|spi[0-9]|sd[a-z]|gpio|card' || true

section "interpretation"
echo "1. Insert/remove the TF card while running: logread -f"
echo "2. A line such as spi0.1 identifies SPI chip-select INDEX 1; it does NOT prove GPIO1."
echo "3. /sys/kernel/debug/gpio may reveal a requested GPIO line labelled for spi/mmc/cs."
echo "4. If the production firmware never registers the TF slot, software cannot infer an unclaimed PCB CS trace; use the carrier schematic or continuity probing."
