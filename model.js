(function () {
	var Model = function (terse) {
		this.terse = terse;
	}, lastRequest = {};

	Model.prototype = {
		recentUploads: function (options) {
			options.params = {
				"query" : {
					"match": { "status" : "latest" }
				},
				sort: { date: 'desc' },
				size: 20
			};
			options.endpoint = 'release/_search';
			this.terse.ajax.call('POST', options);
		},
		searchFile: function (options) {
			if (options.params.q.match('::')) { // a bit niave but for now:)
				options.endpoint = '/search/web/v2';
				options.params = {
					"q" : '(' + options.params.q + ')',
				};
				this.terse.ajax.call('GET', options);
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
				this.terse.ajax.call('POST', options);
			}
		},
	};
	Terse.pro.factory('model', Model);
})();
