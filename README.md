# AAOP — Embstar M31-128M16 OpenWrt ath79 migration

This project migrates an Embstar M31-128M16 based device from OpenWrt 19.07
`ar71xx/generic` to current OpenWrt `ath79/generic`.

The current product identity is kept as:

```text
Device ID:  embstar_m31
DTS:        qca9531_embstar_m31.dts
Model:      LiteLumine Cellu-AR750S
```

## Confirmed flash / image ABI

The factory/running OpenWrt 19.07.4 system identifies the historical board as:

```text
board=OOLITE-V5-2-DEV
model=GainStrong Oolite V5.2-Dev
```

The verified 16 MiB SPI NOR layout is:

```text
0x000000  0x020000  u-boot
0x020000  0xfd0000  firmware
0xff0000  0x010000  art
```

The ath79 profile therefore keeps the historical Oolite-compatible TP-Link image ABI:

```text
Device template: tplink-16mlzma
TPLINK_HWID:     0x3C00010B
IMAGE_SIZE:      16192k
```

The device remains `embstar_m31`; only the boot/image ABI is inherited from the
Oolite V5.2 family.

## Firmware profiles

The GitHub Actions workflow exposes a `firmware_profile` choice and defaults to
`production`.

| Profile | Purpose | ROM difference |
| --- | --- | --- |
| `production` | Factory/production bring-up and manufacturing diagnostics | Keeps `luci-app-package-manager` and `picocom` |
| `normal` | Normal daily-use image | Keeps `luci-app-package-manager`; removes `picocom` |

Both profiles keep the actual runtime hardware features requested for this
board. `luci-app-package-manager` is also left untouched in both profiles.
In particular, neither profile removes USB storage, NTFS3, TF card support or
block hotplug. The only current ROM difference is `picocom`: it stays in the
factory/production image for serial and AT diagnostics and is omitted from the
normal daily-use image.

The following storage stack is present in both profiles, and the board-level
`DEVICE_PACKAGES` also carries the TF/USB storage drivers so this remains the
default when `embstar_m31` is selected outside the provided workflow:

```text
kmod-usb-storage
block-mount
kmod-fs-ext4
kmod-fs-vfat
kmod-fs-ntfs3
kmod-mmc
kmod-mmc-spi
```

`/etc/config/fstab` enables anonymous and automatic mounting, so both USB mass
storage and TF/microSD block devices use OpenWrt's standard block hotplug path.

Air720SL remains a separate workflow switch: `enable_air720sl=true|false`.
Turning it off removes the modem-specific PPP/RNDIS/USB-serial packages and
userspace files, but does **not** remove USB mass-storage or TF support.

## TF / microSD support is enabled by default

TF/microSD is compiled into both `production` and `normal` profiles. The DTS
adds an `mmc-spi-slot` on SPI CS1 while the onboard NOR remains on CS0.

The current bring-up mapping is:

```text
SPI CS0       -> onboard SPI NOR
GPIO<n>       -> TF / microSD software chip select
SPI CLK       -> QCA9531 SPI clock
SPI MOSI      -> QCA9531 SPI MOSI
SPI MISO      -> QCA9531 SPI MISO
```

The workflow has a `tf_cs_gpio` input. Its provisional default is `1`, and
`port/apply-m31.py` rewrites the DTS `cs-gpios` entry at build time. This means
that once the real carrier wiring is identified, the CS GPIO can be changed
from the Actions UI without editing the DTS again.

Because no dedicated card-detect GPIO has been confirmed, the slot uses
`broken-cd`; the MMC layer polls for card insertion/removal. When an `mmcblk*`
device appears or disappears, `block-mount` handles the normal hotplug
mount/unmount flow.

### Why the TF CS GPIO still needs verification

The M31 module specification exposes the SPI data/clock pins but does not list a
dedicated SPI chip-select pin on the 60-pin connector. Therefore the carrier
board must provide the TF CS using one of the available GPIOs or another board-
specific arrangement. `GPIO1` is only the current free-GPIO bring-up default;
it is not yet a confirmed PCB fact.

### Probe the running production firmware

A helper is included in this repository:

```text
tools/probe-tf-cs.sh
```

Copy it to the currently running production firmware and run:

```sh
chmod +x /tmp/probe-tf-cs.sh
/tmp/probe-tf-cs.sh > /tmp/tf-probe.txt 2>&1
cat /tmp/tf-probe.txt
```

For a quick manual inspection, the most useful commands are:

```sh
mount -t debugfs debugfs /sys/kernel/debug 2>/dev/null || true

ubus call system board
cat /sys/kernel/debug/gpio 2>/dev/null

for f in /sys/kernel/debug/pinctrl/*/pinmux-pins; do
    [ -r "$f" ] && { echo "--- $f"; cat "$f"; }
done

ls -l /sys/bus/spi/devices 2>/dev/null
ls -l /sys/class/mmc_host 2>/dev/null
block info 2>/dev/null

dmesg | grep -Ei 'mmc|mmc_spi|spi|gpio|card'
```

Then run `logread -f` while inserting and removing the TF card.

Important: a device named `spi0.1` means **SPI chip-select index 1**. It does
not by itself mean **GPIO1**. The GPIO number is best obtained from
`/sys/kernel/debug/gpio`, pinctrl debug output, the vendor board definition, or
the carrier schematic. If the production firmware never registers the TF slot,
runtime software cannot reliably infer an otherwise unclaimed PCB CS trace; in
that case continuity probing or the carrier schematic is required.

After the GPIO is confirmed, set `tf_cs_gpio` to that number in Actions. The
workflow accepts GPIO `0` through `17`.

## USB storage and hotplug

USB mass-storage is intentionally kept in both firmware profiles:

```text
kmod-usb-storage
kmod-fs-ext4
kmod-fs-vfat
kmod-fs-ntfs3
block-mount
```

The expected test sequence is:

```sh
logread -f
# insert USB disk
block info
mount
# remove USB disk and confirm the hotplug path cleans it up
```

The M31 module has one USB 2.0 interface, so the physical topology matters when
Air720SL and a USB storage device must be attached at the same time. A suitable
USB hub/power arrangement may be required by the carrier design.

## Air720SL

The default CI build still enables Air720SL integration. The intended split is:

- native OpenWrt PPP for IPv4;
- RNDIS/ECM bearer for IPv6;
- `odhcpd-ipv6only` relay mode for LAN IPv6 where the carrier provides an
  on-link `/64` without DHCPv6-PD.

Set `enable_air720sl=false` to build without the modem integration. Storage
support is independent and remains enabled.

## CI validation

`.github/workflows/m31-ath79-port.yml` now validates:

1. the selected `firmware_profile`;
2. the workflow-selected `tf_cs_gpio` value and generated DTS;
3. `mmc-spi-slot` plus `broken-cd` for TF polling/hotplug;
4. USB mass-storage, EXT4, VFAT, NTFS3 and `block-mount` in both profiles;
5. `luci-app-package-manager` remains present in both profiles;
6. production images contain `picocom`, while normal images omit it;
7. optional Air720SL packages and kernel patch only when the modem switch is on.

Artifacts include the firmware profile in their names so production and normal
builds are easy to distinguish.

## Validation policy

Build both initramfs and sysupgrade images, but prefer initramfs/RAM boot for
hardware bring-up. Persistent flashing should follow only after the corrected
flash layout, U-Boot boot path, Ethernet mapping, both radios, USB/Air720SL and
TF-card SPI wiring have been verified on the physical board.
