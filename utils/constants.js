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
     * Geschäftspartner
     */
    businesspartners: 'businesspartners',
    /**
     * API for assigning modules to clients
     */
    clientmodules: 'clientmodules',
    /**
     * API for edititing clients
     */
    clients: 'clients',
    /**
     * API für Mandanteneinstellungen
     */
    clientsettings: 'clientsettings',
    /**
     * API für Kommunikationswege
     */
    communications: 'communications',
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
     * API für Adressen von Geschäftspartnern
     */
    partneraddresses: 'partneraddresses',
    /**
     * API Für Personen
     */
    permissions: 'permissions',
    /**
     * API for providing permissions to persons
     */
    persons: 'persons',
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
     * API for instant search
     */
    search: 'search',
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
    activities:{name:'activities', icon:'Planner', canHaveAttributes:true},
    /**
     * Geschäftspartner
     */
    businesspartners:{name:'businesspartners', icon:'Business', canHaveAttributes:true},
    /**
     * Modulzuordnungen für Mandanten
     */
    clientmodules:{name: 'clientmodules', canHaveAttributes:false},
    /**
     * Einstellungen für Mandanten
     */
    clientsettings:{name: 'clientsettings', canHaveAttributes:false},
    /**
     * Mandanten
     */
    clients:{name:'clients', icon:'Briefcase', canHaveAttributes:true},
    /**
     * Kommunikationswege von Personen
     */
    communications:{name:'communications', icon:'Phone', canHaveAttributes:true},
    /**
     * Dokumente
     */
    documents:{name:'documents', icon: 'Document', canHaveAttributes:true},
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
    fmobjects:{name:'fmobjects', icon:'Cottage', canHaveAttributes:true},
    /**
     * Verzeichnisse
     */
    folders:{name:'folders', icon:'Folder', canHaveAttributes:true},
    markers:{name:'markers', canHaveAttributes:false},
    /**
     * Adressen von Geschäftspartnern
     */
    partneraddresses:{name:'partneraddresses', icon:'Address Book', canHaveAttributes:true},
    /**
     * Zugriffsberechtigungen für Benutzergruppen
     */
    permissions:{name:'permissions', canHaveAttributes:false},
    /**
     * Personen
     */
    persons:{name:'persons', icon:'Collaborator Male', canHaveAttributes:true},
    /**
     * Modules assigned to portals
     */
    portalmodules:{name:'portalmodules', canHaveAttributes:false},
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:{name:'portals', icon: 'Server', canHaveAttributes:true},
    /**
     * Relations between database entities
     */
    relations:{name:'relations', canHaveAttributes:false},
    settingsets:{name:'settingsets', canHaveAttributes:false},
    /**
     * Usergroups for users
     */
    usergroups:{name:'usergroups', icon:'User Group Man Man', canHaveAttributes: true},
    /**
     * Users which can login to the system
     */
    users:{name:'users', icon:'User', canHaveAttributes: true}
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
     * Geschäftspartner-Modul samt Personen
     */
    businesspartners: 'businesspartners',
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
     * Dynamische Verknüpfungen erstellen und ansehen
     */
    CORE_RELATIONS: 'PERMISSION_CORE_RELATIONS',
    /**
     * Geschäftspartner bearbeiten
     */
    CRM_BUSINESSPARTNERS: 'PERMISSION_CRM_BUSINESSPARTNERS',
    /**
     * Personen bearbeiten
     */
    CRM_PERSONS: 'PERMISSION_CRM_PERSONS',
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
 * Auflistung von Einstellungsarten, die bestimmen, in welchem Abschnitt die Einstellungen angezeigt werden
 */
module.exports.settingSetTypes = {
    /**
     * Mandantenebene
     */
    CLIENT: 'SETTINGSET_TYPE_CLIENT',
    /**
     * Portalebene
     */
    PORTAL: 'SETTINGSET_TYPE_PORTAL',
    /**
     * Benutzerebene
     */
    USER: 'SETTINGSET_TYPE_USER'
};

/**
 * Erlaubte Typen von dynamischen Attributen
 */
module.exports.dynamicAttributeTypes = {
    /**
     * Value kann ein beliebiger string sein
     */
    text: 'text',
    /**
     * Value kann true oder false sein
     */
    boolean: 'boolean',
    /**
     * Value kann eine ObjectId auf eine Entität sein
     */
    picklist: 'picklist'
};