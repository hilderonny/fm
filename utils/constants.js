/**
 * List of all possible API names
 * Can be used with:
 * var apis = require('../utils/constants').apis;
 */
module.exports.apis = {
    /**
     * API zum Administrieren von dynamischen Attributen an Datenbankentitäten
     */
    dynamicattributes: 'dynamicattributes',
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
    activities:{name:'activities', icon:'X.png', canHaveAttributes:true},
    clientmodules:{name: 'clientmodules', canHaveAttributes:false},
    /**
     * Mandanten
     */
    clients:{name:'clients', canHaveAttributes:false},
    documents:{name:'documents',canHaveAttributes:false},
    /**
     * Mögliche Werte für dynamische Attribute vom Typ picklist
     */
    dynamicattributeoptions:{name:'dynamicattributeoptions', canHaveAttributes:false},
    /**
     * Definitionen von dynamischen Attributen an Entitäten
     */
    dynamicattributes:{name:'dynamicattributes', canHaveAttributes:false},
    dynamicattributevalues:{name:'dynamicattributevalues', canHaveAttributes:false},
    fmobjects:{name:'fmobjects', icon:'X.png', canHaveAttributes:true},
    folders:{name:'folders',icon:'X.png', canHaveAttributes:true},
    markers:{name:'markers', canHaveAttributes:false},
    permissions:{name:'permissions', canHaveAttributes:false},
    portalmodules:{name:'portalmodules', canHaveAttributes:false},
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:{name:'portals', canHaveAttributes:false},
    relations:{name:'relations', canHaveAttributes:false},
    settingsets:{name:'settingsets', canHaveAttributes:false},
    /**
     * Usergroups for users
     */
    usergroups:{name:'usergroups', icon:'X.png', canHaveAttributes: true},
    /**
     * Users which can login to the system
     */
    users:{name:'users', icon:'X.png', canHaveAttributes: true}
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
     * Permission to view and edit dynamic attribute definitions and picklist options
     */
    ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES: 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', // Erstellung von dynamischen Attributen
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

/**
 * List of all possible dynamic attribute types. Used for validation in dynamicattributes API.
 */
module.exports.dynamicAttributeTypes = {
    text: 'DYNAMICATTRIBUTES_TYPE_TEXT',
    boolean: 'DYNAMICATTRIBUTES_TYPE_BOOLEAN',
    picklist: 'DYNAMICATTRIBUTES_TYPE_PICKLIST'
};

/**
 * List of all possible models that can have dynamic attribute. Used for option selection in dynamicattributes API.
 */

module.exports.models = [
    'folders',
    'usergroups',
    'users'
];
