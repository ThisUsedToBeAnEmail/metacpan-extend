(function (factory) {
	factory()
})(function (undefined) {
	var Terse = function (selector) {
		return new TerseCons(selector);
	},
	TerseCons = function (selector) {
		if (selector) this[0] = selector instanceof NodeList ? selector : selector instanceof Element ? [selector] : document.querySelectorAll(selector);
	},
	url = 'https://fastapi.metacpan.org/v1/';

	Terse.pro = TerseCons.prototype = {
		baseUrl: url,
		style: function (args) {
			this[0].forEach(function (e) {
				var key;
				for (key in args) {
					e.style[key] = args[key];
				}
			});
		},
		encodedStr: function (str, obj) {
			if (typeof str !== 'string') { obj = str; str = '' }
			for (param in obj) {
				if (str) str += "&";
				str += encodeURI(param + "=" + obj[param]);
			}
			return str;
		},
		equals: function(obj1, obj2) {
			var keyCount = 0,
			f = false;

			if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
			for (var a in obj1) {
				if (!obj2.hasOwnProperty(a)){ return false }

				if (typeof obj1[a] === 'object' && typeof obj2[a] === 'object'
					? !this.equals(obj1[a], obj2[a]) : obj1[a] !== obj2[a])
						{ return false; }

				++keyCount;
			}

			if (f) return false;

			for (var a in obj2) {
				if (obj1[a] !== undefined ) --keyCount;
				else return false;
			}

			return keyCount !== 0 ? false : true;
		},
		element: function () {
			return this[0][0];
		},
		formData: function (selector) {
			var form = typeof selector === 'string' ? _(selector).element() : selector;
			var data = {};
			for (var i = 0; i < form.elements.length; i++) {
				var field = form.elements[i];
				field.focus();
				field.blur();
				if ( field.name !== undefined && field.name !== '') {
					var val = (field.type == "radio" || field.type == "checkbox" ? (field.checked ? field.value !== '' ? field.value : true : '') : field.value);
					if ( val !== undefined && val !== '') data[field.name] = val;
				}
			};
			return data;
		},
		factory: function (name, obj) {
			Object.defineProperty(Terse.pro, name, {
				get: function() {
					Object.defineProperty(this, name, {
						value: new obj(this)
					});
					return this[name];
				},
				configurable: true,
				writeable: false,
			});
		}
	};

	window.Terse = window._ = Terse;
	return Terse;
});

(function () {
	var TerseAjax = function (terse) {
		this.terse = terse;
	}, lastRequest = {};

	TerseAjax.prototype = {
		get: function (options) {
			this.callAjax('GET', options);
			return this.agent;
		},
		post: function (options) {
			this.callAjax('POST', options);
			return this.agent;
		},
		searchFile: function (options) {
			options.endpoint = 'file/_search';
			options.params = {
				"query" : {
					"filtered" : {
						"query" : {
							"match_phrase" : {
								"pod.analyzed" : '(' + options.params.q + ')',
							}
						},
						"filter" : {
							"and" : [
								{ "term": {"maturity": "released"} },
								{ "term" : { "status" : "latest" } }
							]
						}
					}
				}
			};
			options.headers = { content_type: 'application/json' }; 
			this.callAjax('POST', options);
		},
		callAjax: function (method, options) {
			var currentRequestTime = Math.floor(Date.now() / 1000);

			if (lastRequest.params !== undefined && this.terse.equals(lastRequest.params, options.params) === true) {
				var timeSince = currentRequestTime - lastRequest.time;
				if (timeSince < 3) return true;
			}

			lastRequest.params = options.params;
			lastRequest.time = currentRequestTime;

			var xhttp = new XMLHttpRequest();
			if (! options.params) options.params = {};
			if (! options.errorTitle) options.errorTitle = 'unclassified error';
			
			// TODO handle browser offline

			var call = this.terse.baseUrl + options.endpoint + '?';

			if (method === 'GET') call += this.terse.encodedStr(options.params);

			var spinner = _('#spinner').element();
			
			xhttp.upload.addEventListener('progress', function (evt) {
				spinner.classList.remove('hide');
			}, false);
			
			// TODO handle errors better :)
			xhttp.onreadystatechange = function () {
				if (xhttp.readyState == 4) {
					console.log(xhttp.response);
					if (xhttp.status == 200) {
						spinner.classList.add('hide');
						var resposne;
						try {
							response = JSON.parse(xhttp.response);
							if (response.error) {
								console.warn(response.error);
								return;
							}
						} catch (e) {
							console.warn(e);
							return;
						}
						
						return options.callback( response, options );
					} else {
						console.warn('Ajax failed: ' + xhttp.status);
					}
				}
			}

			xhttp.open(method, call, true);
			xhttp.timeout = options.timeout || 10000;
			
			if (! options.headers ) options.headers = { Access_Control_Allow_Credentials: true, support_credentials: true };
			if (! options.headers.content_type ) options.headers.content_type = 'application/x-www-form-urlencoded';

			for (header in options.headers) {
				xhttp.setRequestHeader(
					header.replace('_', '-'),
					options.headers[header]
				);
			}

			xhttp.withCredentials = true;

			xhttp.ontimeout = function () {
				options.ontimeout 
					? options.ontimeout(options)
					: console.warn('Request Timed Out');
			}

			xhttp.send( method === 'POST' ? JSON.stringify(options.params) : '' );
		}
	};
	Terse.pro.factory('ajax', TerseAjax);
})();

// run some logic
(function () {
	console.log('yooooo');
	var imgURL = chrome.extension.getURL("images/metacpan-logo.png");
	_("#logo").style({backgroundImage:'url(' + imgURL + ')'});

	var render = function (hits) {
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

	window.addEventListener('submit', function (event) {
		event.preventDefault();
		var params = _().formData(event.target);
		_().ajax.searchFile({ 
			params: params, 
			callback: function (res) {
				// i have all this in oo Terse but lets not expose this to the world today :)
				// instead stringify
				var results = _('#results').element();
				var html = render(res.hits.hits);
				results.innerHTML = html;
			}
		});
	});

	_().ajax.post({
		params: {
			"query" : {
				"filtered" : {
					"filter" : {
						"and" : [
							{ "term": {"maturity": "released"} },
							{ "term" : { "status" : "latest" } },
							{ "exists" : { "field" : "documentation" } }
						]
					}
				}
			},
			sort: { date: 'desc' },
			size: 50
		},
		endpoint: 'file/_search',
		callback: function (res) {
				var recent = _('#recent').element();
				var html = render(res.hits.hits);
				recent.innerHTML = html;
		},
		nospinner: 1,
	});
})();
