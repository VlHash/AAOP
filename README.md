# AAOP — Embstar M31-128M16 OpenWrt ath79 migration

This overlay replaces the old Oolite/P3TERX controller with an Embstar
M31-128M16 migration lab targeting OpenWrt `v25.12.5`.

Key files:

- `.github/workflows/m31-ath79-port.yml`
- `port/config.seed`
- `port/apply-m31.py`
- `port/files/target/linux/ath79/dts/qca9531_embstar_m31.dts`
- `docs/UPLOAD-AND-RUN.md`
- `docs/OPENFRP-SETUP.md`
- `docs/M31-PORTING-NOTES.md`

The first run applies a deterministic overlay and exports a tested patch in the
`m31-port-state-*` artifact.

Compilation success is not permission to flash. Use initramfs/RAM boot first.
