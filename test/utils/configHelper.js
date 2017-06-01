/**
 * UNIT Tests for utils/configHelper
 */
var assert = require('assert');
var superTest = require('supertest');
var configHelper = require('../../utils/configHelper');
var monk = require('monk');
var path = require('path');
var fs = require('fs');

describe('UTILS configHelper', function() {

    var server = require('../../app');

    // List of all possible permission keys
    var allPermissionKeys = [
        'PERMISSION_ADMINISTRATION_CLIENT', // Mandant erstellen, bearbeiten und löschen
        'PERMISSION_ADMINISTRATION_SETTINGS', // Berechtigung zum Zugriff auf Einstellungsmenü
        'PERMISSION_ADMINISTRATION_USER', // Benutzer erstellen, ändern und löschen
        'PERMISSION_ADMINISTRATION_USERGROUP', // Create edit and delete usergroups and their permissions
        'PERMISSION_BIM_FMOBJECT', // FM-Objekte erstellen, ändern und löschen
        'PERMISSION_LICENSESERVER_PORTAL', // Portale erstellen, ändern und löschen
        'PERMISSION_OFFICE_ACTIVITY', // Termine erstellen, ändern und löschen
        'PERMISSION_OFFICE_DOCUMENT', // Dokumente erstellen, ändern und löschen
        'PERMISSION_SETTINGS_CLIENT', // Einstellungen auf Mandantenebene ändern (Logo im Menü, Module selbst freischalten)
        'PERMISSION_SETTINGS_PORTAL', // Einstellungen auf Portalebene ändern (Logo auf Anmeldebildschirm, Lizenzdaten)
        'PERMISSION_SETTINGS_USER', // Einstellungen auf Benutzerebene ändern (eigenes Passwort oder Benutzername)
    ];
    
    describe('getAvailablePermissionKeysForClient', function() {

        xit('Returns all permission keys of the module config file when clientId is null', function() {
            // Permission keys must not repeat in the result
            // All keys defined in allPermissionKeys here must be included in the module config anywhere
        });

        xit('Returns an empty list when there is no client for the given clientId', function() {
        });

        xit('Returns an empty list when the client has no modules assigned', function() {
        });

        xit('Returns only those permission keys defined for the modules the client has access to', function() {
        });

        xit('Returns only permission keys defined in the module config even when the client has assigned a module which is not defined in module config', function() {
        });

    });
    
    describe('getAvailableModulesForClient', function() {

        xit('Returns all modules defined when the clientId is null', function() {
        });

        xit('Returns an empty list when there is no client for the given clientId', function() {
        });

        xit('Returns an empty list when the client has no modules assigned', function() {
        });

        xit('Returns a list of modules available to the client with the given clientId', function() {
        });

        xit('Returns only modules available in the module config even when the client has assigned a module which is not defined in module config', function() {
            // This can happen after a license change when a previously available module was removed from the portal
        });

    });

});
