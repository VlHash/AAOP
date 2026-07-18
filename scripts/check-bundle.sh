#!/usr/bin/env bash
set -euo pipefail
required=(
  ".github/workflows/m31-ath79-port.yml"
  "port/config.seed"
  "port/apply-m31.py"
  "port/files/target/linux/ath79/dts/qca9531_embstar_m31.dts"
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }
done
python3 -m py_compile port/apply-m31.py
grep -q 'CONFIG_TARGET_ath79_generic_DEVICE_embstar_m31=y' port/config.seed
grep -q 'compatible = "embstar,m31"' port/files/target/linux/ath79/dts/qca9531_embstar_m31.dts
echo "bundle structure OK"
