# AAOP — Embstar M31-128M16 OpenWrt ath79 migration

This project migrates an Embstar M31-128M16 based device from OpenWrt 19.07
`ar71xx/generic` to current OpenWrt `ath79/generic`.

## Important real-hardware finding

The factory/running OpenWrt 19.07.4 system identifies itself as:

```text
board=OOLITE-V5-2-DEV
model=GainStrong Oolite V5.2-Dev
```

The actual 16 MiB SPI NOR layout is:

```text
0x000000  0x020000  u-boot
0x020000  0xfd0000  firmware
0xff0000  0x010000  art
```

The kernel reports TP-Link firmware partitions, so the ath79 image profile now
uses the historical Oolite-compatible TP-Link image ABI:

```text
Device template: tplink-16mlzma
TPLINK_HWID:     0x3C00010B
IMAGE_SIZE:      16192k
```

The device is still represented in ath79 as `embstar_m31`; only the boot/image
ABI remains compatible with the Oolite V5.2 family.

## Validation policy

Build both initramfs and sysupgrade images, but prefer initramfs/RAM boot for the
next hardware bring-up. Persistent flashing should follow only after the
corrected image layout and U-Boot boot path are verified.
