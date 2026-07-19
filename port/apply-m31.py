#!/usr/bin/env python3
from pathlib import Path
import os
import re
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

generic_mk = root / "target/linux/ath79/image/generic.mk"
network = root / "target/linux/ath79/generic/base-files/etc/board.d/02_network"
dts = root / "target/linux/ath79/dts/qca9531_embstar_m31.dts"

for required in (generic_mk, network, dts):
    if not required.exists():
        raise SystemExit(f"required OpenWrt file missing: {required}")

# TF/microSD support is always enabled.  GPIO1 is the current bring-up default,
# but the workflow can override it with TF_CS_GPIO after probing the production
# firmware / carrier PCB.  Keep this configurable because the M31 connector
# exposes SPI CLK/MOSI/MISO but no dedicated SPI CS pin.
tf_cs_raw = os.environ.get("TF_CS_GPIO", "1").strip()
if not re.fullmatch(r"(?:[0-9]|1[0-7])", tf_cs_raw):
    raise SystemExit(f"TF_CS_GPIO must be an integer from 0 to 17, got: {tf_cs_raw!r}")
tf_cs_gpio = int(tf_cs_raw)

dts_text = dts.read_text(encoding="utf-8")
pattern = r"cs-gpios = <0>, <&gpio \d+ GPIO_ACTIVE_LOW>;"
replacement = f"cs-gpios = <0>, <&gpio {tf_cs_gpio} GPIO_ACTIVE_LOW>;"
new_dts_text, count = re.subn(pattern, replacement, dts_text, count=1)
if count != 1:
    raise SystemExit("TF/microSD cs-gpios marker not found in M31 DTS")
if new_dts_text != dts_text:
    dts.write_text(new_dts_text, encoding="utf-8")
print(f"TF/microSD SPI chip-select configured on GPIO{tf_cs_gpio}")

# Keep the already validated internal Device ID and TP-Link/Oolite image ABI.
# Board-level storage support is part of DEVICE_PACKAGES so TF/microSD and USB
# mass-storage remain default even when the device is selected outside this CI
# workflow. Air720SL stays optional and is selected only by config.seed/workflow.
device_block = """define Device/embstar_m31
  $(Device/tplink-16mlzma)
  SOC := qca9531
  DEVICE_VENDOR := LiteLumine
  DEVICE_MODEL := Cellu-AR750S
  DEVICE_PACKAGES := kmod-usb2 \\
	kmod-mmc kmod-mmc-spi kmod-usb-storage block-mount \\
	kmod-fs-ext4 kmod-fs-vfat kmod-fs-ntfs3 \\
	kmod-ath10k-ct-smallbuffers ath10k-firmware-qca9887-ct
  IMAGE_SIZE := 16192k
  TPLINK_HWID := 0x3C00010B
  IMAGES := sysupgrade.bin
  SUPPORTED_DEVICES += embstar,m31 oolite-v5.2 oolite-v5.2-dev
endef
TARGET_DEVICES += embstar_m31
"""

text = generic_mk.read_text(encoding="utf-8")
if "define Device/embstar_m31\n" not in text:
    if not text.endswith("\n"):
        text += "\n"
    text += "\n" + device_block
else:
    start = text.index("define Device/embstar_m31\n")
    end_marker = "TARGET_DEVICES += embstar_m31"
    end = text.index(end_marker, start) + len(end_marker)
    text = text[:start] + device_block.rstrip() + text[end:]

generic_mk.write_text(text, encoding="utf-8")
print("Device/embstar_m31 profile installed/updated")

network_block = """\tembstar,m31|\\
\tembstar,qca9531)
\t\tucidef_set_interface_wan \"eth1\"
\t\tucidef_add_switch \"switch0\" \\
\t\t\t\"0@eth0\" \"1:lan:4\" \"2:lan:3\" \"3:lan:2\" \"4:lan:1\"
\t\t;;
"""

text = network.read_text(encoding="utf-8")
if "embstar,m31|\\" not in text:
    marker = "\tengenius,eap300-v2)"
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit("02_network insertion marker not found")
    text = text[:pos] + network_block + text[pos:]
    network.write_text(text, encoding="utf-8")
    print("M31 network defaults added")
else:
    print("M31 network defaults already present")
