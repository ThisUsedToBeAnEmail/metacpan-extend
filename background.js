function show(hit) {
	let time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
	let hour = time[1] % 12 || 12;               // The prettyprinted hour.
	let period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
	let pre = hit.status === 'latest' ? 'RELEASED: ' : 'UPLOAD: ';
	let notification = new Notification(hour + time[2] + ' ' + period, {
		icon: 'images/meta-48.png',
		body: pre + hit.main_module + ' v' + hit.version + ' (' + hit.author + ')'
	});
	notification.onclick = function () {
		window.open("https://metacpan.org/pod/" + hit.main_module);
	};
}

// Test for notification support.
if (window.Notification) {
	setInterval(function() {
		let recent = localStorage.recent ? JSON.parse(localStorage.recent) : {};
		_().model.recentUploads({
			callback: function (res) {
				recent.results = res.hits.hits;
				let shw;
				if (!recent.notification) recent.notification = {}, recent.latest = {};
				else shw = 1;
				res.hits.hits.forEach(function (hi) {
					hi = hi._source;
					if (recent.notification[hi.main_module + hi.version] === undefined) {
						if (hi.status === 'latest') recent.notification[hi.main_module + hi.version] = 1;
						else if (recent.latest[hi.main_module + hi.version] !== undefined) return;
						else recent.latest[hi.main_module + hi.version] = 1;
						if (shw) {
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
