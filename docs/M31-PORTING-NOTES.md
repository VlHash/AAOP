# M31 porting baseline — revised after real ar71xx 19.07 inspection

## Confirmed running system

The original system reports:

```text
OpenWrt 19.07.4
target: ar71xx/generic
board: OOLITE-V5-2-DEV
model: GainStrong Oolite V5.2-Dev
SoC: Qualcomm Atheros QCA9533 ver 2 rev 0
SPI NOR: MX25L12805D, 16 MiB
```

This confirms that the M31-based device is using the historical Oolite V5.2-Dev
board support and TP-Link style firmware layout.

## Confirmed flash layout

Observed from `/proc/mtd`:

```text
mtd0  0x00020000  u-boot
mtd1  0x00183a40  kernel
mtd2  0x00e4c5c0  rootfs
mtd3  0x00b10000  rootfs_data
mtd4  0x00010000  art
mtd5  0x00fd0000  firmware
```

Therefore the physical SPI NOR layout is:

```text
0x000000 - 0x01ffff   u-boot      0x020000
0x020000 - 0xfeffff   firmware    0xfd0000
0xff0000 - 0xffffff   art         0x010000
```

The kernel log explicitly reports:

```text
5 tp-link partitions found on MTD device spi0.0
```

The ath79 DTS must therefore use a TP-Link firmware parser rather than the
previous `denx,uimage` layout.

## Image ABI

The M31 ath79 profile should inherit:

```make
$(Device/tplink-16mlzma)
```

with:

```text
IMAGE_SIZE   = 16192k
TPLINK_HWID  = 0x3C00010B
IMAGES       = sysupgrade.bin
```

The device identity remains `embstar_m31`, but the flash/image ABI is retained
from the Oolite V5.2 family.

## ART and calibration

The final 64 KiB ART partition remains confirmed at:

```text
0xff0000 - 0xffffff
```

Current calibration assumptions remain:

```text
ART + 0x0000  base MAC
ART + 0x0006  second Ethernet MAC
ART + 0x1000  QCA9531 WMAC calibration, 0x440 bytes
ART + 0x5000  QCA9887 calibration, 0x844 bytes
```

Initial QCA9887 MAC policy remains base MAC + 2.

## Network topology

The original OpenWrt configuration confirms:

```text
LAN: eth0.1
WAN: eth1
switch0 VLAN 1 ports: 1 2 3 4 0t
```

The current ath79 network defaults therefore remain:

```text
CPU/switch: eth0
LAN ports: 1,2,3,4
WAN: eth1
```

## Next validation

The corrected build should be generated with the TP-Link image profile and real
flash map. Prefer initramfs/RAM boot for the next hardware test.

Do not treat successful compilation alone as proof that persistent sysupgrade is
safe. Confirm U-Boot boot behavior and, when UART access becomes available,
capture the full boot log.
