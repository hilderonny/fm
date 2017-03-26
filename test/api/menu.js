/**
 * UNIT Tests for api/menu
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694

describe('API menu', function() {

    var server = require('../../app');
    
    var extractMenu = () => { // The same functionality as in API
        var fullMenuObject = {};
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            var appModule = moduleConfig.modules[moduleName];
            if (!appModule.menu) return;
            appModule.menu.forEach((menu) => {
                if (!fullMenuObject[menu.title]) {
                    fullMenuObject[menu.title] = JSON.parse(JSON.stringify(menu)); // Make copy instead of reference
                } else {
                    Array.prototype.push.apply(fullMenuObject[menu.title].items, menu.items);
                }
            });
        });
        var fullMenuArray = Object.keys(fullMenuObject).map((key) => fullMenuObject[key]);
        return fullMenuArray;
    };

    var compareMenuStructures = (menuFromApi, menuFromConfig) => {
        assert.strictEqual(menuFromApi.length, menuFromConfig.length, `Number of main menu entries differ (${menuFromApi.length} from API, ${menuFromConfig.length} in configuration)`);
        // The structure mus be exactly the same, so simply iterate over it
        for (var i = 0; i < menuFromConfig.length; i++) {
            var mainMenuFromApi = menuFromApi[i];
            var mainMenuFromConfig = menuFromConfig[i];
            assert.strictEqual(mainMenuFromApi.title, mainMenuFromConfig.title, `Title of main menu #${i} differ (${mainMenuFromApi.title} from API, ${mainMenuFromConfig.title} in configuration)`);
            assert.strictEqual(mainMenuFromApi.items.length, mainMenuFromConfig.items.length, `Number of sub menu entries of main menu #${i} differ (${mainMenuFromApi.items.length} from API, ${mainMenuFromConfig.items.length} in configuration)`);
            for (var j = 0; j < mainMenuFromConfig.items.length; j++) {
                var subMenuFromApi = mainMenuFromApi.items[j];
                var subMenuFromConfig = mainMenuFromConfig.items[j];
                assert.strictEqual(subMenuFromApi.mainCard, subMenuFromConfig.mainCard, `Main card of sub menu #${j} differ (${subMenuFromApi.mainCard} from API, ${subMenuFromConfig.mainCard} in configuration)`);
                assert.strictEqual(subMenuFromApi.icon, subMenuFromConfig.icon, `Title of sub menu #${j} differ (${subMenuFromApi.icon} from API, ${subMenuFromConfig.icon} in configuration)`);
                assert.strictEqual(subMenuFromApi.title, subMenuFromConfig.title, `Title of sub menu #${j} differ (${subMenuFromApi.title} from API, ${subMenuFromConfig.title} in configuration)`);
            }
        }
    };

    // Clear and prepare database with clients, user groups, users and client modules
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers);
    });

    it('responds to GET/ without authentication with 403', function() {
        return superTest(server).get('/api/menu').expect(403);
    });

    it('responds to GET/ with portal admin user logged in with all menu items', function(done) {
        testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
            superTest(server).get(`/api/menu?token=${token}`).expect(200).end(function(err, res) {
                var menuStructureFromApi = res.body;
                var fullMenu = extractMenu();
                compareMenuStructures(menuStructureFromApi, fullMenu);
                done();
            });
        });
    });

    xit('responds to GET/ with normal portal user logged in with all menu items the user has permissions to', function(done) {
    });


    it('responds to GET/ with client admin user logged in with all menu items available to the users client', function(done) {
        testHelpers.doLoginAndGetToken('0_0_ADMIN0', 'test').then((token) => { // X_Y_ADMINZ is always an admin
            superTest(server).get(`/api/menu?token=${token}`).expect(200).end(function(err, res) {
                var menuStructureFromApi = res.body;
                // Module "ronnyseins" must not be in here, because it is never available to any client.
                var userMenu = [
                    {
                        title: 'MENU_ADMINISTRATION',
                        items: [
                            { mainCard: 'Administration/SettingSetListCard', icon: 'Settings', title: 'MENU_ADMINISTRATION_SETTINGS' },
                            { mainCard: 'Administration/UserlistCard', icon: 'User', title: 'MENU_ADMINISTRATION_USERS' },
                            { mainCard: 'Administration/UsergrouplistCard', icon: 'User Group Man Man', title: 'MENU_ADMINISTRATION_USERGROUPS' }
                        ]
                    },
                    {
                        title: 'MENU_OFFICE',
                        items: [
                            { mainCard: 'Office/CalendarCard', icon: 'Planner', title: 'MENU_OFFICE_ACTIVITIES'},
                            { mainCard: 'Office/FolderCard', icon: 'Document', title: 'MENU_OFFICE_DOCUMENTS'}
                        ]
                    },
                    {
                        title: 'MENU_BIM',
                        items: [
                            { mainCard: 'BIM/HierarchyCard', icon: 'Cottage', title: 'MENU_BIM_FMOBJECTS'}
                        ]
                    },
                    {
                        title: 'MENU_LICENSESERVER',
                        items: [
                            { mainCard: 'LicenseServer/PortalListCard', icon: 'Server', title: 'MENU_LICENSESERVER_PORTALS'}
                        ]
                    }
                ];
                compareMenuStructures(menuStructureFromApi, userMenu);
                done();
            });
        });
    });

    xit('responds to GET/ with normal client user logged in with all menu items the user has permissions to and which are available to the client', function(done) {
    });


    it('responds to POST with 404', function() {
        return superTest(server).post('/api/menu').expect(404);
    });

    it('responds to PUT with 404', function() {
        return superTest(server).put('/api/menu').expect(404);
    });

    it('responds to DELETE with 404', function() {
        return superTest(server).del('/api/menu').expect(404);
    });

});
