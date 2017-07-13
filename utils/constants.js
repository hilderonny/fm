/**
 * List of all possible API names
 * Can be used with:
 * var apis = require('../utils/constants').apis;
 */
module.exports.apis = {
    /**
     * API for managing activities
     */
    activities: 'activities',
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
     * API zum Administrieren von dynamischen Attributen an Datenbankentitäten
     */
    dynamicattributes: 'dynamicattributes',
    /**
     * API for extracting zipped documents
     */
    extractdocument: 'extractdocument',
    /**
     * API for edititing FM objects
     */
    fmobjects: 'fmobjects',
    /**
     * API for edititing folders
     */
    folders: 'folders',
    /**
     * API for logging in users
     */
    login: 'login',
    /**
     * API for managing geographical map markers
     */
    markers: 'markers',
    /**
     * API für retrieving menu structure
     */
    menu: 'menu',
    /**
     * API for providing permissions to usergroups
     */
    permissions: 'permissions',
    /**
     * API for handling local portal settings like license key or checking for available updates
     */
    portalmanagement: 'portalmanagement',
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
     * API for retrieving translations for several languages
     */
    translations: 'translations',
    /**
     * API für fm.avorium.de zum automatischen Aktualisieren der Installation aus TeamCity heraus nach erfolgreichem Bau
     */
    triggerUpdate: 'triggerUpdate',
    /**
     * License server API for providing update packages to portals
     */
    update: 'update',
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
    activities:{name:'activities', icon:'X.png', canHaveAttributes:true},
    /**
     * Modulzuordnungen für Mandanten
     */
    clientmodules:{name: 'clientmodules', canHaveAttributes:false},
    /**
     * Mandanten
     */
    clients:{name:'clients', canHaveAttributes:false},
    /**
     * Dokumente
     */
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
    /**
     * FM Objekte
     */
    fmobjects:{name:'fmobjects', icon:'X.png', canHaveAttributes:true},
    /**
     * Verzeichnisse
     */
    folders:{name:'folders',icon:'X.png', canHaveAttributes:true},
    markers:{name:'markers', canHaveAttributes:false},
    /**
     * Zugriffsberechtigungen für Benutzergruppen
     */
    permissions:{name:'permissions', canHaveAttributes:false},
    /**
     * Modules assigned to portals
     */
    portalmodules:{name:'portalmodules', canHaveAttributes:false},
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:{name:'portals', canHaveAttributes:false},
    /**
     * Relations between database entities
     */
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
    base: 'base',
    /**
     * Modul für Mandantenverwaltung
     */
    clients: 'clients',
    /**
     * Modul für Dokumenten- und Verzeichnisverwaltung
     */
    documents: 'documents',
    /**
     * Modul für FM-Objekt-Verwaltung
     */
    fmobjects: 'fmobjects',
    /**
     * Modul für Lizenzserverfunktionen wie Portalverwaltung und Update-API
     */
    licenseserver: 'licenseserver',
    /**
     * Modul zur Verwaltung des eigenen Portals. Stellt Einstellungsseiten für Lizenzschlüssel und Updates bereit
     */
    portalbase: 'portalbase',
    /**
     * Spielereien
     */
    ronnyseins: 'ronnyseins'
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
     * Permission to view and edit dynamic attribute definitions and picklist options
     */
    SETTINGS_CLIENT_DYNAMICATTRIBUTES: 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', // Erstellung von dynamischen Attributen
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
