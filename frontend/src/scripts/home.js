'use strict';

angular.module('warehaus.home', ['warehaus.ui_helpers']);

angular.module('warehaus.home').config(function(urlRegisterProvider, viewPath) {
    urlRegisterProvider.$get()({
        name: 'home',
        url: '/home',
        views: {
            '': {
                templateUrl: viewPath('home/index.html'),
                controller: 'HomeController'
            },
            'top-navigation': {
            }
        },
        resolve: {
            $title: function() {
                return 'Home';
            }
        }
    });
});

angular.module('warehaus.home').controller('HomeController', function($scope) {
});
