# AAOP Air720SL + USB storage update

This bundle contains only files that should replace or be added in `VlHash/AAOP`.
It does not contain the whole repository and does not perform any Git push.

## Air720SL changes

The previous tree had the right userspace building blocks, but its primary
strategy was RNDIS and `air720-bind` used the `option1/new_id` sysfs interface.
That is insufficient for Air720S/SL PPP reliability because a dynamic USB ID
cannot carry the device-specific `option` driver flags.

The new Linux 6.12 patch adds Luat Air720S/SL `1286:4e3d` with:

- `RSVD(0) | RSVD(1)`: keep the `option` serial driver away from composite
  interfaces 0 and 1 used by the network function;
- `ZLP`: use USB zero-length packets on bulk OUT transfers, matching the old
  Luat `usb_wwan.c` workaround through the modern driver flag;
- `reset_resume = usb_wwan_resume`: restore serial operation after USB reset
  resume.

The default connection policy is now host-controlled PPP.  `air720-ppp` creates
and controls a netifd interface named `cellular` using the custom `proto air720`,
which deliberately uses `nocrtscts` as in the Luat PPP guidance.  The interface
is added to the existing `wan` firewall zone.

RNDIS/ECM remains available but is opt-in:

```sh
uci set air720.main.rndis_fallback='1'
uci commit air720
```

The RNDIS hotplug hook now checks the parent USB VID:PID and will not hijack
unrelated RNDIS/CDC Ethernet devices.

### Bring-up

```sh
air720-bind
air720-ports
```

Run `air720-ports` first. With the default composite layout, USB interface 02 is expected to be AT and interface 03 PPP; after interfaces 0/1 are reserved these are commonly `ttyUSB0` and `ttyUSB1`. Confirm the ports, then persist the PPP port and carrier APN:

```sh
uci set air720.main.ppp_port='/dev/ttyUSB1'
uci set air720.main.apn='YOUR_APN'
uci commit air720
air720-ppp start
```

Check status with:

```sh
air720-ppp status
logread -f
ip addr show air720-cellular
```

Stop the dial session through OpenWrt/netifd:

```sh
air720-ppp stop
```

The helper intentionally no longer writes to `option1/new_id` for this modem.

## EXT4, NTFS and USB storage

The image now selects:

- `kmod-usb-storage`
- `block-mount`
- `kmod-fs-ext4`
- `kmod-fs-ntfs3`

`/etc/config/fstab` enables anonymous and hotplug mounting.  Therefore a USB
mass-storage device should be detected and mounted by the OpenWrt block hotplug
path when the hardware exposes a usable USB host port (directly or through a
compatible powered hub).  The M31/Air720 hardware arrangement may physically
occupy the available USB host connection; the filesystem support remains in the
firmware even when no second storage device can be attached.

Useful checks:

```sh
dmesg | tail -100
block info
mount
ls -l /dev/sd*
```

`e2fsprogs` is deliberately not included to save flash; format EXT4 media on a
PC or install the tools later if free overlay space permits.

## CI changes

The workflow now validates:

1. the Air720 kernel patch is present before the build;
2. modem, PPP, EXT4, NTFS3, USB-storage and block-mount package selections are
   accepted by `make defconfig`;
3. the prepared Linux 6.12 source contains `1286:4e3d`, `RSVD(0)|RSVD(1)|ZLP`
   and `reset_resume` after `target/linux` compilation;
4. the final firmware manifest contains the required modem and storage packages;
5. the final rootfs contains the Air720 netifd protocol and hotplug/fstab files.

## Obsolete files to remove

The bundle also contains an updated `DELETE-OLD-FILES.txt`.  In particular,
remove the old `port/files/files/etc/ppp/peers/air720` and
`port/files/files/usr/libexec/air720-chat-disconnect`; the CI defensively removes
them from the OpenWrt overlay as well, so an older controller checkout cannot
accidentally keep the direct-`pppd` path in the firmware.
