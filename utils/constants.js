/**
    'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', // Erstellung von dynamischen Attributen
    'PERMISSION_LICENSESERVER_PORTAL', // Portale erstellen, ändern und löschen
 * List of all possible collections (tables). Used for dependency deletions in clients API
 * and its tests
 */
module.exports.collections = [
    'activities',
    'clientmodules',
    'clients',
    'documents',
    'fmobjects',
    'folders',
    'markers',
    'permissions',
    'portalmodules',
    'portals',
    'relations',
    'settingsets',
    'usergroups',
    'users'
];

/**
 * List of all possible dynamic attribute types. Used for validation in dynamicattributes API.
 */
module.exports.dynamicAttributeTypes = [
    'text',
    'boolean',
    'picklist'
];

/**
 * List of all possible models that can have dynamic attribute. Used for option selection in dynamicattributes API.
 */

module.exports.models = [
    'documents',
    'usergroups',
    'users'
];