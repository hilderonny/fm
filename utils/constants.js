/**
 * List of all possible API names
 * Can be used with:
 * var apis = require('../utils/constants').apis;
 */
module.exports.apis = {
    /**
     * API for edititing portals
     */
    portals: 'portals',
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
    clientmodules:'clientmodules',
    /**
     * Mandanten
     */
    clients:'clients',
    documents:'documents',
    fmobjects:'fmobjects',
    folders:'folders',
    markers:'markers',
    permissions:'permissions',
    /**
     * Modules assigned to portals
     */
    portalmodules:'portalmodules',
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:'portals',
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
 * List of all possible permissions.
 * Can be used with:
 * var permissions = require('../utils/constants').permissions;
 */
module.exports.permissions = {
    ADMINISTRATION_CLIENT: 'PERMISSION_ADMINISTRATION_CLIENT',
    ADMINISTRATION_SETTINGS: 'PERMISSION_ADMINISTRATION_SETTINGS',
    /**
     * Permission to show and edit users
     */
    ADMINISTRATION_USER: 'PERMISSION_ADMINISTRATION_USER',
    ADMINISTRATION_USERGROUP: 'PERMISSION_ADMINISTRATION_USERGROUP',
    BIM_FMOBJECT: 'PERMISSION_BIM_FMOBJECT',
    /**
     * Permission to show and edit portals on the license server
     */
    LICENSESERVER_PORTAL: 'PERMISSION_LICENSESERVER_PORTAL',
    OFFICE_ACTIVITY: 'PERMISSION_OFFICE_ACTIVITY',
    OFFICE_DOCUMENT: 'PERMISSION_OFFICE_DOCUMENT',
    SETTINGS_PORTAL: 'PERMISSION_SETTINGS_PORTAL',
    /**
     * Permission to show and change the settings of the own account
     */
    SETTINGS_USER: 'PERMISSION_SETTINGS_USER'
};
