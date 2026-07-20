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

return baseclass.extend({
	title: _('Air720SL Cellular'),

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

	handleReset: function() {
		if (!window.confirm(
			_('Reset the Air720SL modem? Cellular IPv4 and IPv6 will be interrupted while AT+CFUN=1,1 restarts the modem.')
		))
			return;

		return this.handleAction('reset');
	},

	render: function(data) {
		data = data || {};
		var disabled = data.busy ? '' : null;

		return E([
			E('table', { 'class': 'table' }, [
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
			]),
			E('div', { 'style': 'display:flex; gap:.5em; flex-wrap:wrap; margin-top:1em' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'disabled': disabled,
					'click': ui.createHandlerFn(this, 'handleRedial')
				}, _('Re-dial PPP')),
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'disabled': disabled,
					'click': ui.createHandlerFn(this, 'handleReconnect6')
				}, _('Reconnect IPv6')),
				E('button', {
					'class': 'cbi-button cbi-button-negative important',
					'disabled': disabled,
					'click': ui.createHandlerFn(this, 'handleReset')
				}, _('Reset Modem'))
			])
		]);
	}
});
