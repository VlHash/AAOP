# AAOP Air720SL hybrid WAN firmware update

This bundle contains only files that should replace, be added, or be removed in
`VlHash/AAOP`. It does not contain the whole repository and does not perform any
Git push.

## Final validated Air720SL architecture

The modem is used as two independent WAN data paths:

```text
Air720SL 1286:4e3d
├─ USB interface 02 -> AT control (normally /dev/ttyUSB0)
├─ USB interface 03 -> PPP data   (normally /dev/ttyUSB1)
├─ USB interface 04 -> DIAG       (normally /dev/ttyUSB2)
└─ RNDIS/ECM USB network function -> IPv6 WAN

CID1 = IP
└─ OpenWrt native proto ppp
   └─ air720-cellular
      └─ IPv4 default route

CID5 = IPV4V6
└─ RNDIS/ECM network interface
   └─ cellular6
      └─ IPv6 default route
         └─ RA + DHCPv6 + NDP relay to LAN
```

The validated deployment therefore uses **PPP for IPv4 only** and
**RNDIS/ECM for IPv6 only**.

### Why PPP is IPv4-only

PPP IPv4 is stable when CID1 is configured as:

```text
AT+CGDCONT=1,"IP","3gnet"
ATD*99#
```

PPP IPv6 negotiation could establish IPv6CP and obtain a global IPv6 address,
but the data path was not reliable enough for the final firmware design.
`network.cellular.ipv6` is therefore forced to `0`.

PPP ownership is moved to OpenWrt's native `proto ppp`. The previous custom
`/lib/netifd/proto/air720.sh` is obsolete and must be removed. This gives LuCI a
normal PPP interface instead of `Unsupported protocol type`.

The helper `air720-ppp` now configures:

```text
network.cellular.proto=ppp
network.cellular.device=<Air720 USB interface 03 tty>
network.cellular.pppname=air720-cellular
network.cellular.ipv6=0
network.cellular.connect=/usr/libexec/air720-chat-connect
```

The existing chat script remains responsible for CID1 and `ATD*99#`; netifd
owns the `pppd` process and interface lifecycle.

## RNDIS/ECM IPv6 path

The USB network bearer uses CID5. Module resets or fresh sessions may lose the
CID5 definition, so the firmware restores it automatically:

```text
AT+CGDCONT=5,"IPV4V6","3gnet"
AT+CGACT=1,5
```

`air720-rndis6` finds the Air720 AT port by USB interface number 02, finds the
RNDIS/ECM netdev by parent VID:PID `1286:4e3d`, activates CID5, and creates the
`cellular6` DHCPv6 interface.

The RNDIS/ECM interface is intentionally **not** configured as a DHCPv4 WAN, so
IPv4 cannot steal the default route from PPP.

The script applies these IPv6 receive settings to the detected USB netdev:

```text
accept_ra=2
autoconf=1
accept_ra_pinfo=1
addr_gen_mode=0
```

`accept_ra=2` is important because OpenWrt is forwarding IPv6 while still
needing to accept the upstream Air720 Router Advertisement.

Both `cellular` and `cellular6` are added to the existing `wan` firewall zone.
During bring-up, leaving the RNDIS interface outside the WAN zone caused RA/NA
to be visible in tcpdump while the kernel failed SLAAC/NDP processing.

## LAN IPv6

The carrier bearer exposes an on-link `/64`, but no usable DHCPv6-PD was
observed. The final LAN design therefore uses odhcpd relay mode:

```text
LAN:
  ra      = relay
  dhcpv6  = relay
  ndp     = relay

cellular6 (master):
  ra      = relay
  dhcpv6  = relay
  ndp     = relay
```

`network.lan.ip6assign` is removed while this relay mode is active. LAN clients
receive addresses from the same upstream `/64`, and NDP is relayed between LAN
and the Air720 RNDIS/ECM side.

This configuration was validated with LAN clients successfully accessing
IPv6-only/IPv6-capable websites.

## Boot integration

The new `/etc/init.d/air720` service supports:

- `hybrid` (default): native PPP IPv4 + RNDIS/ECM IPv6;
- `ppp`: PPP IPv4 only;
- `rndis6`: RNDIS/ECM IPv6 only;
- `disabled`/`off`/`0`: no automatic Air720 setup.

`/etc/uci-defaults/99-air720` enables and starts the service on first boot.
The network hotplug hook independently re-runs the IPv6 setup when a matching
Air720 RNDIS/ECM interface appears, which also covers USB re-enumeration.

## Kernel patch

The Linux 6.12 patch keeps the validated Air720S/SL `option` driver handling for
USB ID `1286:4e3d`:

- `RSVD(0) | RSVD(1)` keeps serial binding away from network interfaces 0/1;
- `ZLP` enables the required USB bulk OUT zero-length-packet behavior;
- `reset_resume = usb_wwan_resume` restores serial operation after reset/resume.

Do not replace this with a runtime `option1/new_id` workaround; the dynamic ID
cannot carry the required device-specific driver flags.

## CI Air720SL switch

The workflow now exposes:

```text
enable_air720sl: true | false
```

Default: `true`.

When `true`, CI:

1. injects the Air720SL userspace overlay and Linux pending patch;
2. selects and validates RNDIS/CDC-Ether, USB serial option, PPP, chat, picocom,
   LuCI PPP protocol support, and odhcpd IPv6 relay support;
3. validates the patched Linux `option.c` after target compilation;
4. validates the final rootfs contains native-PPP/hybrid integration files and
   does **not** contain the old custom `proto air720` implementation.

When `false`, CI removes all Air720SL-specific overlay files and the kernel
pending patch before building, and removes the Air720SL-specific package
selections from the temporary `.config`. M31 board migration and USB storage
support remain enabled.

## USB storage

Storage support remains independent of the Air720SL workflow switch:

- `kmod-usb-storage`
- `block-mount`
- `kmod-fs-ext4`
- `kmod-fs-ntfs3`

## Useful runtime checks

```sh
air720-ports
uci show network.cellular
uci show network.cellular6
ubus call network.interface.cellular status
ubus call network.interface.cellular6 status
ip -4 route show
ip -6 route show
ip -6 addr show dev "$(uci -q get air720.main.rndis_device)"
```

Expected routing policy:

```text
0.0.0.0/0 -> air720-cellular (PPP/CID1)
::/0      -> Air720 RNDIS/ECM netdev (CID5)
```

## Obsolete files to remove

See `DELETE-OLD-FILES.txt`. In particular, remove:

```text
port/files/files/lib/netifd/proto/air720.sh
port/files/files/etc/ppp/peers/air720
port/files/files/usr/libexec/air720-chat-disconnect
```
