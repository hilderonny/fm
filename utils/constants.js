/**
 * List of all possible API names
 * Can be used with:
 * var apis = require('../utils/constants').apis;
 */
module.exports.apis = {
    /**
     * API for showing areas
     */
    areas: 'areas',
    /**
     * API for assigning modules to clients
     */
    clientmodules: 'clientmodules',
    /**
     * API for edititing clients
     */
    clients: 'clients',
    
     /**
     * API for importing csv documents 
     */
    csvimport: 'csvimport',
    /**
    
    /**
     * API zur Abfrage von Datentypen
     */
    datatypes: "datatypes",
    /**
     * API für Dokumentation
     */
    doc: 'doc',
    /**
     * API for edititing documents
     */
    documents: 'documents',
    /**
     * Dynamic objects
     */
    dynamic: "dynamic",
    /**
     * API zum Administrieren von dynamischen Attributen an Datenbankentitäten
     */
    dynamicattributes: 'dynamicattributes',
    /**
     * API for extracting zipped documents
     */
    extractdocument: 'extractdocument',
    /**
     * API for GraphQL access
     */
    graphql: 'graphql',
    /**
     * API for logging in users
     */
    login: 'login',
    /**
     * API für retrieving menu structure
     */
    menu: 'menu',
    /**
     * API Für Personen
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
    recordtypes: "recordtypes",
    /**
     * API for editing relations between database entities
     */
    relations: 'relations',
    /**
     * API for instant search
     */
    search: 'search',
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
     * API for editing users
     */
    users: 'users'
};

/**
 * Eralubte Formelarten
 */
module.exports.formulatypes = {
    childsum: "childsum",
    concat: "concat",
    ifthenelse: "ifthenelse",
    sum: "sum",
}

/**
 * List of all possible collections (tables). Used for dependency deletions in clients API
 * and its tests.
 * Can be used with:
 * var collections = require('../utils/constants').collections;
 */
module.exports.collections = {
    activities:{name:'activities', icon:'/css/icons/material/Planner.svg', canHaveAttributes:true},
    apps: {name:'apps'},
    /**
     * Geschäftspartner
     */
    businesspartners:{name:'businesspartners', icon:'/css/icons/material/Business.svg', canHaveAttributes:true},
    /**
     * Modulzuordnungen für Mandanten
     */
    clientmodules:{name: 'clientmodules', canHaveAttributes:false},
    
    /**
     * Mandanten
     */
    clients:{name:'clients', icon:'/css/icons/material/Briefcase.svg', canHaveAttributes:true},
    /**
     * Dokumente
     */
    documents:{name:'documents', icon: '/css/icons/material/Document.svg', canHaveAttributes:true},
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
    //fmobjects:{name:'fmobjects', icon:'Cottage', canHaveAttributes:true},
    projects:{name:'projects', icon:'/css/icons/fm/FMOBJECTS_TYPE_PROJECT.svg', canHaveAttributes:true},
    properties:{name:'properties', icon:'/css/icons/fm/FMOBJECTS_TYPE_PROPERTY.svg', canHaveAttributes:true},
    buildings:{name:'buildings', icon:'/css/icons/fm/FMOBJECTS_TYPE_BUILDING.svg', canHaveAttributes:true},
    levels:{name:'levels', icon:'/css/icons/fm/FMOBJECTS_TYPE_LEVEL.svg', canHaveAttributes:true},
    rooms:{name:'rooms', icon:'/css/icons/fm/FMOBJECTS_TYPE_ROOM.svg', canHaveAttributes:true},
    areas:{name:'areas', icon:'/css/icons/fm/FMOBJECTS_TYPE_AREA.svg', canHaveAttributes:true},
    inventories:{name:'inventories', icon:'/css/icons/fm/FMOBJECTS_TYPE_INVENTORY.svg', canHaveAttributes:true},
    /**
     * Verzeichnisse
     */
    folders:{name:'folders', icon:'/css/icons/material/Folder.svg', canHaveAttributes:true},
    markers:{name:'markers', canHaveAttributes:false},
     
    /**
     * Notizen
     */
    notes:{name:'notes', icon:'/css/icons/material/Notes.svg', canHaveAttributes:true},
    /**
     * Adressen von Geschäftspartnern
     */
    partneraddresses:{name:'partneraddresses', icon:'/css/icons/material/Address Book.svg', canHaveAttributes:true},
    /**
     * Zugriffsberechtigungen für Benutzergruppen
     */
    permissions:{name:'permissions', canHaveAttributes:false},
    /**
     * Personen
     */
    persons:{name:'persons', icon:'/css/icons/material/Collaborator Male.svg', canHaveAttributes:true},
    /**
     * Modules assigned to portals
     */
    portalmodules:{name:'portalmodules', canHaveAttributes:false},
    /**
     * List of all portals registered to the license server. Only relevant on license server.
     */
    portals:{name:'portals', icon: '/css/icons/material/Server.svg', canHaveAttributes:true},
    /**
     * Relations between database entities
     */
    relations:{name:'relations', canHaveAttributes:false},
    /**
     * Usergroups for users
     */
    usergroups:{name:'usergroups', icon:'/css/icons/material/User Group Man Man.svg', canHaveAttributes: true},
    /**
     * Users which can login to the system
     */
    users:{name:'users', icon:'/css/icons/material/User.svg', canHaveAttributes: true},
    views:{name:'views'}
};

module.exports.fieldtypes = {
    boolean: "boolean",
    datetime: "datetime",
    decimal: "decimal",
    formula: "formula",
    password: "password",
    reference: "reference",
    text: "text"
};

/**
 * Mögliche Aufführung von dynamischen Objekten in diversen Listen. In den record types wird
 * im Feld "lists" vermerkt, in welchen Listen oder Hierarchien der record type auftaucht.
 * So enthalten die record types "folders" und "documents" beispielsweise eine Referenz auf die
 * Liste "folders", wodurch der FolderCardController und seine API wissen, welche datentypen sie
 * anzeigen sollen. Gleiches gilt für "projects", "areas", ... bei der Liste "fmobjects"
 */
module.exports.lists = {
    /**
     * Record types mit dieser Einstellung tauchen in der Hierarchie der FM OBjekte auf
     */
    fmobjects: "fmobjects",
    /**
     * Aufführung in der Verzeichnisstruktur des Dokumentenmoduls
     */
    folders: "folders"
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
     * Flächen
     */
    areas: 'areas',
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
     * Modul für Content Management (Apps, Views, Cards)
     */
    cms: "cms",
    /**
     * Online Dokumentation
     */
    doc: 'doc',
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
     * Modul für Notizen
     */
    notes: 'notes',
    // Administration dynamischer Objekte
    recordtypes: "recordtypes",
    /**
     * Modul zur Verwaltung des eigenen Portals. Stellt Einstellungsseiten für Lizenzschlüssel und Updates bereit
     */
    portalbase: 'portalbase',
    /**
     * QR Scanner
     */
    qrscanner: "qrscanner",
    /**
     * Spielereien
     */
    ronnyseins: 'ronnyseins',
    /**
     * Modul für WebDAV
     */
    webdav: 'webdav'
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
    /**
     * Permission to show and edit users
     */
    ADMINISTRATION_USER: 'PERMISSION_ADMINISTRATION_USER',
    ADMINISTRATION_USERGROUP: 'PERMISSION_ADMINISTRATION_USERGROUP',
    /**
     * Permission to analyze FM object area analyzes
     */
    BIM_AREAS: 'PERMISSION_BIM_AREAS',
    /**
     * Permission to show and edit FM objects
     */
    BIM_FMOBJECT: 'PERMISSION_BIM_FMOBJECT',
    /**
     * Sichteneditor
     */
    CMS_APPS: 'PERMISSION_CMS_APPS',
    /**
     * Karteneditor
     */
    CMS_CARDS: 'PERMISSION_CMS_CARDS',
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
     * Permission to show and edit notes
     */
    OFFICE_NOTE: 'PERMISSION_OFFICE_NOTE',
    /**
     * Persmission to access the QR scanner menu
     */
    QRSCANNER: "PERMISSION_QRSCANNER",
    /**
     * Permission to view and edit dynamic attribute definitions and picklist options
     */
    SETTINGS_CLIENT_DYNAMICATTRIBUTES: 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', // Erstellung von dynamischen Attributen
    /**
     * Permission to view and edit dynamic objects (recordtypes)
     */
    SETTINGS_CLIENT_RECORDTYPES: 'PERMISSION_SETTINGS_CLIENT_RECORDTYPES', // Erstellung von dynamischen Objekten
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

// Names which are used by API routes and therefor are not allowed as datatypenames
module.exports.forbiddendatatypenames = [
    "field",
    "children",
    "hierarchytoelement",
    "parentpath",
    "rootelements"
];