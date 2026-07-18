#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

generic_mk = root / "target/linux/ath79/image/generic.mk"
network = root / "target/linux/ath79/generic/base-files/etc/board.d/02_network"
dts = root / "target/linux/ath79/dts/qca9531_embstar_m31.dts"

for required in (generic_mk, network, dts):
    if not required.exists():
        raise SystemExit(f"required OpenWrt file missing: {required}")

device_block = """define Device/embstar_m31
  $(Device/tplink-16mlzma)
  SOC := qca9531
  DEVICE_VENDOR := Embstar
  DEVICE_MODEL := M31
  DEVICE_VARIANT := 128M16
  DEVICE_PACKAGES := kmod-usb2 kmod-ath10k-ct-smallbuffers \\\n\tath10k-firmware-qca9887-ct
  IMAGE_SIZE := 16192k
  TPLINK_HWID := 0x3C00010B
  IMAGES := sysupgrade.bin
  SUPPORTED_DEVICES += oolite-v5.2 oolite-v5.2-dev
endef
TARGET_DEVICES += embstar_m31
"""

text = generic_mk.read_text(encoding="utf-8")
if "define Device/embstar_m31\n" not in text:
    if not text.endswith("\n"):
        text += "\n"
    text += "\n" + device_block
    generic_mk.write_text(text, encoding="utf-8")
    print("added Device/embstar_m31 to generic.mk")
else:
    start = text.index("define Device/embstar_m31\n")
    end_marker = "TARGET_DEVICES += embstar_m31"
    end = text.index(end_marker, start) + len(end_marker)
    text = text[:start] + device_block.rstrip() + text[end:]
    generic_mk.write_text(text, encoding="utf-8")
    print("updated Device/embstar_m31 in generic.mk")

network_block = """\tembstar,m31|\\
\tembstar,qca9531)
\t\tucidef_set_interface_wan "eth1"
\t\tucidef_add_switch "switch0" \\\n\t\t\t"0@eth0" "1:lan:4" "2:lan:3" "3:lan:2" "4:lan:1"
\t\t;;
"""

text = network.read_text(encoding="utf-8")
if "embstar,m31|\\" not in text:
    marker = "\tengenius,eap300-v2)"
    pos = text.find(marker)
    if pos >= 0:
        text = text[:pos] + network_block + text[pos:]
        network.write_text(text, encoding="utf-8")
        print("added Embstar M31 network defaults")
    else:
        print("WARNING: network insertion marker not found; skipping 02_network edit")
else:
    print("Embstar M31 network defaults already present")
