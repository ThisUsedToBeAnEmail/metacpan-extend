function show(hit) {
	var time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
	var hour = time[1] % 12 || 12;               // The prettyprinted hour.
	var period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
	var notification = new Notification(hour + time[2] + ' ' + period, {
		icon: 'images/meta-48.png',
		body: hit.main_module + ' v' + hit.version + ' (' + hit.author + ')'
	});
	notification.onclick = function () {
		window.open("https://metacpan.org/pod/" + hit.main_module);
	};
}

// Test for notification support.
if (window.Notification) {
	setInterval(function() {
		let recent = localStorage.recent ? JSON.parse(localStorage.recent) : {};
		_().ajax.post({
			params: {
				"query" : {
					"match": { "status" : "latest" }
				},
				sort: { date: 'desc' },
				size: 20
			},
			endpoint: 'release/_search',
			callback: function (res) {
				recent.results = res.hits.hits;
				var shw;
				if (!recent.notification) recent.notification = {};
				else shw = 1;
				res.hits.hits.forEach(function (hi) {
					hi = hi._source;
					if (recent.notification[hi.main_module + hi.version] === undefined) {
						recent.notification[hi.main_module + hi.version] = hi;
						if (1) {
							show(hi);
						}
					}
				});
				localStorage.recent = JSON.stringify(recent);
			},
			nospinner: 1,
		});
	}, 20000);
}
