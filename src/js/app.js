require('bootstrap/dist/css/bootstrap.css');
window.jQuery = require('jquery'); // expose as jQuery for bootstrap
require('bootstrap');
require('angular');
require('angular-resource');
require('angular-awesome-slider/dist/angular-awesome-slider.js');

var nodes = angular.module('search', ['angularAwesomeSlider']);

nodes.controller('SearchController', ['$http', function ($http) {
    var self = this;

    var searchURL = "http://uatsolr1-vh.gbif.org:8983/solr/dev_occurrence/select?q=*:*&rows=15&start=0&wt=json" +
    //var searchURL = "http://uatsolr1-vh.gbif.org:8983/solr/uat_occurrence/select?q=*:*&rows=15&start=0&wt=json" +
        "&json.facet=" + encodeURI("{basisOfRecord:{type:terms,field:basis_of_record}}") +
        "&json.facet=" + encodeURI("{country:{type:terms, field:country}}");

    var occurrenceURL = "http://api.gbif-dev.org/v1/occurrence/";

    // the SOLR response
    self.response = {};

    // Call SOLR
    self.search = function () {
        // build the search URL
        var lng = self.filter.longitude.value.split(";");
        var lat = self.filter.latitude.value.split(";");
        var bor = self.filter.basisOfRecord === undefined ? '' : '&fq=basis_of_record:' + self.filter.basisOfRecord;
        var country = self.filter.country === undefined ? '' : '&fq=country:' + self.filter.country;
        var query =
              '&fq=latitude:[' + lat[0] + ' TO '  + lat[1]+ ']'
            + '&fq=longitude:[' + lng[0] + ' TO ' + lng[1]+ ']'
            + country + bor;
        console.log(query);
        $http(
            {method: 'JSONP',
                url: searchURL + query,
                params: {'json.wrf': 'JSON_CALLBACK'}
            })
            .success(function (response) {
                self.response = response;

                // load each GBIF count
                angular.forEach(response.response.docs, function (doc) {
                    $http.get(occurrenceURL + doc.key).success(function (data) {
                        doc.detail = data;
                    });
                });


            }).error(function () {
                console.log('Search failed!');
            });
    }

    // common styling for the range sliders
    self.range = {};
    self.range.css = {
        background: {"background-color": "silver"},
        before: {"background-color": "#337AB7"},
        default: {"background-color": "#337AB7"},
        after: {"background-color": "#337AB7"},
        pointer: {"background-color": "#337AB7"},
        range: {"background-color": "#337AB7"}
    };

    self.filter = {};
    self.filter.latitude = {
        value: "-46;45",
        from: -90,
        to: 90,
        step: 1,
        threshold: 1,
        limits: true,
        dimension: "°",
        callback: self.search,
        css: self.range.css
    }

    self.filter.longitude = {
        value: "-90;90",
        from: -180,
        to: 180,
        step: 1,
        threshold: 1,
        limits: true,
        dimension: "°",
        callback: self.search,
        css: self.range.css
    }

    self.format = function (source) {
        return source == '' ? "<value missing>" : source.replace("_", " ");
    }



    // call the function to populate the response
    self.search();
}]);
