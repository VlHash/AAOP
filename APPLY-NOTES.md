# AAOP Air720SL Hybrid CI Hardening v1

Validated runtime architecture:

- IPv4: Air720SL CID1 -> USB interface 03 -> native OpenWrt `proto ppp` -> `network.cellular`
- IPv6: Air720SL CID5 -> RNDIS/ECM -> `network.cellular6` (`dhcpv6`)
- LAN IPv6: odhcpd RA/DHCPv6/NDP relay

## Fixes included

1. `air720-ppp`
   - adds `prepare`
   - creates `network.cellular` even before tty enumeration
   - binds only validated USB interface 03
   - waits up to 60 seconds for the PPP tty
   - adds stale-lock recovery
   - makes legacy UCI deletes safe under `set -e`
   - adds `noipv6` so CID1 remains IPv4-only
   - leaves the interface present with `auto=0` when the modem is absent

2. `air720-rndis6`
   - makes optional UCI deletes idempotent under `set -e`
   - retains validated CID5 `IPV4V6` activation
   - retains RNDIS/ECM IPv6 and odhcpd relay configuration

3. Startup/recovery
   - init script calls `air720-ppp prepare` synchronously
   - first-boot defaults also prepare the native PPP interface
   - adds tty hotplug recovery for USB interface 03
   - decouples PPP recovery from RNDIS/CID5 recovery

4. CI hardening patch
   - includes the tty hotplug file in Air720-disabled stripping
   - forces mode 0755 on every Air720 runtime script after overlay injection
   - adds final rootfs executable gates
   - validates `noipv6`, `prepare`, and idempotent UCI delete fixes

## Apply

Copy the replacement files into the repository, then apply:

```bash
git apply .github/workflows/m31-ath79-port.yml.patch
```

After applying, keep the patch file outside the repository or delete it if you do not want it committed.

## Recommended final hardware regression after the CI build

1. Cold boot with Air720SL already connected.
2. Cold boot with Air720SL connected after OpenWrt has already booted.
3. `/etc/init.d/air720 restart`.
4. Physical modem USB reset/unplug-replug.
5. Confirm:
   - `cellular` returns `up=true`
   - `cellular6` returns `up=true`
   - IPv4 route is through `air720-cellular`
   - IPv6 route is through the RNDIS/ECM interface
   - a LAN client obtains a global IPv6 and reaches an IPv6-only destination
6. Verify no new `IPV6CP timeout` in PPP logs.
