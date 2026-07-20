'use strict';
'require baseclass';
'require rpc';
'require ui';

var callAir720Status = rpc.declare({
	object: 'air720',
	method: 'status'
});

var callAir720Action = rpc.declare({
	object: 'air720',
	method: 'action',
	params: [ 'action' ]
});

function statusText(up) {
	return up ? _('Connected') : _('Disconnected');
}

function signalProgress(data) {
	if (data.hardware_reset_required)
		return E('span', {}, _('Unavailable — AT control channel not responding'));

	if (data.signal_percent == null || data.signal_dbm == null)
		return E('span', {}, _('Unknown'));

	var percent = Math.max(0, Math.min(100, parseInt(data.signal_percent) || 0));
	var csq = (data.signal_csq != null) ? data.signal_csq : '?';
	var title = '%d%% / %d dBm / CSQ %s'.format(percent, data.signal_dbm, csq);

	return E('div', { 'style': 'display:flex; align-items:center; gap:.75em; max-width:32em' }, [
		E('div', {
			'class': 'cbi-progressbar',
			'title': title,
			'style': 'flex:1'
		}, E('div', { 'style': 'width:%d%%'.format(percent) })),
		E('span', { 'style': 'white-space:nowrap' },
			'%d%% (%d dBm, CSQ %s)'.format(percent, data.signal_dbm, csq))
	]);
}

function hardwareResetWarning() {
	return E('div', {
		'class': 'alert-message warning',
		'style': 'margin-bottom:1em'
	}, [
		E('strong', {}, _('Air720SL Hardware Reset Required')),
		E('br'),
		_('The modem AT control channel is not responding. Software reset is unavailable. Perform a hardware reset of the Air720SL module, then use "Check Again".')
	]);
}

return baseclass.extend({
	title: _('Cellular Panel'),

	load: function() {
		return L.resolveDefault(callAir720Status(), {});
	},

	handleAction: function(action) {
		return callAir720Action(action).then(function(res) {
			if (!res || res.accepted !== true) {
				L.ui.addNotification(null, E('p',
					(res && res.error) ? res.error : _('The Air720SL action was rejected.')));
				return;
			}

			L.ui.addNotification(null, E('p',
				_('Air720SL action accepted: %s').format(action)));
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message));
		});
	},

	handleRedial: function() {
		return this.handleAction('redial');
	},

	handleReconnect6: function() {
		return this.handleAction('reconnect6');
	},

	handleCheck: function() {
		return this.handleAction('check');
	},

	handleReset: function() {
		if (!window.confirm(
			_('Reset the Air720SL modem? Cellular IPv4 and IPv6 will be interrupted while restarts the modem.')
		))
			return;

		return this.handleAction('reset');
	},

	render: function(data) {
		data = data || {};

		var busy = data.busy ? '' : null;
		var softwareDisabled = (data.busy || data.hardware_reset_required) ? '' : null;
		var checkDisabled = data.busy ? '' : null;

		var body = [];

		if (data.hardware_reset_required)
			body.push(hardwareResetWarning());

		body.push(E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, _('Modem')),
				E('td', { 'class': 'td left' }, data.modem_present ? _('Present') : _('Not detected'))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, _('Signal')),
				E('td', { 'class': 'td left' }, signalProgress(data))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, _('IPv4 PPP')),
				E('td', { 'class': 'td left' },
					'%s%s'.format(statusText(data.ipv4_up),
						data.ipv4_address ? ' — ' + data.ipv4_address : ''))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, _('IPv6 RNDIS/ECM')),
				E('td', { 'class': 'td left' },
					'%s%s'.format(statusText(data.ipv6_up),
						data.ipv6_address ? ' — ' + data.ipv6_address : ''))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, _('Control state')),
				E('td', { 'class': 'td left' }, data.state || _('idle'))
			])
		]));

		if (data.hardware_reset_required) {
			body.push(E('div', { 'style': 'display:flex; gap:.5em; flex-wrap:wrap; margin-top:1em' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'disabled': checkDisabled,
					'click': ui.createHandlerFn(this, 'handleCheck')
				}, _('Check Again')),
				E('button', {
					'class': 'cbi-button',
					'disabled': '',
				}, _('Reset Modem'))
			]));
		}
		else {
			body.push(E('div', { 'style': 'display:flex; gap:.5em; flex-wrap:wrap; margin-top:1em' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'disabled': softwareDisabled,
					'click': ui.createHandlerFn(this, 'handleRedial')
				}, _('Re-dial PPP')),
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'disabled': softwareDisabled,
					'click': ui.createHandlerFn(this, 'handleReconnect6')
				}, _('Reconnect IPv6')),
				E('button', {
					'class': 'cbi-button cbi-button-negative important',
					'disabled': softwareDisabled,
					'click': ui.createHandlerFn(this, 'handleReset')
				}, _('Reset Modem'))
			]));
		}

		return E(body);
	}
});
