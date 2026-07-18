# AAOP LL-AR750S CI patch

This archive contains only files changed or added for the next productized
Cellu-AR750S build. Copy the contents into the root of the `VlHash/AAOP`
repository and commit them.

## What changes

- Keeps the actual OpenWrt build target at `ath79/generic`.
- Keeps the validated internal device ID `embstar_m31`.
- Keeps the validated Oolite-compatible TP-Link image ABI and flash layout.
- Changes the visible model to `LiteLumine Cellu-AR750S`.
- LuCI Overview displays `Target Platform: ath79/Embstar` using a UI-only
  override; `/etc/openwrt_release` and the real target stay `ath79/generic`.
- Default LAN becomes `192.168.165.1/24`.
- Both 2.4 GHz and 5 GHz APs are enabled with SSID `LL-AR750S`.
- Default Wi-Fi remains open because no product password policy was specified.
- Adds system/WLAN/WAN/LAN LED triggers.
- Uses `luci-light` rather than the full `luci` collection to reduce flash use.
- Includes LuCI firewall and package-manager pages.
- Adds Air720SL RNDIS/ECM drivers.
- Adds Air720SL USB serial/Option drivers, PPP fallback, picocom AT terminal,
  and helper scripts.

## Air720SL strategy

RNDIS is the primary connection path. When a USB interface driven by
`rndis_host` or `cdc_ether` appears, the hotplug script creates:

- network interface: `cellular`
- protocol: DHCP
- metric: 20
- firewall zone: existing `wan` zone

The physical Ethernet WAN therefore remains preferred while it is connected.
Change route metrics later if cellular should be primary.

PPP is intentionally a fallback and is not started automatically.

### AT terminal

If `/dev/ttyUSB*` is already present:

```sh
air720-at
```

Or specify the port:

```sh
air720-at /dev/ttyUSB2
```

If only RNDIS is present and there is no ttyUSB device:

```sh
air720-bind
```

`air720-bind` dynamically adds the detected USB VID/PID to the Linux `option`
USB-serial driver. This is manual because some Air720 firmware USB descriptor
layouts require an interface-specific kernel quirk/blacklist; automatically
binding every interface could conflict with RNDIS.

### PPP fallback

Optionally set APN and the confirmed MODEM port:

```sh
uci set air720.main.apn='cmnet'
uci set air720.main.ppp_port='/dev/ttyUSB3'
uci commit air720
air720-ppp start
```

Stop it with:

```sh
air720-ppp stop
```

For normal RNDIS operation, PPP is not required.

## ROM-size policy

This patch deliberately avoids:

- full `luci` collection
- `luci-app-attendedsysupgrade`
- `owut`
- `usbutils`

It includes `picocom` because a reliable AT terminal is useful during the
Air720SL bring-up. It can be removed later after the modem integration is
stable.

After a clean `sysupgrade -n`, check actual free overlay space:

```sh
df -h
apk list -I
du -sh /overlay/upper 2>/dev/null
```

## First test after flashing

1. Confirm LuCI model and UI-only target label.
2. Confirm LAN DHCP on `192.168.165.1`.
3. Confirm both radios advertise `LL-AR750S`.
4. Confirm LED triggers.
5. Attach Air720SL and run:

```sh
dmesg | tail -100
ip link
ls -l /dev/ttyUSB*
ubus call network.interface.cellular status
```

6. Test AT with `air720-at`.
7. Only test `air720-ppp` after the correct MODEM ttyUSB port is confirmed.
