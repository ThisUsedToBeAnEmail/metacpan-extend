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
			this.call('GET', options);
			return this.agent;
		},
		post: function (options) {
			this.call('POST', options);
			return this.agent;
		},
		recentUploads: function (options) {
			options.params = {
				"query" : {
					"match": { "status" : "latest" }
				},
				sort: { date: 'desc' },
				size: 20
			};
			options.endpoint = 'release/_search';
			this.call('POST', options);
		},
		searchFile: function (options) {
			if (options.params.q.match('::')) { // a bit niave but for now:)
				options.endpoint = '/search/web/v2';
				options.params = {
					"q" : '(' + options.params.q + ')',
				};
				this.call('GET', options);
			} else {
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
				this.call('POST', options);
			}
		},
		call: function (method, options) {
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


			var spinner = options.nospinner ? undefined : _('#spinner').element();
			if (spinner) xhttp.upload.addEventListener('progress', function (evt) {
				spinner.classList.remove('hide');
			}, false);

			// TODO handle errors better :)
			xhttp.onreadystatechange = function () {
				if (xhttp.readyState == 4) {
					if (xhttp.status == 200) {
						if (spinner) spinner.classList.add('hide');
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
