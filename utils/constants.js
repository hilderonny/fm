/**
 * List of all possible API names
 * Can be used with:
 * var apis = require('../utils/constants').apis;
 */
module.exports.apis = {
    /**
     * API for assigning modules to clients
     */
    clientmodules: 'clientmodules',
    /**
     * API for edititing clients
     */
    clients: 'clients',
    /**
     * API for edititing documents
     */
    documents: 'documents',
    /**
     * API for edititing FM objects
     */
    fmobjects: 'fmobjects',
    /**
     * API for edititing folders
     */
    folders: 'folders',
    /**
     * API for providing permissions to usergroups
     */
    permissions: 'permissions',
    /**
     * API for editing module assignments for portals
     */
    portalmodules: 'portalmodules',
    /**
     * API for edititing portals
     */
    portals: 'portals',
    /**
     * API for editing relations between database entities
     */
    relations: 'relations',
    /**
     * API for retrieving settings and setting sets
     */
    settingsets: 'settingsets',
    /**
     * API for editing usergroups
     */
    usergroups: 'usergroups',
    /**
     * API for editing users
     */
    users: 'users'
};

/**
 * List of all possible collections (tables). Used for dependency deletions in clients API
 * and its tests.
 * Can be used with:
 * var collections = require('../utils/constants').collections;
 */
module.exports.collections = {
    activities:'activities',
    /**
     * Modulzuordnungen für Mandanten
     */
    clientmodules:'clientmodules',
    /**
     * Mandanten
     */
    clients:'clients',
    /**
     * Dokumente
     */
    documents:'documents',
    dynamicattributeoptions:'dynamicattributeoptions',
    dynamicattributes:'dynamicattributes',
    dynamicattributevalues:'dynamicattributevalues',
    /**
     * FM Objekte
     */
    fmobjects:'fmobjects',
    /**
     * Verzeichnisse
     */
    folders:'folders',
    markers:'markers',
    /**
     * Zugriffsberechtigungen für Benutzergruppen
     */
    permissions:'permissions',
    /**
     * Modules assigned to portals
     */
    portalmodules:'portalmodules',
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:'portals',
    /**
     * Relations between database entities
     */
    relations:'relations',
    settingsets:'settingsets',
    /**
     * Usergroups for users
     */
    usergroups:'usergroups',
    /**
     * Users which can login to the system
     */
    users:'users'
};

/**
 * Liste von Modulen, wie sie in der module-config verwendet wird.
 */
module.exports.modules = {
    /**
     * Terminmodul
     */
    activities: 'activities',
    /**
     * Grundmodul, welches in allen Installationen vorhanden ist
     */
    base: 'base'
}

/**
 * List of all possible permissions.
 * Can be used with:
 * var permissions = require('../utils/constants').permissions;
 */
module.exports.permissions = {
    /**
     * Permission to show and edit clients
     */
    ADMINISTRATION_CLIENT: 'PERMISSION_ADMINISTRATION_CLIENT',
    ADMINISTRATION_SETTINGS: 'PERMISSION_ADMINISTRATION_SETTINGS',
    /**
     * Permission to show and edit users
     */
    ADMINISTRATION_USER: 'PERMISSION_ADMINISTRATION_USER',
    ADMINISTRATION_USERGROUP: 'PERMISSION_ADMINISTRATION_USERGROUP',
    /**
     * Permission to show and edit FM objects
     */
    BIM_FMOBJECT: 'PERMISSION_BIM_FMOBJECT',
    /**
     * Permission to show and edit portals on the license server
     */
    LICENSESERVER_PORTAL: 'PERMISSION_LICENSESERVER_PORTAL',
    OFFICE_ACTIVITY: 'PERMISSION_OFFICE_ACTIVITY',
    /**
     * Permission to show and edit documents and folders
     */
    OFFICE_DOCUMENT: 'PERMISSION_OFFICE_DOCUMENT',
    /**
     * Permission to show and change the settings of the own client (Logo, name)
     */
    SETTINGS_CLIENT: 'PERMISSION_SETTINGS_CLIENT',
    /**
     * Permission to show and change the settings of the portal (license key, etc.)
     */
    SETTINGS_PORTAL: 'PERMISSION_SETTINGS_PORTAL',
    /**
     * Permission to show and change the settings of the own account
     */
    SETTINGS_USER: 'PERMISSION_SETTINGS_USER'
};

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
