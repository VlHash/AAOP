# M31 porting baseline

## Current first-pass layout

```text
0x000000  0x040000  u-boot
0x040000  0x010000  u-boot-env
0x050000  0xfa0000  firmware
0xff0000  0x010000  art
```

ART assumptions:

```text
+0x0000  base Ethernet MAC
+0x0006  second Ethernet MAC
+0x1000  QCA9531 WMAC calibration (0x440)
+0x5000  QCA9887 calibration (0x844)
```

Initial 5 GHz MAC policy: ART base + 2.

GPIO interpretation:

- GPIO17: JUMPSTART/WPS, active low.
- Dedicated RESET pin is not GPIO17.
- GPIO13: SYSTEM LED.
- GPIO12: 2.4 GHz WLAN LED.
- GPIO4: WAN LED.
- GPIO16/15/14/11: LAN LEDs.

Before persistent flashing, RAM/TFTP boot and verify `/proc/mtd`, U-Boot
recovery, Ethernet mapping, calibration data, USB and both radios.
