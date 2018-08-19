(function () {
	var imgURL = chrome.extension.getURL("images/metacpan-logo.png");
	_("#logo").style({backgroundImage:'url(' + imgURL + ')'});
	
	var renderSearch = function (hits) {
		html = '';			
		hits.forEach(function (hit) {
			console.log(hit);
			hit = hit._source;
			html += '<div class="result">';
			html += '<h2><a href="https://metacpan.org/pod/' + hit.documentation + '">' + hit.documentation + '</a></h2>';
			html += '<p>' + (hit.description || hit.pod) + '</p>';
			html += '</div>';
		});
		return html;
	}

	var renderRecent = function (hits) {
		html = '';			
		hits.forEach(function (hit) {
			console.log(hit);
			hit = hit._source;
			html += '<div class="result">';
			html += '<h2><a href="https://metacpan.org/pod/' + hit.main_module + '">' + hit.main_module + '</a><span class="info">v' + hit.version + ' (' + hit.author + ')</span></h2>';
			html += '<p>' + (hit.abstract) + '</p>';
			html += '</div>';
		});
		return html;
	}

	window.addEventListener('click', function (event) {
		if (event.target.href) {
			event.preventDefault();
			chrome.tabs.create({ url: event.target.href });
		}
	});

	window.addEventListener('submit', function (event) {
		event.preventDefault();
		var params = _().formData(event.target);
		_().ajax.searchFile({ 
			params: params, 
			callback: function (res) {
				// i have all this in oo Terse but lets not expose this to the world today :)
				// instead stringify
				let results = _('#results').element();
				let html = renderSearch(res.hits !== undefined ? res.hits.hits : res.results.map(function (hit) { console.log(hit); return { _source: hit.hits[0] } }));
				results.innerHTML = html;
			}
		});
	});

	var data = JSON.parse(localStorage.recent);
	var recent = _('#recent').element();
	var html = renderRecent(data.results);
	recent.innerHTML = html;
})();
