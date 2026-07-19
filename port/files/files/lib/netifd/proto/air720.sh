#!/bin/sh

[ -n "$INCLUDE_ONLY" ] || {
	NOT_INCLUDED=1
	INCLUDE_ONLY=1

	. ../netifd-proto.sh
	. ./ppp.sh
	init_proto "$@"
}

proto_air720_init_config() {
	no_device=1
	available=1
	ppp_generic_init_config
	proto_config_add_string "device:device"
	proto_config_add_string "apn"
	proto_config_add_string "dialnumber"
	proto_config_add_int "delay"
}

proto_air720_setup() {
	local interface="$1"
	local device apn dialnumber delay connect

	json_get_var device device
	json_get_var apn apn
	json_get_var dialnumber dialnumber
	json_get_var delay delay

	device="$(readlink -f "$device" 2>/dev/null || true)"
	[ -n "$device" ] && [ -c "$device" ] || {
		proto_notify_error "$interface" NO_DEVICE
		proto_set_available "$interface" 0
		return 1
	}

	[ -n "$delay" ] && sleep "$delay"
	[ -n "$dialnumber" ] || dialnumber='*99#'

	# ppp_generic_setup consumes the local variable named "connect".
	# Air720 vendor guidance explicitly uses software flow control here, so
	# nocrtscts is intentional (generic OpenWrt proto 3g uses crtscts).
	connect="USE_APN='$apn' DIALNUMBER='$dialnumber' /usr/libexec/air720-chat-connect"

	ppp_generic_setup "$interface" \
		noaccomp \
		nopcomp \
		novj \
		nobsdcomp \
		noauth \
		set EXTENDPREFIX=1 \
		lock \
		nocrtscts \
		115200 "$device"
}

proto_air720_teardown() {
	ppp_generic_teardown "$@"
}

[ -z "$NOT_INCLUDED" ] || add_protocol air720
