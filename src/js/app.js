require('bootstrap/dist/css/bootstrap.css');
window.jQuery = require('jquery'); // expose as jQuery for bootstrap
require('bootstrap');
require('angular');
require('angular-resource');
require('angular-awesome-slider/dist/angular-awesome-slider.js');

var nodes = angular.module('search', ['angularAwesomeSlider']);

nodes.controller('SearchController', ['$http', function ($http) {
    var self = this;

    var occurrenceURL = "http://api.gbif-dev.org/v1/occurrence/";
    //var occurrenceURL = "http://api.gbif-uat.org/v1/occurrence/";
    var baseURL = 'http://uatsolr1-vh.gbif.org:8983/solr/dev_occurrence/select';
    //var baseURL = 'http://uatsolr1-vh.gbif.org:8983/solr/uat_occurrence/select';

    var searchURL = baseURL + '?rows=15&start=0&wt=json' +
        "&json.facet=" + encodeURI("{basisOfRecord:{type:terms,field:basis_of_record}}") +
        "&json.facet=" + encodeURI("{country:{type:terms, field:country}}");
    var chartURL = baseURL + '?rows=0&wt=json' +
        "&json.facet=" + encodeURI("{year:{type:terms,field:year,limit:1000,sort:{index:desc}}}");
    var speciesURL = baseURL + '?rows=0&wt=json';
    var speciesOffset=0;  // for paging


    // the SOLR response
    self.searchLock = true;
    self.response = {};

    self.chartResponse = {};
    self.speciesNames = [{val:'test', count:1}];


    // Call SOLR
    self.search = function () {
        self.searchLock = true;

        // reset the species facet
        self.speciesNames.length=0;
        speciesOffset = 0;

        var q = self.buildParams();
        console.log(q);
        $http(
            {method: 'JSONP',
                url: searchURL + q,
                params: {'json.wrf': 'JSON_CALLBACK'}
            })
            .success(function (response) {
                self.response = response;
                self.searchLock = false;

                // load each GBIF count
                angular.forEach(response.response.docs, function (doc) {
                    $http.get(occurrenceURL + doc.key).success(function (data) {
                        doc.detail = data;
                    });
                });


            }).error(function () {
                console.log('Search failed!');
            });
       self.charts();
       self.species();
    }

    // build the search URL
    self.buildParams = function() {
        var lng = self.filter.longitude.value.split(";");
        var lat = self.filter.latitude.value.split(";");
        var bor = self.filter.basisOfRecord === undefined ? '' : '&fq=basis_of_record:' + self.filter.basisOfRecord;
        var country = self.filter.country === undefined ? '' : '&fq=country:' + self.filter.country;
        var fulltext = self.filter.fulltext === undefined ? '&q=*:*' : '&defType=dismax&qf=full_text&qs=2&q=' + self.filter.fulltext;
        return '&fq=latitude:[' + lat[0] + ' TO '  + lat[1]+ ']'
                + '&fq=longitude:[' + lng[0] + ' TO ' + lng[1]+ ']'
                + country + bor + fulltext;


    }

    // calls SOLR for the information for the charts
    self.charts = function () {
        var q = self.buildParams();
        $http(
            {method: 'JSONP',
                url: chartURL + q,
                params: {'json.wrf': 'JSON_CALLBACK'}
            })
            .success(function (response) {
                self.chartResponse = response;


            }).error(function () {
                console.log('Chart search failed!');
            });

    }

    // calls SOLR for the information for the species
    self.species = function () {
        var q = self.buildParams();

        q = q + "&json.facet=" + encodeURI("{scientific_name:{type:terms,field:scientific_name,limit:15," +
            "sort:{index:asc}, offset:" + speciesOffset + "}}");
        $http(
            {method: 'JSONP',
                url: speciesURL + q,
                params: {'json.wrf': 'JSON_CALLBACK'}
            })
            .success(function (response) {

                console.log(response.facets.scientific_name.buckets);
                self.speciesNames.push.apply(self.speciesNames, response.facets.scientific_name.buckets);

            speciesOffset += response.facets.scientific_name.buckets.length;
            console.log("Species offset set to " + speciesOffset);


            }).error(function () {
                console.log('Chart search failed!');
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
        return source == '' || source === undefined ? "<value missing>" : source.replace("_", " ");
    }



    // call the function to populate the response
    self.search();
}]);
